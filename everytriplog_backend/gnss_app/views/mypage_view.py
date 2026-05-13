### 마이페이지 라우팅

import re
from flask import Blueprint, render_template, request, g, flash, redirect, url_for, session, jsonify, abort
from gnss_app.models.user import db, User
from gnss_app.models.inquiry import Inquiry
from gnss_app.views.auth_view import login_required

bp = Blueprint('mypage', __name__, url_prefix='/mypage')

# 전화번호 포맷 함수
def format_phone_number(phone_input):
    if not phone_input:
        return None
    numbers_only = re.sub(r'[^0-9]', '', phone_input)
    if len(numbers_only) == 11:
        return f"{numbers_only[:3]}-{numbers_only[3:7]}-{numbers_only[7:]}"
    elif len(numbers_only) == 10:
        return f"{numbers_only[:3]}-{numbers_only[3:6]}-{numbers_only[6:]}"
    return numbers_only

@bp.route('/', methods=['GET'])
@login_required
def index():
    # 내 문의 내역 가져오기
    my_inquiries = Inquiry.query.filter_by(user_id=g.user.id).order_by(Inquiry.created_at.desc()).all()
    return render_template('auth/mypage.html', inquiries=my_inquiries)


# 정보 수정 전 비밀번호로 유저 검증 (소셜 로그인은 소셜 재인증)
@bp.route('/confirm', methods=['GET', 'POST'])
@login_required
def confirm_user():
    if g.user.provider != 'local':
        session['profile_auth'] = True
        return redirect(url_for('mypage.edit_profile'))

    if request.method == 'POST':
        password = request.form.get("password")
        if g.user.check_password(password):
            session['profile_auth'] = True
            return redirect(url_for('mypage.edit_profile'))
        flash("비밀번호가 일치하지 않습니다!")

    return render_template('auth/confirm_user.html') # 비밀번호 입력 화면


# 회원 정보 수정 (닉네임, 이메일, 전화번호)
@bp.route('/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    # 보안 검증: '비밀번호 확인' 단계를 거치지 않고 주소창으로 들어올 경우 대비
    if g.user.provider == 'local' and not session.get('profile_auth'):
        flash("보안을 위해 비밀번호를 다시 확인해주세요.")
        return redirect(url_for('mypage.confirm_user'))

    user = User.query.get(g.user.id)

    if request.method == 'POST':
        data = request.form
        new_nickname = data.get("nickname")
        new_email = data.get("email")
        raw_phone = data.get("phone_number")
        new_phone = format_phone_number(raw_phone)

        # 본인 인증 세션 체크 (이메일/전화번호 변경 시)
        if (new_email and new_email != user.email) or (new_phone and new_phone != user.phone_number):
            if not session.get('is_verified'):
                flash("정보 변경을 위해 먼저 본인 인증을 해주세요!")
                return render_template('auth/edit_profile.html', user=user)

            if (new_email and new_email != session.get('verified_target')) and (new_phone and new_phone != session.get('verified_target')):
                flash("인증받은 정보와 수정하려는 정보가 다릅니다!")
                return render_template('auth/edit_profile.html', user=user)

        # 닉네임 중복 체크 (본인 닉네임이 아닐 때만)
        if new_nickname and new_nickname != user.nickname:
            if User.query.filter_by(nickname=new_nickname).first():
                flash("이미 존재하는 닉네임입니다!")
                return render_template('auth/edit_profile.html', user=user)
            user.nickname = new_nickname

        # 실제 DB 값 변경
        if new_email and new_email != user.email:
            user.email = new_email
        if new_phone and new_phone != user.phone_number:
            user.phone_number = new_phone

        db.session.commit()

        # 수정 완료 후 인증 세션들 파기
        session.pop('is_verified', None)
        session.pop('verified_target', None)
        session.pop('profile_auth', None) # 재검증 세션도 함께 파기

        flash("회원 정보가 성공적으로 수정되었습니다!")
        return redirect(url_for('mypage.index'))

    return render_template('auth/edit_profile.html', user=user)


# 비밀번호 변경 로직
@bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    # 소셜 유저는 DB에 비밀번호가 없으므로 변경 불가
    if g.user.provider != 'local':
        flash("소셜 로그인 유저는 변경이 불가능합니다!")
        return redirect(url_for('mypage.index'))

    if request.method == 'POST':
        current_pw = request.form.get("current_password")
        new_pw = request.form.get("new_password")
        new_pw_confirm = request.form.get("new_password_confirm")

        # 서버단 최종 일치 확인
        if new_pw != new_pw_confirm:
            flash("새 비밀번호가 일치하지 않습니다.")
            return render_template('auth/change_password.html')

        # 현재 비밀번호 검증 및 변경
        if g.user.check_password(current_pw):
            g.user.set_password(new_pw)
            db.session.commit()

            # 바로 로그아웃하지 않고 성공 안내 페이지로 리다이렉트
            # 세션은 아직 유지된 상태
            return render_template('auth/password_success.html')

        flash("현재 비밀번호가 일치하지 않습니다.")

    return render_template('auth/change_password.html')


@bp.route('/inquiry/create', methods=['POST'])
@login_required
def create_inquiry():
    title = request.form.get('title')
    content = request.form.get('content')

    new_inquiry = Inquiry(user_id=g.user.id, title=title, content=content)
    db.session.add(new_inquiry)
    db.session.commit()

    flash("1:1 문의가 등록되었습니다. 관리자 확인 후 답변 드리겠습니다!")
    return redirect(url_for('mypage.index'))


# 문의 상세 보기
@bp.route('/inquiry/<int:inquiry_id>')
@login_required
def inquiry_detail(inquiry_id):
    inquiry = Inquiry.query.get_or_404(inquiry_id)
    # 본인 글만 보기 (관리자는 예외)
    if inquiry.user_id != g.user.id and g.user.role != 'admin':
        abort(403)
    return render_template('auth/inquiry_detail.html', inquiry=inquiry)

### 마이페이지 라우팅

import re
from flask import Blueprint, render_template, request, g, flash, redirect, url_for, session, jsonify
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

@bp.route('/edit', methods=['POST'])
@login_required
def edit_profile():
    # 웹 폼 방식 데이터 가져오기
    data = request.form
    user = User.query.get(g.user.id)

    # 보안 검증: 비밀번호를 한 번 더 확인하여 본인 인증
    current_password = data.get("current_password")
    if not current_password or not user.check_password(current_password):
        flash("현재 비밀번호가 일치하지 않습니다!")
        return redirect(url_for('mypage.index'))

    new_nickname = data.get("nickname")
    new_email = data.get("email")
    raw_phone = data.get("phone_number")
    new_phone = format_phone_number(raw_phone)
    new_password = data.get("password")

    # 이메일이나 전화번호를 바꿀 때만 작동하는 인증 세션
    if (new_email and new_email != user.email) or (new_phone and new_phone != user.phone_number):
        # verify-code에서 통과한 값 확인
        if not session.get('is_verified'):
            flash("이메일/전화번호 변경을 위해 먼저 본인 인증을 해주세요!")
            return redirect(url_for('mypage.index'))

        # 바꿀 값과 인증받은 값이 일치하는지도 확인
        if (new_email and new_email != session.get('verified_target')) and (new_phone and new_phone != session.get('verified_target')):
             flash("인증받은 정보와 수정하려는 정보가 다릅니다!")
             return redirect(url_for('mypage.index'))

    # 실제 DB 값 변경 로직
    if new_email and new_email != user.email:
        user.email = new_email
    if new_phone and new_phone != user.phone_number:
        user.phone_number = new_phone
    if new_nickname and new_nickname != user.nickname:
        # 닉네임 중복 체크
        if User.query.filter_by(nickname=new_nickname).first():
            flash("이미 존재하는 닉네임입니다!")
            return redirect(url_for('mypage.index'))
        user.nickname = new_nickname

    # 비밀번호 변경 시 암호화 및 기존 세션 만료 처리 (자동 로그아웃 유도)
    if new_password:
        user.set_password(new_password)
        db.session.commit()
        session.clear()
        flash("비밀번호가 변경되어 다시 로그인이 필요합니다!")
        return redirect(url_for('auth.login'))

    # 저장 및 인증 세션 파기 (재사용 방지)
    db.session.commit()
    session.pop('is_verified', None)
    session.pop('verified_target', None)

    flash("회원 정보가 성공적으로 수정되었습니다!")
    return redirect(url_for('mypage.index'))

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

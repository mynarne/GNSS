### 마이페이지 라우팅

# gnss_app/views/mypage_view.py
from flask import Blueprint, render_template, request, g, flash, redirect, url_for
from gnss_app.models.user import db, User
from gnss_app.models.inquiry import Inquiry
from gnss_app.views.auth_view import login_required

bp = Blueprint('mypage', __name__, url_prefix='/mypage')

@bp.route('/', methods=['GET'])
@login_required
def index():
    # 내 문의 내역 가져오기
    my_inquiries = Inquiry.query.filter_by(user_id=g.user.id).order_by(Inquiry.created_at.desc()).all()
    return render_template('personal/mypage.html', inquiries=my_inquiries)

@bp.route('/edit', methods=['POST'])
@login_required
def edit_profile():
    new_username = request.form.get('username')
    new_phone = request.form.get('phone_number')

    user = User.query.get(g.user.id)
    if new_username:
        user.username = new_username
    if new_phone:
        user.phone_number = new_phone

    db.session.commit()
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

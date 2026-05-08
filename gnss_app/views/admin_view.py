### 관리자 페이지 라우터

from flask import Blueprint, render_template, request, redirect, url_for, flash

from gnss_app.models.user import db, User
from gnss_app.models.travel import Group, GroupMember
from gnss_app.models.trajectory import Trajectory
from gnss_app.models.visit_log import VisitLog
from gnss_app.models.inquiry import Inquiry

from gnss_app.views.auth_view import login_required, admin_required

from datetime import datetime, timezone, timedelta

bp = Blueprint("admin", __name__, url_prefix="/admin")

@bp.route("/")
@login_required
@admin_required
def dashboard():
    # 주요 데이터 조회
    users = User.query.all()
    groups = Group.query.all()
    trajectories = Trajectory.query.order_by(Trajectory.recorded_at.desc()).limit(20).all()
    visit_logs = VisitLog.query.order_by(VisitLog.visited_at.desc()).limit(20).all()

    # 미처리 1:1 문의 조회 (관리자용)
    unanswered_inquiries = Inquiry.query.filter_by(is_answered=False).all()

    # 통계 데이터 계산
    user_count = len(users)
    group_count = len(groups)

    return render_template(
        "admin/admin.html",
        user_count=user_count,
        group_count=group_count,
        groups=groups,
        trajectories=trajectories,
        visit_logs=visit_logs,
        inquiries=unanswered_inquiries,
        users=users
    )


@bp.route("/group/<int:group_id>")
@login_required
@admin_required
def group_detail(group_id):
    # 클릭한 방(그룹) 정보 조회
    group = Group.query.get_or_404(group_id)
    # 해당 방에 속한 멤버(유저) 정보 조회
    members = GroupMember.query.filter_by(group_id=group_id).all()

    # 닉네임과 유저 ID를 쉽게 볼 수 있도록 리스트 전달
    member_list = []
    for m in members:
        user = User.query.get(m.user_id)
        member_list.append({
            "user_id": m.user_id,
            "username": user.username if user else "알 수 없음",
            "room_nickname": m.room_nickname
        })

    return render_template(
        "admin/group_detail.html",
        group=group,
        members=member_list
    )


# 유저 목록 보기
@bp.route("/users-list")
@login_required
@admin_required
def user_list():
    users = User.query.all()
    return render_template("admin/user_list.html", users=users)


# 문의 리스트 보기
@bp.route("/inquiries-list")
@login_required
@admin_required
def inquiry_list():
    inquiries = Inquiry.query.order_by(Inquiry.created_at.desc()).all()
    return render_template("admin/inquiry_list.html", inquiries=inquiries)

# 답변 등록 페이지
@bp.route("/inquiry/<int:inquiry_id>/answer", methods=["GET", "POST"])
@login_required
@admin_required
def inquiry_answer(inquiry_id):
    inquiry = Inquiry.query.get_or_404(inquiry_id)
    if request.method == "POST":
        answer_content = request.form.get("answer")
        inquiry.answer = answer_content
        inquiry.is_answered = True
        inquiry.answered_at = datetime.utcnow()
        db.session.commit()
        flash("답변이 성공적으로 등록되었습니다.")
        return redirect(url_for('admin.inquiry_list'))

    return render_template("admin/inquiry_answer.html", inquiry=inquiry)

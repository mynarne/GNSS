### 관리자 페이지 라우터

from flask import Blueprint, render_template

from gnss_app.models.user import User
from gnss_app.models.travel import Group, GroupMember
from gnss_app.models.trajectory import Trajectory
from gnss_app.models.visit_log import VisitLog

from gnss_app.views.auth_view import login_required, admin_required

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

    # 통계 데이터 계산
    user_count = len(users)
    group_count = len(groups)

    return render_template(
        "admin/admin.html",
        user_count=user_count,
        group_count=group_count,
        groups=groups,
        trajectories=trajectories,
        visit_logs=visit_logs
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

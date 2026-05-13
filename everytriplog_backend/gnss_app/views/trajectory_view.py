### 유저 이동 경로 기록

from flask import Blueprint, request, jsonify, g
from gnss_app.models.user import db
from gnss_app.models.trajectory import Trajectory
from gnss_app.models.travel import GroupMember
from gnss_app.views.auth_view import login_required

bp = Blueprint("trajectory", __name__, url_prefix="/trajectory")

@bp.route("/record", methods=["POST"])
@login_required
def record_trajectory():
    user = g.user
    data = request.get_json()

    group_id = data.get("group_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if latitude is None or longitude is None:
        return jsonify({"status": "error", "message": "위도와 경도 좌표값이 누락되었습니다!"}), 400

    # 그룹 ID가 넘어온 경우 해당 그룹에 가입된 멤버인지 검증
    if group_id:
        membership = GroupMember.query.filter_by(user_id=user.id, group_id=group_id).first()
        if not membership:
            return jsonify({"status": "error", "message": "해당 방에 가입되어 있지 않습니다!"}), 403

    new_trajectory = Trajectory(
        user_id=user.id,
        group_id=group_id,
        latitude=latitude,
        longitude=longitude
    )

    db.session.add(new_trajectory)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "경로가 성공적으로 기록되었습니다!",
        "trajectory_id": new_trajectory.id
    })

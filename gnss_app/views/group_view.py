### 초대 코드 입력 후 방에 접속 시, 해당 방에서 사용할 닉네임 받는 로직


from flask import Blueprint, request, jsonify, g
from gnss_app.models.user import db
from gnss_app.models.travel import Group, GroupMember
from gnss_app.views.auth_view import login_required

bp = Blueprint("group", __name__, url_prefix="/group")

# 초대 코드로 방에 입장하고 닉네임을 설정하는 API
@bp.route("/join", methods=["POST"])
@login_required
def join_group():
    data = request.get_json()
    invite_code = data.get("invite_code")
    room_nickname = data.get("room_nickname")

    # 초대 코드로 방 찾기
    group = Group.query.filter_by(invite_code=invite_code).first()
    if not group:
        return jsonify({"status": "error", "message": "존재하지 않는 방입니다!"}), 404

    # 이미 방에 들어와 있는지 확인
    existing_member = GroupMember.query.filter_by(user_id=g.user.id, group_id=group.id).first()
    if existing_member:
        return jsonify({"status": "error", "message": "이미 해당 방에 접속 중입니다!"}), 400

    # 닉네임 중복 검사 (같은 방 안에서만)
    nickname_taken = GroupMember.query.filter_by(group_id=group.id, room_nickname=room_nickname).first()
    if nickname_taken:
        return jsonify({"status": "error", "message": "이미 사용 중인 닉네임입니다!"}), 400

    # 방 입장 처리 (GroupMember 기록 생성)
    new_member = GroupMember(user_id=g.user.id, group_id=group.id, room_nickname=room_nickname)
    db.session.add(new_member)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"'{group.name}' 방에 '{room_nickname}'(으)로 입장 성공!"
    })

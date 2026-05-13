### 초대 코드 입력 후 방에 접속 시, 해당 방에서 사용할 닉네임 받는 로직


import json

from flask import Blueprint, request, jsonify, g
import random
import string
from gnss_app.models.user import db
from gnss_app.models.travel import Group, GroupMember
from gnss_app.views.auth_view import login_required

bp = Blueprint("group", __name__, url_prefix="/group")

# 초대 코드 랜덤 생성기 (알파벳 대문자 + 숫자 구성)
def generate_invite_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


# 방 생성 로직
@bp.route("/create", methods=["POST"])
@login_required
def create_group():
    data = request.get_json()
    name = data.get("name")
    group_type = data.get("group_type")

    # 인원 수 제한 default: 10명
    max_members = data.get("max_members", 10)

    # 초대 코드 입력이 없으면 자동 생성
    invite_code = data.get("invite_code")

    if not invite_code:
        invite_code = generate_invite_code()

    if not name or not group_type:
        return jsonify({
            "status": "error",
            "message": "방 이름과 그룹 종류를 입력해주세요!"
        }), 400

    # 방 이름이나 코드가 이미 존재하는지 확인
    if Group.query.filter_by(invite_code=invite_code).first():
        return jsonify({
            "status": "error",
            "message": "이미 존재하는 초대 코드입니다! 다른 코드를 사용해주세요."
        }), 400

    new_group = Group(
        name=name,
        group_type=group_type,
        invite_code=invite_code,
        max_members=max_members
    )

    db.session.add(new_group)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"'{name}'방이 성공적으로 생성되었습니다!",
        "group_id": new_group.id,
        "invite_code": new_group.invite_code,
        "max_members": new_group.max_members
    })


# 초대 코드로 방에 입장하고 닉네임을 설정하는 로직
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

    # 인원 수 제한 확인
    current_member_count = GroupMember.query.filter_by(group_id=group.id).count()
    if current_member_count >= group.max_members:
        return jsonify({"status": "error", "message": f"최대 인원 수에 도달했습니다! (최대 {group.max_members}명)"}), 400

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
        "message": f"'{group.name}'방에 '{room_nickname}'(으)로 입장 성공!"
    })


# 방 안에서 사용할 닉네임 변경 로직 (초대 코드 검증 포함)
@bp.route("/mypage/room-nickname", methods=["PUT"])
@login_required
def update_room_nickname():
    user = g.user
    data = request.get_json()

    group_id = data.get("group_id")
    invite_code = data.get("invite_code")
    new_room_nickname = data.get("room_nickname")

    if not group_id or not new_room_nickname or not invite_code:
        return jsonify({"status": "error", "message": "그룹 ID, 초대코드, 닉네임을 모두 입력해주세요!"}), 400

    target_group = Group.query.filter_by(id=group_id, invite_code=invite_code).first()
    if not target_group:
        return jsonify({"status": "error", "message": "유효하지 않은 방이거나 초대 코드가 틀렸습니다!"}), 403

    # 닉네임 중복 검사 (같은 방 안에서만 체크)
    nickname_taken = GroupMember.query.filter_by(group_id=group_id, room_nickname=new_room_nickname).first()
    if nickname_taken:
        return jsonify({"status": "error", "message": "해당 방에서 이미 사용 중인 닉네임입니다!"}), 400

    # 해당 그룹의 멤버십 조회
    membership = GroupMember.query.filter_by(user_id=user.id, group_id=group_id).first()
    if not membership:
        return jsonify({"status": "error", "message": "해당 그룹에 가입되어 있지 않습니다!"}), 404

    # 닉네임 변경 및 저장
    membership.room_nickname = new_room_nickname
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"방 닉네임이 '{new_room_nickname}'(으)로 성공적으로 변경되었습니다!"
    })


# 방의 정보 변경 로직
@bp.route("/<int:group_id>/update-settings", methods=["PUT"])
@login_required
def update_group_name(group_id):
    user = g.user
    data = request.get_json()

    new_name = data.get("name")
    new_max_members = data.get("max_members")
    invite_code = data.get("invite_code")

    if not invite_code:
        return jsonify({"status": "error", "message": "초대 코드를 입력해 주셔유!"}), 400

    # 해당 방을 찾고 초대 코드 검증
    target_group = Group.query.filter_by(id=group_id, invite_code=invite_code).first()
    if not target_group:
        return jsonify({"status": "error", "message": "유효하지 않은 방이거나 초대 코드가 일치하지 않습니다!"}), 403

    # 방 이름 변경 및 저장
    if new_name:
        target_group.name = new_name

    # 인원 수 제한 변경
    if new_max_members is not None:
        # 현재 접속 중인 인원 수 확인
        from gnss_app.models.travel import GroupMember
        current_member_count = GroupMember.query.filter_by(group_id=group_id).count()

        # 줄이려는 인원 수 제한이 현재 인원보다 적으면 에러
        if new_max_members < current_member_count:
            return jsonify({
                "status": "error",
                "message": f"현재 접속 중인 인원({current_member_count}명)보다 적은 인원으로 제한할 수 없습니다!"
            }), 400

        target_group.max_members = new_max_members

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"방 설정이 성공적으로 변경되었습니다!",
        "group_name": target_group.name,
        "max_members": target_group.max_members
    })

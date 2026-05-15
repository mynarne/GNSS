import os
from dotenv import load_dotenv
from flask import Blueprint, render_template, jsonify, request
from gnss_app.models.travel import db, TravelPlan, PlanItem, GroupMember
from gnss_app.models.visit_log import VisitLog, Photo
from gnss_app.views.auth_view import login_required

load_dotenv()

# 블루프린트 설정
bp = Blueprint("map", __name__, url_prefix="/map")

# 지도 엔진 테스트 페이지
@bp.route("/test")
@login_required
def map_test():
    maps_api = os.environ.get("GOOGLE_MAPS_KEY")
    print(f"구글 맵 API 키 로드 상태: {maps_api}")
    return render_template("maps/map_test.html", maps_api=maps_api)

# 내 방문 기록 및 썸네일 조회 API
@bp.route("/api/my-logs", methods=["GET"])
# @login_required
def get_my_logs():
    # 임시 테스트 유저
    class DummyUser:
        id = 1
    user = DummyUser()

    mode = request.args.get("mode", "personal")

    query = VisitLog.query

    # 1. 뷰 모드에 따라 데이터베이스 필터링
    if mode == "personal" or mode == "hiking":
        # 개인 기록: 그룹 ID가 없는 순수 내 기록
        logs = query.filter_by(user_id=user.id, group_id=None).all()
    elif mode == "group":
        # 그룹 기록: 내가 속한 그룹들의 모든 기록
        memberships = GroupMember.query.filter_by(user_id=user.id).all()
        group_ids = [m.group_id for m in memberships]
        logs = query.filter(VisitLog.group_id.in_(group_ids)).all() if group_ids else []
    else:
        logs = []

    results = []
    for log in logs:
        # 2. 해당 방문 기록의 대표 이미지(썸네일) 조회
        rep_photo = Photo.query.filter_by(visit_log_id=log.id, is_representative=True).first()
        photo_url = rep_photo.photo_url if rep_photo else None

        # 3. 프론트엔드로 보낼 JSON 데이터 조립 (지정된 날짜 포맷 적용)
        visited_at_str = log.visited_at.strftime('%Y-%m-%D %H:%M:%S') if log.visited_at else None

        results.append({
            "id": log.id,
            "title": log.room_nickname,
            "coordinate": {
                "latitude": log.latitude,
                "longitude": log.longitude
            },
            "photo_url": photo_url,
            "visited_at": visited_at_str
        })

    return jsonify(results)
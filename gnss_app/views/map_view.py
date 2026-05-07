### 지도 구현 (구글맵 API 사용)

import os
from dotenv import load_dotenv
from flask import Blueprint, render_template, jsonify
from gnss_app.models.travel import db, TravelPlan, PlanItem
from gnss_app.views.auth_view import login_required

load_dotenv()

# 블루프린트 설정
bp = Blueprint("map", __name__, url_prefix="/map")

# 지도 엔진 테스트 페이지
@bp.route("/test")
@login_required
def map_test():
    maps_api = os.environ.get("GOOGLE_MAPS_KEY")
    print(f"키 받아왔는지?: {maps_api}")
    return render_template("maps/map_test.html", maps_api=maps_api)

# 경로 기록 테스트
@bp.route("/api/test-path")
def get_test_path():
    path_data = [
        {"lat": 34.6687, "lng": 135.5013}, # 도톤보리
        {"lat": 34.6661, "lng": 135.5003}, # 난바역
        {"lat": 34.6655, "lng": 135.5058}, # 구로몬 시장
        {"lat": 34.6691, "lng": 135.5063}  # 다시 근처로
    ]
    return jsonify(path_data)

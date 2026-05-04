### 스마트폰 앱이랑 위치 데이터 주고 받기

from flask import Blueprint, jsonify, request
from pynmeagps import NMEAMessage
from gnss_app.views.auth_view import login_required
from gnss_app.algorithms.trilateration import calculate_position
from gnss_app.algorithms.kalman_filter import SimpleKalmanFilter

bp = Blueprint('location', __name__, url_prefix='/location')

# 전역 칼만 필터 객체 생성
kf_x = SimpleKalmanFilter(process_variance=1e-5, measurement_variance=1e-1)
kf_y = SimpleKalmanFilter(process_variance=1e-5, measurement_variance=1e-1)

######################### 알고리즘 테스트용 ################################

# 단순 테스트용
@bp.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "서버 통신 정상"})

# 스마트폰으로부터 위치 데이터를 수신하는 라우트
@bp.route('/receive', methods=['POST'])
def receive():
    data = request.get_json()
    print(f"수신된 위치 데이터: {data}")
    return jsonify({"status": "success", "received": data})

# 삼변측량 알고리즘 테스트 라우트
@bp.route('/calculate', methods=['POST'])
def calculate():
    req_data = request.get_json()
    satellites = req_data.get('satellites')
    distances = req_data.get('distances')

    try:
        raw_position = calculate_position(satellites, distances)

        # 칼만 필터를 적용하여 x, y 좌표 보정
        filtered_x = kf_x.update(raw_position[0])
        filtered_y = kf_y.update(raw_position[1])

        corrected_position = [filtered_x, filtered_y, raw_position[2]]

        return jsonify({"status": "success", "raw_position": raw_position, "calculated_position": corrected_position})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

# 스마트폰이나 NMEA 데이터를 보내면 파싱하여 위치를 확인하는 라우트
@bp.route("/parse-nmea", methods=["POST"])
def parse_nmea():
    req_data = request.get_json()
    nmea_string = req_data.get("nmea_data") # 예: "$GPGGA,..."

    try:
        # pynmeagps를 사용한 데이터 파싱 예시
        print(f"수신된 NMEA 데이터: {nmea_string}")
        return jsonify({
            "status": "success",
            "message": "NMEA 파싱 성공",
            "received_nmea": nmea_string
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


######################################################################################################


# 앱에서 실시간으로 쏘는 좌표를 DB에 저장하는 API
@bp.route("/track", methods=["POST"])
@login_required
def track_location():
    data = request.get_json()

    # 앱에서 계산된(또는 NMEA로 파싱된) 위도, 경도를 받아옴
    lat = data.get("latitude")
    lon = data.get("longitude")

    if lat is None or lon is None:
        return jsonify({"status": "error", "message": "좌표가 빠졌습니다!"}), 400

    # 궤적 DB에 저장
    new_traj = Trajectory(user_id=g.user.id, latitude=lat, longitude=lon)
    db.session.add(new_traj)
    db.session.commit()

    return jsonify({"status": "success", "message": "위치 궤적 저장 완료!"})


# 404 에러 핸들러
@bp.app_errorhandler(404)
def page_not_found(e):
    # 페이지를 찾을 수 없을 때 표준 JSON 응답을 반환
    print("404 에러 발생: 요청한 페이지를 찾을 수 없습니다.")
    return jsonify({"status": "error", "message": "요청하신 페이지를 찾을 수 없습니다."}), 404

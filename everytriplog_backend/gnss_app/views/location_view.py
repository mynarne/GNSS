# gnss_app/views/location_view.py
import os
from datetime import datetime
from pynmeagps import NMEAMessage
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, g

from gnss_app.models.user import db
from gnss_app.models.visit_log import VisitLog, Photo
from gnss_app.models.travel import Group, GroupMember
from gnss_app.models.trajectory import Trajectory

from gnss_app.algorithms.trilateration import calculate_position
from gnss_app.algorithms.kalman_filter import SimpleKalmanFilter
from gnss_app.algorithms.cnn_classifier import classify_image

bp = Blueprint('location', __name__, url_prefix='/location')

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

kf_x = SimpleKalmanFilter(process_variance=1e-5, measurement_variance=1e-1)
kf_y = SimpleKalmanFilter(process_variance=1e-5, measurement_variance=1e-1)

# =====================================================================
# [앱 전용 인증 미들웨어] 
# Header에 담긴 토큰(user_id)으로 유저를 식별합니다.
# =====================================================================
from functools import wraps
from gnss_app.models.user import User

def app_login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"status": "error", "message": "인증 토큰이 없습니다."}), 401
        
        token = auth_header.replace("Bearer ", "").strip()
        user = User.query.get(token)
        
        if not user:
            return jsonify({"status": "error", "message": "유효하지 않은 유저입니다."}), 401
            
        g.user = user
        return view(*args, **kwargs)
    return wrapped_view

# =====================================================================
# 알고리즘 테스트 및 NMEA 로직 (기존 유지)
# =====================================================================

@bp.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "서버 통신 정상"})

@bp.route('/receive', methods=['POST'])
def receive():
    data = request.get_json()
    print(f"수신된 위치 데이터: {data}")
    return jsonify({"status": "success", "received": data})

@bp.route('/calculate', methods=['POST'])
def calculate():
    req_data = request.get_json()
    satellites = req_data.get('satellites')
    distances = req_data.get('distances')
    try:
        raw_position = calculate_position(satellites, distances)
        filtered_x = kf_x.update(raw_position[0])
        filtered_y = kf_y.update(raw_position[1])
        corrected_position = [filtered_x, filtered_y, raw_position[2]]
        return jsonify({"status": "success", "raw_position": raw_position, "calculated_position": corrected_position})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@bp.route("/parse-nmea", methods=["POST"])
def parse_nmea():
    req_data = request.get_json()
    nmea_string = req_data.get("nmea_data")
    try:
        print(f"수신된 NMEA 데이터: {nmea_string}")
        return jsonify({"status": "success", "message": "NMEA 파싱 성공", "received_nmea": nmea_string})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

# =====================================================================
# 실시간 궤적 및 방문 인증 로직 (기존 유지 + 앱 인증 적용)
# =====================================================================

@bp.route("/track", methods=["POST"])
@app_login_required
def track_location():
    data = request.get_json()
    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None:
        return jsonify({"status": "error", "message": "좌표가 빠졌습니다!"}), 400
    
    new_traj = Trajectory(user_id=g.user.id, latitude=lat, longitude=lon)
    db.session.add(new_traj)
    db.session.commit()
    return jsonify({"status": "success", "message": "위치 궤적 저장 완료!"})

@bp.route("/visit", methods=["POST"])
@app_login_required  # 앱에서 보낸 토큰으로 찐 유저를 식별합니다!
def record_visit():
    user = g.user # 앱 인증을 통과한 진짜 유저 객체
    
    raw_lat = request.form.get("latitude")
    raw_lon = request.form.get("longitude")
    group_id = request.form.get("group_id")
    captured_at_str = request.form.get("captured_at")
    representative_index = int(request.form.get("representative_index", 0))
    
    photo_file = request.files.get("photo")
    photo_files = request.files.getlist("photos")

    if raw_lat is None or raw_lon is None:
        return jsonify({"status": "error", "message": "필수 입력값이 누락되었습니다!"}), 400

    MAX_GROUP_PHOTOS = 50
    files_to_process = photo_files if photo_files else ([photo_file] if photo_file else [])

    if group_id:
        target_dir = os.path.join(UPLOAD_FOLDER, 'groups', str(group_id))
    else:
        target_dir = os.path.join(UPLOAD_FOLDER, 'personal', user.username) # 진짜 유저 이름 사용!
    
    os.makedirs(target_dir, exist_ok=True)

    visited_at = datetime.now()
    if captured_at_str:
        try:
            visited_at = datetime.strptime(captured_at_str, '%Y:%m:%D %H:%M:%S')
        except ValueError:
            pass

    corrected_lat = kf_y.update(float(raw_lat))
    corrected_lon = kf_x.update(float(raw_lon))

    room_nickname = "개인"
    if group_id:
        membership = GroupMember.query.filter_by(user_id=user.id, group_id=group_id).first()
        if not membership:
            return jsonify({"status": "error", "message": "해당 방에 가입되어 있지 않습니다!"}), 403
        room_nickname = membership.room_nickname

        current_logs = VisitLog.query.filter_by(group_id=group_id).all()
        log_ids = [log.id for log in current_logs]
        current_photo_count = Photo.query.filter(Photo.visit_log_id.in_(log_ids)).count() if log_ids else 0
        
        if current_photo_count + len(files_to_process) > MAX_GROUP_PHOTOS:
            return jsonify({
                "status": "error", 
                "message": f"그룹 사진 한도({MAX_GROUP_PHOTOS}장) 초과입니다. 사진을 줄여주세요."
            }), 400

    new_log = VisitLog(
        user_id=user.id,
        group_id=group_id,
        room_nickname=room_nickname,
        latitude=corrected_lat,
        longitude=corrected_lon,
        is_verified=True,
        visited_at=visited_at
    )
    db.session.add(new_log)
    db.session.flush() 

    saved_photo_url = None

    for index, file in enumerate(files_to_process):
        if file and file.filename != '':
            filename_prefix = datetime.now().strftime('%Y%m%D%H%M%S')
            filename = secure_filename(f"{filename_prefix}_{file.filename}")
            filepath = os.path.join(target_dir, filename)
            file.save(filepath)

            is_rep = (index == representative_index)
            if is_rep:
                saved_photo_url = filepath
                new_log.photo_url = filepath

            category = classify_image(filepath)

            new_photo = Photo(
                visit_log_id=new_log.id,
                photo_url=filepath,
                category=category,
                is_representative=is_rep
            )
            db.session.add(new_photo)

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"'{room_nickname}'님의 방문 기록이 저장되었습니다.",
        "log_id": new_log.id,
        "coords": {"lat": corrected_lat, "lon": corrected_lon},
        "photo_path": saved_photo_url,
        "captured_at": visited_at.strftime('%Y-%m-%D %H:%M:%S')
    })


@bp.route("/my-trajectory", methods=["GET"])
@app_login_required
def get_my_trajectory():
    """
    현재 로그인한 유저의 이동 궤적 데이터를 반환합니다.
    (추후 날짜별, 그룹방별로 필터링을 추가할 수 있습니다.)
    """
    user = g.user
    
    # Trajectory 테이블에서 해당 유저의 모든 좌표를 가져옵니다.
    trajectories = Trajectory.query.filter_by(user_id=user.id).order_by(Trajectory.id.asc()).all()
    
    # 프론트엔드(React Native Maps)의 Polyline 컴포넌트가 읽을 수 있는 형태로 변환합니다.
    coords = [{"latitude": t.latitude, "longitude": t.longitude} for t in trajectories]
    
    return jsonify({
        "status": "success",
        "message": "궤적 데이터를 성공적으로 불러왔습니다.",
        "data": coords
    })

@bp.app_errorhandler(404)
def page_not_found(e):
    return jsonify({"status": "error", "message": "요청하신 페이지를 찾을 수 없습니다."}), 404
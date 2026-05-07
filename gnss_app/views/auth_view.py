### 사용자 인증 (로그인 / 회원가입)

import functools
import random
from textwrap import wrap
from flask import Blueprint, request, jsonify, session, g, abort
from gnss_app.models.user import db, User
from datetime import datetime, timezone, timedelta


bp = Blueprint("auth", __name__, url_prefix="/auth")

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

# 앱에 요청이 들어올 때마다 가장 먼저 실행
@bp.before_app_request
def load_logged_in_user():
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        # 세션에 아이디가 있으면 DB에서 유저 정보를 찾아서 g.user에 넣어줌
        g.user = User.query.get(user_id)


# 관리자 권한 데코레이터
def admin_required(ar):
    @functools.wraps(ar)
    def decorated_function(*args, ** kwargs):
        # 로그인 되어 있지 않거나 g.user가 없는 경우
        if not g.user:
            abort(401) # 인증되지 않음

        # 로그인 유저의 role이 admin이 아닌 경우
        if g.user.role != 'admin':
            abort(403) # 접근 권한 없음 (Forbidden)

        return ar(*args, **kwargs)
    return decorated_function


# API용 로그인 검증 데코레이터
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(*args, **kwargs):
        # 유저 정보가 없으면 401(권한 없음) 에러와 JSON을 반환
        if g.user is None:
            return jsonify({
                "status": "error",
                "message": "로그인이 필요한 서비스입니다!"
            }), 401

        return view(*args, **kwargs)
    return wrapped_view


# 회원가입 로직
@bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    phone_number = data.get("phone_number")
    username = data.get("username")
    password = data.get("password")

    if User.query.filter_by(email=email).first():
        return jsonify({"status": "error",
                        "message": "이미 존재하는 이메일입니다!"}), 400

    if User.query.filter_by(phone_number=phone_number).first():
        return jsonify({"status": "error",
                        "message": "이미 존재하는 전화번호입니다!"})

    new_user = User(username=username, email=email, phone_number=phone_number)
    new_user.set_password(password) # 암호화해서 저장

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"status": "success",
                    "message": f"{username}님, 가입을 환영합니다!"})


# 로그인 로직
@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        # 로그인 성공 시 세션에 유저 ID 저장
        session.clear()

        # 자동 로그인 기능 - 브라우저를 닫아도 로그인 유지
        session.permanent = True

        session["user_id"] = user.id
        session["username"] = user.username
        return jsonify({"status": "success", "message": f"{user.username}님, 어서오세요!"})

    return jsonify({"status": "error",
                    "message": "이메일이나 비밀번호가 일치하지 않습니다!"}), 401


# 로그아웃 로직 (세션 종료)
@bp.route("/logout", methods=["GET"])
@login_required
def logout():
    session.clear()
    return jsonify({"status": "success",
                    "message": "로그아웃 되었습니다!"})


# 마이페이지 로직
@bp.route("/mypage", methods=["GET"])
@login_required
def get_mypage():

    return jsonify({
        "status": "success",
        "username": g.user.username,
        "email": g.user.email,
        "phone_number": g.user.phone_number,
        "created_at": g.user.created_at.strftime('%Y.%m.%D %H:%M:%S')
    })


# 회원정보 수정 로직
@bp.route("/mypage/update", methods=["PUT"])
@login_required
def update_profile():
    # g.user를 통해 현재 로그인된 유저 객체 가져오기
    user = g.user
    data = request.get_json()

    # 보안 검증: 비밀번호를 한 번 더 확인하여 본인 인증
    current_password = data.get("current_password")
    if not current_password or not user.check_password(current_password):
        return jsonify({"status": "error", "message": "비밀번호가 일치하지 않습니다!"}), 401

    new_username = data.get("username")
    new_email = data.get("email")
    new_phone = data.get("phone_number")
    new_password = data.get("password")

    # 이메일이나 전화번호를 바꿀 때만 작동하는 인증 세션
    if (new_email and new_email != user.email) or (new_phone and new_phone != user.phone_number):
        # verify-code에서 통과한 값 확인
        if not session.get('is_verified'):
            return jsonify({"status": "error", "message": "이메일/전화번호 변경을 위해 먼저 본인 인증을 해주세요!"}), 403

        # 바꿀 값과 인증받은 값이 일치하는지도 확인
        if new_email and new_email != session.get('verified_target') and new_phone != session.get('verified_target'):
             return jsonify({"status": "error", "message": "인증받은 정보와 수정하려는 정보가 다릅니다!"}), 400

    # # 이메일 변경 시 중복 검사
    # if new_email and new_email != user.email:
    #     if User.query.filter_by(email=new_email).first():
    #         return jsonify({"status": "error", "message": "이미 존재하는 이메일입니다!"}), 400
    #     user.email = new_email

    # # 전화번호 변경 시 중복 검사
    # if new_phone and new_phone != user.phone_number:
    #     if User.query.filter_by(phone_number=new_phone).first():
    #         return jsonify({"status": "error", "message": "이미 존재하는 전화번호입니다!"}), 400
    #     user.phone_number = new_phone

    # 실제 DB 값 변경 로직
    if new_email and new_email != user.email:
        user.email = new_email
    if new_phone and new_phone != user.phone:
        user.phone = new_phone

    # 유저이름 변경
    if new_username:
        user.username = new_username

    # 비밀번호 변경 시 암호화 및 기존 세션 만료 처리 (자동 로그아웃 유도)
    if new_password:
        user.set_password(new_password)
        db.session.commit()

        # 비밀번호 변경 시 세션 클리어하여 재로그인 유도
        session.clear()
        return jsonify({
            "status": "success",
            "message": "비밀번호가 변경되어 다시 로그인이 필요합니다!"
        }), 200

    # 저장 및 인증 세션 파기 (재사용 방지)
    db.session.commit()
    session.pop('is_verified', None)
    session.pop('verified_target', None)

    return jsonify({
        "status": "success",
        "message": "회원정보가 성공적으로 수정되었습니다!",
    })


# 이메일/휴대전화 인증번호 요청 로직 (임시)
@bp.route("/request-verification", methods=["POST"])
def request_verification():
    data = request.get_json()
    target_type = data.get("type") # 'email' 또는 'phone'
    target_value = data.get("value") # 변경할 이메일 주소나 전화번호
    purpose = data.get("purpose") # 'signup', 'update_email', 'update_phone' 등의 목적

    if not target_type or not target_value or not purpose:
        return jsonify({"status": "error", "message": "필수 입력값이 누락되었습니다!"}), 400

    # 6자리 랜덤 인증번호 생성
    verification_code = str(random.randint(100000, 999999))

    # 서버 세션에 인증번호와 대상 저장
    session['verify_code'] = verification_code
    session['verify_target'] = target_value
    session['verify_purpose'] = purpose
    session['verify_time'] = get_kst_now().isoformat() # 발송된 시간 저장 (KST 기준)

    # 터미널 테스트용
    print(f"\n[목적: {purpose.upper()}]\n {target_type} : {target_value}")
    print(f"발송된 인증번호: [{verification_code}]\n")

    return jsonify({"status": "success", "message": "인증번호가 발송되었습니다!"})


# 인증번호 확인 로직 (임시)
# 임시: 인증번호 확인 API
@bp.route("/verify-code", methods=["POST"])
def verify_code():
    data = request.get_json()
    input_code = data.get("code")
    target_value = data.get("value") # 내 번호가 맞는지 확인

    saved_code = session.get('verify_code')
    saved_target = session.get('verify_target')
    saved_time_str = session.get('verify_time')

    # 세션에 코드가 없거나 코드가 틀렸거나 요청한 번호가 다르면 에러 발생
    if not saved_code or input_code != saved_code or target_value != saved_target:
        return jsonify({"status": "error", "message": "인증번호가 일치하지 않거나 만료되었습니다!"}), 400

    # 유효시간(3분) 검증
    saved_time = datetime.fromisocalendar(saved_time_str)
    if get_kst_now() - saved_time > timedelta(minutes=3):
        # 3분 지났을 때 세션 초기화
        session.pop('verify_code', None)
        session.pop('verify_target', None)
        session.pop('verify_purpose', None)
        session.pop('verify_time', None)
        return jsonify({"status": "error", "message": "유효시간(3분)이 지났습니다. 다시 요청해주세요."})

    # 정답이다 연금술사
    session['is_verified'] = True
    session['verified_target'] = saved_target
    session['verified_purpose'] = session.get('verify_purpose')

    # 인증 성공 시 세션에서 코드 삭제 (재사용 방지)
    session.pop('verify_code', None)
    session.pop('verify_target', None)
    session.pop('verify_purpose', None)
    session.pop('verify_time', None)

    return jsonify({"status": "success", "message": "본인 인증이 완료되었습니다!"})

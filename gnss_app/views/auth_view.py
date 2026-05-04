### 사용자 인증 (로그인 / 회원가입)

import functools
from flask import Blueprint, request, jsonify, session, g
from gnss_app.models.user import db, User
from datetime import datetime, timezone, timedelta


bp = Blueprint("auth", __name__, url_prefix="/auth")

# 앱에 요청이 들어올 때마다 가장 먼저 실행
@bp.before_app_request
def load_logged_in_user():
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        # 세션에 아이디가 있으면 DB에서 유저 정보를 찾아서 g.user에 넣어줌
        g.user = User.query.get(user_id)


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

    # 이메일 변경 시 중복 검사
    if new_email and new_email != user.email:
        if User.query.filter_by(email=new_email).first():
            return jsonify({"status": "error", "message": "이미 존재하는 이메일입니다!"}), 400
        user.email = new_email

    # 전화번호 변경 시 중복 검사
    if new_phone and new_phone != user.phone_number:
        if User.query.filter_by(phone_number=new_phone).first():
            return jsonify({"status": "error", "message": "이미 존재하는 전화번호입니다!"}), 400
        user.phone_number = new_phone

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

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "회원정보가 성공적으로 수정되었습니다!",
        "username": user.username,
        "email": user.email,
        "phone_number": user.phone_number
    })

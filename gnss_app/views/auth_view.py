### 사용자 인증 (로그인 / 회원가입)

import functools
import random
import re
from textwrap import wrap
from flask import Blueprint, request, jsonify, session, g, abort, render_template, redirect, url_for, flash
from gnss_app.models.user import db, User
from datetime import datetime, timezone, timedelta
from flask_mail import Message
from gnss_app import mail


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


# 차단할 도메인 리스트
DISALLOWED_DOMAINS = ['test.com', 'example.com', 'sample.com', 'temp.com']

# 도메인 제약 조건
def is_valid_domain(email):
    # 이메일 형식에서 도메인 부분만 추출
    domain = email.split('@')[-1]
    if domain in DISALLOWED_DOMAINS:
        return False
    return True


# 전화번호 포맷 함수 (하이픈 자동 처리)
def format_phone_number(phone_input):
    if not phone_input:
        return None
    numbers_only = re.sub(r'[^0-9]', '', phone_input)
    if len(numbers_only) == 11:
        return f"{numbers_only[:3]}-{numbers_only[3:7]}-{numbers_only[7:]}"
    elif len(numbers_only) == 10:
        return f"{numbers_only[:3]}-{numbers_only[3:6]}-{numbers_only[6:]}"
    return numbers_only


# 비밀번호 유효성 검사 (영문 + 숫자 + 특수문자 포함 8~16자)
def is_valid_password(password):
    # 최소 1개의 영문자, 1개의 숫자, 1개의 특수문자 포함 및 8~16자 제한
    pattern = r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$'
    return bool(re.match(pattern, password))


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
            if request.is_json:
                return jsonify({
                    "status": "error",
                    "message": "로그인이 필요한 서비스입니다!"
                }), 401
            flash("로그인이 필요한 서비스입니다!")
            return redirect(url_for("auth.login"))

        return view(*args, **kwargs)
    return wrapped_view


# 이메일 중복 체크
@bp.route("/check-email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"status": "error", "message": "이메일을 입력해주세요."}), 400

    # 도메인 제약 조건 확인
    if not is_valid_domain(email):
        return jsonify({"status": "error", "message": "사용할 수 없는 도메인입니다."}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"status": "exists", "message": "이미 가입된 이메일입니다."})

    return jsonify({"status": "available", "message": "사용 가능한 이메일입니다."})


# 닉네임 중복 체크
@bp.route("/check-nickname", methods=["POST"])
def check_nickname():
    data = request.get_json()
    nickname = data.get("nickname")

    if not nickname:
        return jsonify({"status": "error", "message": "닉네임을 입력해주세요."}), 400

    user = User.query.filter_by(nickname=nickname).first()
    if user:
        return jsonify({"status": "exists", "message": "이미 사용 중인 닉네임입니다."})

    return jsonify({"status": "available", "message": "사용 가능한 닉네임입니다."})


# 인증번호 발송
@bp.route("/send-verification", methods=["POST"])
def send_verification():
    data = request.get_json()
    email = data.get("email", "").strip()

    # 발송 전 다시 한번 검증
    if not is_valid_domain(email) or User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "유효하지 않거나 이미 가입된 이메일입니다."})

    verification_code = str(random.randint(100000, 999999))
    session['verify_code'] = verification_code
    session['verify_email'] = email
    session['verify_time'] = get_kst_now().isoformat()

    try:
        subject = "[EveryTripLog] 이메일 인증번호 안내"
        body = f"인증번호는 [{verification_code}] 입니다. 3분 이내에 입력해 주세요."
        msg = Message(subject, recipients=[email])
        msg.body = body
        mail.send(msg)
        print(f"발송된 인증번호: [{verification_code}]")
        return jsonify({"success": True, "message": "인증번호가 발송되었습니다."})
    except Exception as e:
        print(f"메일 전송 실패: {e}")
        return jsonify({"success": False, "message": "메일 발송에 실패했습니다."})


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
    saved_time = datetime.fromisoformat(saved_time_str)
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


# 회원가입 로직
@bp.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":
        form_data = request.form
        data = request.get_json() if request.is_json else request.form
        email = data.get("email")
        raw_phone = data.get("phone_number")
        phone_number = format_phone_number(raw_phone) # 전화번호 하이픈 정제
        username = data.get("username")
        nickname = data.get("nickname")
        password = data.get("password")

        # 도메인 방어
        if not is_valid_domain(email):
            flash("허용되지 않는 이메일 도메인입니다!")
            return render_template("auth/signup.html", form_data=form_data)

        # 본인 인증 확인 방어
        if not session.get('is_verified') or session.get('verified_target') != email:
            flash("이메일 인증을 완료해주세요!")
            return render_template("auth/signup.html", form_data=form_data)

        # 비밀번호 복잡도 방어 (서버단 최종 검증)
        if not is_valid_password(password):
            flash("비밀번호는 영문, 숫자, 특수문자를 포함하여 8~16자로 설정해야 합니다!")
            return render_template("auth/signup.html", form_data=form_data)

        # 비밀번호 확인 방어
        if password != password_confirm:
            flash("비밀번호가 서로 일치하지 않습니다!")
            return render_template("auth/signup.html", form_data=form_data)

        # 중복 방어
        if User.query.filter_by(email=email).first():
            flash("이미 존재하는 이메일입니다!")
            return render_template("auth/signup.html", form_data=form_data)

        if User.query.filter_by(nickname=nickname).first():
            flash("이미 존재하는 닉네임입니다!")
            return render_template("auth/signup.html", form_data=form_data)

        if User.query.filter_by(email=email).first():
            if request.is_json:
                return jsonify({"status": "error",
                                "message": "이미 존재하는 이메일입니다!"}), 400
            flash("이미 존재하는 이메일입니다!")
            return redirect(url_for("auth.signup"))

        if User.query.filter_by(nickname=nickname).first():
            if request.is_json:
                return jsonify({"status": "error",
                                "message": "이미 존재하는 닉네임입니다!"}), 400
            flash("이미 존재하는 닉네임입니다!")
            return redirect(url_for("auth.signup"))

        if User.query.filter_by(phone_number=phone_number).first():
            if request.is_json:
                return jsonify({"status": "error",
                                "message": "이미 존재하는 전화번호입니다!"}), 400
            flash("이미 존재하는 전화번호입니다!")
            return redirect(url_for("auth.signup"))

        new_user = User(username=username, nickname=nickname, email=email, phone_number=phone_number)
        new_user.set_password(password) # 암호화해서 저장

        db.session.add(new_user)
        db.session.commit()

        if request.is_json:
            return jsonify({"status": "success",
                            "message": f"{username}님, 가입을 환영합니다!"})

        flash(f"{username}님, 가입을 환영합니다!")
        return redirect(url_for("auth.login"))

    # GET 방식일 때
    return render_template("auth/signup.html")


# 로그인 로직
@bp.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":
        data = request.get_json() if request.is_json else request.form
        email = data.get("email")
        password = data.get("password")

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            # 로그인 성공 시 세션에 유저 ID 저장
            session.clear()

            # 자동 로그인 기능 - 브라우저를 닫아도 로그인 유지
            session.permanent = True

            session["user_id"] = user.id

            if request.is_json:
                return jsonify({"status": "success", "message": f"{user.nickname}님, 어서오세요!"})

            flash(f"{user.nickname}님, 어서오세요!")
            return redirect(url_for("main.index"))

        if request.is_json:
            return jsonify({"status": "error",
                            "message": "이메일이나 비밀번호가 일치하지 않습니다!"}), 401

        flash("이메일이나 비밀번호가 일치하지 않습니다!")
        return redirect(url_for("auth.login"))

    # GET 방식일 때
    return render_template("auth/login.html")


# 로그아웃 로직 (세션 종료)
@bp.route("/logout", methods=["GET"])
@login_required
def logout():
    session.clear()

    # 웹에서 로그아웃 시 메인페이지로 이동
    if not request.is_json:
        flash("로그아웃 되었습니다!")
        return redirect(url_for("main.index"))

    return jsonify({"status": "success",
                    "message": "로그아웃 되었습니다!"})


# 이메일/휴대전화 인증번호 요청 로직 (26.05.08 휴대전화 인증 구현x)
@bp.route("/request-verification", methods=["POST"])
def request_verification():
    data = request.get_json()
    target_type = data.get("type") # 'email' 또는 'phone'
    target_value = data.get("value") # 변경할 이메일 주소나 전화번호
    purpose = data.get("purpose") # 'signup', 'update_email', 'update_phone' 등의 목적

    if not target_type or not target_value or not purpose:
        return jsonify({"status": "error", "message": "필수 입력값이 누락되었습니다!"}), 400

    # 도메인 제약 조건 확인 (이메일)
    if target_type == 'email' and not is_valid_domain(target_value):
        return jsonify({"status": "error", "message": "사용할 수 없는 이메일 도메인입니다!"}), 400

    # 6자리 랜덤 인증번호 생성
    verification_code = str(random.randint(100000, 999999))

    # 서버 세션에 인증번호와 대상 저장
    session['verify_code'] = verification_code
    session['verify_target'] = target_value
    session['verify_purpose'] = purpose
    session['verify_time'] = get_kst_now().isoformat() # 발송된 시간 저장 (KST 기준)

    # 이메일 발송 처리
    if target_type == 'email':
        try:
            subject = "[EveryTripLog] 본인 확인 인증번호 안내"
            body = f"안녕하세요. EveryTripLog입니다.\n요청하신 인증번호는 [{verification_code}] 입니다.\n3분 이내에 입력해 주세요."

            msg = Message(subject, recipients=[target_value])
            msg.body = body
            mail.send(msg)

            return jsonify({"status": "success", "message": "인증메일이 발송되었습니다!"})
        except Exception as e:
            print(f"메일 발송 에러: {e}")
            return jsonify({"status": "error", "message": "메일 발송에 실패했습니다. 관리자에게 문의하세요."}), 500

    # 추후 전화번호 인증번호 기능 추가 시 작성
    #
    #
    #######


    # 터미널 테스트용
    print(f"\n[목적: {purpose.upper()}]\n {target_type} : {target_value}")
    print(f"발송된 인증번호: [{verification_code}]\n")

    return jsonify({"status": "success", "message": "인증번호가 발송되었습니다!"})

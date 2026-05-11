### 사용자 인증 (로그인 / 회원가입)

import functools
import random
import re
import os
import requests
import string

from dotenv import load_dotenv
from textwrap import wrap
from flask import Blueprint, request, jsonify, session, g, abort, render_template, redirect, url_for, flash
from gnss_app.models.user import db, User
from datetime import datetime, timezone, timedelta
from flask_mail import Message
from gnss_app import mail

load_dotenv()

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


######### 검증 및 포맷팅 헬퍼 함수 #########


# 차단할 도메인 리스트
DISALLOWED_DOMAINS = ['test.com', 'example.com', 'sample.com', 'temp.com']

# 도메인 제약 조건
def is_valid_domain(email):
    # 이메일 형식에서 도메인 부분만 추출
    domain = email.split('@')[-1]
    if domain in DISALLOWED_DOMAINS:
        return False
    return True


# 이메일 검증 함수
def is_valid_email_format(email):
    pattern = r'^[a-zA-Z0-9+-_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(pattern, email))


# 비밀번호 유효성 검사 (영문 + 숫자 + 특수문자 포함 8~16자)
def is_valid_password(password):
    # 최소 1개의 영문자, 1개의 숫자, 1개의 특수문자 포함 및 8~16자 제한
    pattern = r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$'
    return bool(re.match(pattern, password))


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


#########################################



######### [API] 비동기(AJAX) 검증 및 통신 라우터 #########


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

    # 이메일 검증 제약 조건 확인

    if not is_valid_email_format(email):
        return jsonify({"status": "error", "message": "올바른 이메일 형식이 아닙니다."}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"status": "exists", "message": "이미 가입된 이메일입니다."})

    return jsonify({"status": "available", "message": "사용 가능한 이메일 형식입니다."})


# 닉네임 중복 체크
@bp.route("/check-nickname", methods=["POST"])
def check_nickname():
    data = request.get_json()
    nickname = data.get("nickname")

    if not nickname:
        return jsonify({"status": "error", "message": "닉네임을 입력해주세요."}), 400

    if len(nickname) < 2 or len(nickname) > 20:
        return jsonify({"status": "error", "message": "닉네임은 2~20자여야 합니다."})

    user = User.query.filter_by(nickname=nickname).first()
    if user:
        return jsonify({"status": "exists", "message": "이미 사용 중인 닉네임입니다."})

    return jsonify({"status": "available", "message": "사용 가능한 닉네임입니다."})


# 전화번호 중복 체크
@bp.route("/check-phone", methods=["POST"])
def check_phone():
    data = request.get_json()
    raw_phone = data.get("phone", "")

    # 전달받은 번호를 하이픈 정제 함수로 통일시킵니다.
    phone_number = format_phone_number(raw_phone)

    if not phone_number or len(phone_number) < 12:
        return jsonify({"status": "error", "message": "올바른 연락처를 입력해주세요."}), 400

    user = User.query.filter_by(phone_number=phone_number).first()
    if user:
        return jsonify({"status": "exists", "message": "이미 가입된 연락처입니다."})

    return jsonify({"status": "available", "message": "사용 가능한 연락처입니다."})


# 이메일/휴대전화 인증번호 요청 로직 (26.05.08 휴대전화 인증 구현x)
@bp.route("/request-verification", methods=["POST"])
def request_verification():
    data = request.get_json()
    target_type = data.get("type") # 'email' 또는 'phone'
    target_value = data.get("value") # 변경할 이메일 주소나 전화번호
    purpose = data.get("purpose") # 'signup', 'update_email', 'update_phone' 등의 목적

    if not target_type or not target_value or not purpose:
        return jsonify({"status": "error", "message": "필수 입력값이 누락되었습니다!"}), 400

    # 이메일 중복 및 도메인 제약 조건 확인 (이메일)
    if target_type == 'email':
        if not is_valid_email_format(target_value) or not is_valid_domain(target_value):
            return jsonify({"status": "error", "message": "사용할 수 없는 이메일입니다!"}), 400
        if User.query.filter_by(email=target_value).first():
            return jsonify({"status": "error", "message": "이미 가입된 이메일입니다!"}), 400

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
        return jsonify({"status": "error", "message": "인증번호가 일치하지 않습니다!"}), 400

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


##############################################



######### [WEB] 폼 전송(Submit) 라우터 #########


# 회원가입 로직
@bp.route("/signup", methods=["GET", "POST"])
def signup():

    form_data = {}

    if request.method == "POST":
        form_data = request.form
        email = form_data.get("email", "").strip()
        raw_phone = form_data.get("phone_number", "")
        phone_number = format_phone_number(raw_phone)
        username = form_data.get("username", "").strip()
        nickname = form_data.get("nickname", "").strip()
        password = form_data.get("password", "")
        password_confirm = form_data.get("password_confirm", "")

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

        if User.query.filter_by(phone_number=phone_number).first():
            flash("이미 존재하는 전화번호입니다!")
            return render_template("auth/signup.html", form_data=form_data)

        new_user = User(username=username, nickname=nickname, email=email, phone_number=phone_number)
        new_user.set_password(password) # 암호화해서 저장

        db.session.add(new_user)
        db.session.commit()

        # 가입 완료 후 세션 초기화
        session.pop('is_verified', None)
        session.pop('verified_target', None)
        session.pop('verified_purpose', None)

        flash(f"{username}님, 가입을 환영합니다!")
        return redirect(url_for("auth.login"))

    # GET 방식일 때
    return render_template("auth/signup.html", form_data=form_data)


# 로그인 로직
@bp.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":
        data = request.get_json() if request.is_json else request.form
        email = data.get("email")
        password = data.get("password")

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):

            # 정지 계정 확인 여부
            if user.status == 'banned' or user.is_banned:
                flash("영구 정지된 계정입니다. 관리자에게 문의하세요.")
                return redirect(url_for("auth.login"))

            if user.is_suspended():
                unlock_time = user.suspended_until.strftime('%Y-%m-%d %H:%M')
                flash(f"정지된 계정입니다. {unlock_time} 이후에 이용 가능합니다.")
                return redirect(url_for("auth.login"))

            # 정지 기간이 끝났는데 아직 status가 suspended라면 자동으로 해제 (KST 기준)
            if user.status == 'suspended' and not user.is_suspended():
                user.status = 'active'
                user.suspended_until = None
                db.session.commit()

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


######### [소셜 로그인] 네이버 로그인 연동 #########

@bp.route("/login/naver")
def login_naver():
    # 네이버 로그인 창으로 사용자 리다이렉트
    client_id = os.getenv("MY_NAVER_ID")
    redirect_uri = "http://127.0.0.1:5000/auth/naver/callback"
    state = "random_state_string_for_security"

    if not client_id:
        flash("네이버 로그인 키가 설정되지 않았습니다. 관리자에게 문의하세요.")
        return redirect(url_for("auth.login"))

    url = f"https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&state={state}"
    return redirect(url)

@bp.route("/naver/callback")
def callback_naver():
    code = request.args.get("code")
    state = request.args.get("state")
    client_id = os.getenv("MY_NAVER_ID")
    client_secret = os.getenv("MY_NAVER_PASSWORD")

    redirect_uri = "http://127.0.0.1:5000/auth/naver/callback"

    # 인증 코드로 액세스 토큰 발급 요청
    token_url = f"https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id={client_id}&client_secret={client_secret}&code={code}&state={state}&redirect_uri={redirect_uri}"
    token_res = requests.get(token_url).json()
    access_token = token_res.get("access_token")

    if not access_token:
        flash("네이버 로그인에 실패했습니다.")
        return redirect(url_for("auth.login"))

    # 액세스 토큰으로 사용자 정보 요청
    headers = {"Authorization": f"Bearer {access_token}"}
    info_res = requests.get("https://openapi.naver.com/v1/nid/me", headers=headers).json()
    user_info = info_res.get("response", {})

    email = user_info.get("email")
    name = user_info.get("name")
    phone = user_info.get("mobile") # 010-0000-0000 형태

    # 기존 가입자인지 확인 (이메일 기준)
    user = User.query.filter_by(email=email).first()
    if user:
        if user.status == 'banned' or user.is_banned:
            return f"<script>alert('영구 정지된 계정입니다.'); window.location.href='{url_for('auth.login')}';</script>"

        if user.is_suspended():
            unlock_time = user.suspended_until.strftime('%Y-%m-%d %H:%M')
            return f"<script>alert('정지된 계정입니다.\\n해제 일시: {unlock_time}'); window.location.href='{url_for('auth.login')}';</script>"

        # 정지 기간 종료 시 자동 해제
        if user.status == 'suspended' and not user.is_suspended():
            user.status = 'active'
            user.suspended_until = None
            db.session.commit()

        # 기존 가입자면 바로 로그인 처리
        session.clear()
        session.permanent = True
        session["user_id"] = user.id

        # 가입 출처(provider)가 'local'일 때만 계정 통합 안내 팝업
        if user.provider == 'local':
            user.provider = 'naver' # 다음번 로그인부터는 팝업이 안 뜨도록 출처 업데이트
            db.session.commit()
            return f"""
            <script>
                alert("기존 이메일로 가입한 정보가 확인되었습니다.\\n네이버 간편 로그인과 안전하게 통합합니다.\\n환영합니다, {user.nickname}님!");
                window.location.href = '{url_for("main.index")}';
            </script>
            """
        else:
            # 이미 소셜로 연동된 평범한 유저라면 조용히 메인으로 전달
            flash(f"{user.nickname}님, 어서오세요!")
            return redirect(url_for("main.index"))

    # 신규 가입자면 세션에 정보 임시 저장 후 추가 정보 폼으로 유도
    session["social_data"] = {
        "email": email,
        "name": name,
        "phone": format_phone_number(phone),
        "provider": "naver"
    }

    return render_template("auth/signup.html", form_data={}, show_social_form=True, social_data=session["social_data"])


######### [소셜 로그인] 카카오 로그인 연동 #########

@bp.route("/login/kakao")
def login_kakao():
    client_id = os.getenv("MY_KAKAO_KEY")
    redirect_uri = "http://127.0.0.1:5000/auth/kakao/callback"

    if not client_id:
        flash("카카오 로그인 키가 설정되지 않았습니다. 관리자에게 문의하세요.")
        return redirect(url_for("auth.login"))

    url = f"https://kauth.kakao.com/oauth/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}"
    return redirect(url)

@bp.route("/kakao/callback")
def callback_kakao():
    code = request.args.get("code")
    client_id = os.getenv("MY_KAKAO_KEY")
    client_secret = os.getenv("MY_KAKAO_SECRET")

    redirect_uri = "http://127.0.0.1:5000/auth/kakao/callback"

    # 인증 코드로 액세스 토큰 발급 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code
    }
    token_res = requests.post(token_url, data=data).json()
    access_token = token_res.get("access_token")

    if not access_token:
        flash("카카오 로그인에 실패했습니다.")
        return redirect(url_for("auth.login"))

    # 액세스 토큰으로 사용자 정보 요청
    headers = {"Authorization": f"Bearer {access_token}"}
    info_res = requests.get("https://kapi.kakao.com/v2/user/me", headers=headers).json()

    kakao_id = info_res.get("id")
    kakao_account = info_res.get("kakao_account", {})

    email = kakao_account.get("email")

    # 카카오 가입 시 이메일이 없을 경우가 있기 때문에 가짜 이메일 생성
    if not email:
        email = f"kakao_{kakao_id}@everytriplog.local"

    # 카카오 프로필에서 이름/닉네임 가져오기 (권한 설정에 따라 다를 수 있음)
    profile = kakao_account.get("profile", {})
    name = kakao_account.get("name") or profile.get("nickname")

    phone = kakao_account.get("phone_number") # +82 10-0000-0000 형태로 넘어옴

    if phone and phone.startswith("+82 "):
        phone = "0" + phone[4:] # 010-0000-0000 형태로 변환

    # 기존 가입자인지 확인
    user = User.query.filter_by(email=email).first()
    if user:

        if user.status == 'banned' or user.is_banned:
            return f"<script>alert('영구 정지된 계정입니다.'); window.location.href='{url_for('auth.login')}';</script>"

        if user.is_suspended():
            unlock_time = user.suspended_until.strftime('%Y-%m-%d %H:%M')
            return f"<script>alert('정지된 계정입니다.\\n해제 일시: {unlock_time}'); window.location.href='{url_for('auth.login')}';</script>"

        # 정지 기간 종료 시 자동 해제
        if user.status == 'suspended' and not user.is_suspended():
            user.status = 'active'
            user.suspended_until = None
            db.session.commit()

        session.clear()
        session.permanent = True
        session["user_id"] = user.id

        # 가입 출처(provider)가 'local'일 때만 계정 통합 안내 팝업
        if user.provider == 'local':
            user.provider = 'kakao' # 다음번 로그인부터는 팝업이 안 뜨도록 출처 업데이트
            db.session.commit()
            return f"""
            <script>
                alert("기존 이메일로 가입한 정보가 확인되었습니다.\\n네이버 간편 로그인과 안전하게 통합합니다.\\n환영합니다, {user.nickname}님!");
                window.location.href = '{url_for("main.index")}';
            </script>
            """
        else:
            # 이미 소셜로 연동된 평범한 유저라면 조용히 메인으로 전달
            flash(f"{user.nickname}님, 어서오세요!")
            return redirect(url_for("main.index"))

    session["social_data"] = {
        "email": email,
        "name": name if name else "카카오유저",
        "phone": format_phone_number(phone),
        "provider": "kakao"
    }

    return render_template("auth/signup.html", form_data={}, show_social_form=True, social_data=session["social_data"])


######### [소셜 로그인] 추가 정보 입력 후 최종 가입 #########

@bp.route("/social-signup", methods=["POST"])
def social_signup():
    social_data = session.get("social_data")
    if not social_data:
        flash("소셜 가입 정보가 만료되었습니다. 다시 로그인해주세요.")
        return redirect(url_for("auth.login"))

    nickname = request.form.get("social_nickname", "").strip()
    raw_phone = request.form.get("social_phone", "")
    phone_number = format_phone_number(raw_phone)

    # 서버 단 중복 이중 검사
    if User.query.filter_by(nickname=nickname).first():
        flash("이미 존재하는 닉네임입니다.")
        return render_template("auth/signup.html", form_data={}, show_social_form=True, social_data=social_data)

    if User.query.filter_by(phone_number=phone_number).first():
        flash("이미 존재하는 전화번호입니다.")
        return render_template("auth/signup.html", form_data={}, show_social_form=True, social_data=social_data)

    # 임의의 강력한 비밀번호 생성 (소셜 로그인 유저는 비밀번호 입력 로그인을 사용하지 않음)
    random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=20))

    new_user = User(
        username=social_data["name"],
        nickname=nickname,
        email=social_data["email"],
        phone_number=phone_number,
        provider=social_data["provider"]
    )
    new_user.set_password(random_password)

    db.session.add(new_user)
    db.session.commit()

    session.pop("social_data", None)
    flash(f"{nickname}님, 회원가입이 완료되었습니다! 다시 로그인해주세요.")
    return redirect(url_for("auth.login"))

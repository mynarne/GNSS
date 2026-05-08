### gnss_app 패키지 초기화, 블루프린트 모음집

import os
from dotenv import load_dotenv

from datetime import datetime, timezone, timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_mail import Mail

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()

load_dotenv()


def create_app():
    app = Flask(__name__)

    # config.py 내부 설정을 앱에 적용
    app.config.from_object('config.Config')

    # DB 초기화
    db.init_app(app)
    migrate.init_app(app, db)

    # 메일 서버 설정
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv('MY_GOOGLE_ACCOUNT')
    app.config['MAIL_PASSWORD'] = os.getenv('MY_GOOGLE_PASSOWRD') # 구글 앱 비밀번호
    app.config['MAIL_DEFAULT_SENDER'] = 'EveryTripLog' + os.getenv('MY_GOOGLE_ACCOUNT')

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-key-for-dev')

    mail.init_app(app)

    # 모델 임포트 (마이그레이션 시 테이블을 인식하도록 하기 위함)
    with app.app_context():
        from gnss_app.models import user, travel, trajectory, visit_log

    # 뷰 블루프린트 등록
    from gnss_app.views import location_view, auth_view, group_view, trajectory_view, admin_view, map_view, plan_view, main_view, mypage_view

    app.register_blueprint(location_view.bp)
    app.register_blueprint(auth_view.bp)
    app.register_blueprint(group_view.bp)
    app.register_blueprint(trajectory_view.bp)
    app.register_blueprint(admin_view.bp)
    app.register_blueprint(map_view.bp)
    app.register_blueprint(plan_view.bp)
    app.register_blueprint(main_view.bp)
    app.register_blueprint(mypage_view.bp)

    # 세션 만료 시간 설정 (예시: 30일 동안 자동 로그인 유지)
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

    return app

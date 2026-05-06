### gnss_app 패키지 초기화, 블루프린트 모음집

from datetime import datetime, timezone, timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    # config.py 내부 설정을 앱에 적용
    app.config.from_object('config.Config')

    # DB 초기화
    db.init_app(app)
    migrate.init_app(app, db)

    # 모델 임포트 (마이그레이션 시 테이블을 인식하도록 하기 위함)
    with app.app_context():
        from gnss_app.models import user, travel, trajectory, visit_log

    # 뷰 블루프린트 등록
    from gnss_app.views import location_view, auth_view, group_view

    app.register_blueprint(location_view.bp)
    app.register_blueprint(auth_view.bp)
    app.register_blueprint(group_view.bp)

    # 세션 만료 시간 설정 (예시: 30일 동안 자동 로그인 유지)
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

    return app

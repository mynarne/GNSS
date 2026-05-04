### gnss_app 패키지 초기화, 블루프린트 모음집

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
    from gnss_app.models import user, travel, trajectory

    # 뷰 블루프린트 등록
    from gnss_app.views import location_view, auth_view, group_view

    app.register_blueprint(location_view.bp)
    app.register_blueprint(auth_view.bp)
    app.register_blueprint(group_view.bp)


    return app

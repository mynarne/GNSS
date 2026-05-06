### 사용자 정보 테이블

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta

# SQLAlchemy 인스턴스를 __init__.py로부터 가져오는 대신 모델 내부에서 선언하여 순환 참조 방지
from gnss_app import create_app

# 앱 컨텍스트를 활용하거나 db 객체를 직접 연결하지 않도록 SQLAlchemy 선언
# 간편하게 __init__.py에 선언된 db 객체를 안전하게 불러오는 방법
from gnss_app import db

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False, info={'name': 'uq_user_phone'})
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=get_kst_now)

    # 1년 휴면 처리 및 탈퇴 유예 상태 컬럼 추가
    status = db.Column(db.String(20), default='active') # active, dormant, pending_delete
    deactived_at = db.Column(db.DateTime, nullable=True)

    # 유저가 남긴 모든 방문 기록
    logs = db.relationship('VisitLog', backref='author', lazy=True)

    # 비밀번호 설정 (암호화)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # 비밀번호 확인
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

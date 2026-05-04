### 사용자의 과거 위치 이동 기록 저장용 테이블

from .user import db
from datetime import datetime, timezone, timedelta

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

class Trajectory(db.Model):
    __tablename__ = 'trajectories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # GNSS로부터 받은 좌표 데이터
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    altitude = db.Column(db.Float, nullable=True) # 정확한 정보를 얻기 위한 고도 정보
    speed = db.Column(db.Float, nullable=True)    # 이동 속도

    # 데이터가 기록된 시간
    timestamp = db.Column(db.DateTime, default=get_kst_now, index=True)

    # 어떤 유저의 경로인지 연결
    user = db.relationship('User', backref=db.backref('trajectories', lazy='dynamic'))

    def __repr__(self):
        return f'<Trajectory {self.user_id} at {self.timestamp}>'

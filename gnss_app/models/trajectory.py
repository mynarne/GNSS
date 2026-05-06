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
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # 방 단위 경로 기록

    # GNSS로부터 받은 좌표 데이터
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    # 데이터가 기록된 시간
    recorded_at = db.Column(db.DateTime, default=get_kst_now, index=True)

    # 어떤 유저의 경로인지 연결
    user = db.relationship('User', foreign_keys=[user_id])

    def __repr__(self):
        return f'<Trajectory {self.user_id} at {self.recorded_at}>'

### 순수 방문 인증 로그 테이블

from datetime import datetime, timezone, timedelta
from gnss_app import db

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

class VisitLog(db.Model):
    __tablename__ = 'visit_logs'

    id = db.Column(db.Integer, primary_key=True)

    # 외래키 연결: users 테이블과 groups 테이블 참조
    # 문자열로 지정하면 파이썬 파일 간 순환 참조(Circular Import) 에러 방지 가능
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # None이면 개인 기록

    # 위치 정보 및 장소
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    visited_at = db.Column(db.DateTime, default=get_kst_now)

    # 방별 닉네임 저장 컬럼
    room_nickname = db.Column(db.String(80), nullable=False)

    photo_url = db.Column(db.String(500))  # 사진 경로
    place_name = db.Column(db.String(200)) # 장소 이름
    is_verified = db.Column(db.Boolean, default=False) # repr 에러 방지용

    def __repr__(self):
        return f'<VisitLog User:{self.user_id} Group:{self.group_id} Verified:{self.is_verified}>'

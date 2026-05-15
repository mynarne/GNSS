# gnss_app/models/visit_log.py
from datetime import datetime, timezone, timedelta
from gnss_app import db

# KST(한국 표준시) 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

class VisitLog(db.Model):
    __tablename__ = 'visit_logs'

    id = db.Column(db.Integer, primary_key=True)

    # 외래키 연결: users 테이블과 groups 테이블 참조
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # None이면 개인 기록

    # 위치 정보 및 장소
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    visited_at = db.Column(db.DateTime, default=get_kst_now)

    # 방별 닉네임 저장 컬럼
    room_nickname = db.Column(db.String(80), nullable=False)

    photo_url = db.Column(db.String(500))  # 기존 단일 사진 경로 유지
    place_name = db.Column(db.String(200)) # 장소 이름
    is_verified = db.Column(db.Boolean, default=False) 

    # 1:N 관계 설정: 방문 기록 하나에 여러 장의 사진 연결
    photos = db.relationship('Photo', backref='visit_log_ref', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<VisitLog User:{self.user_id} Group:{self.group_id} Verified:{self.is_verified}>'

# 다중 사진, 썸네일 지정, CNN 이미지 분류 결과를 담을 테이블
class Photo(db.Model):
    __tablename__ = 'photos'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # 외래키 연결: visit_logs 테이블의 id를 참조
    visit_log_id = db.Column(db.Integer, db.ForeignKey('visit_logs.id'), nullable=False)
    
    # 서버 내 사진이 저장된 실제 경로
    photo_url = db.Column(db.String(500), nullable=False)
    
    # CNN 딥러닝 모델로 분석한 이미지의 카테고리 (예: 풍경, 음식, 인물 등)
    category = db.Column(db.String(50))
    
    # 지도 위에 썸네일로 띄워줄 대표 이미지 여부
    is_representative = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Photo ID:{self.id} VisitLog:{self.visit_log_id} Rep:{self.is_representative}>'
### 그룹 및 방문 기록 테이블

from webbrowser import get

from .user import db
from datetime import datetime, timezone, timedelta

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)


class Group(db.Model):
    __tablename__ = 'groups'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # 예: '우리가족', '내 친구들', '연인이랑' 등
    group_type = db.Column(db.String(20)) # individual, couple, family, friends
    invite_code = db.Column(db.String(10), unique=True) # 초대 코드
    created_at = db.Column(db.DateTime, default=get_kst_now)


class GroupMember(db.Model):
    __tablename__ = 'group_members'

    # 두 개의 외래키를 복합 기본키로 설정
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), primary_key=True)

    # 방마다 다르게 설정할 닉네임
    room_nickname = db.Column(db.String(50), nullable=False)
    joined_at = db.Column(db.DateTime, default=get_kst_now)

    # 유저와 그룹 간의 관계 설정 (back_poppulates를 사용하여 양방향으로 묶어줌)
    user = db.relationship("User", backref=db.backref("memberships", cascade="all, delete-orphan"))
    group = db.relationship("Group", backref=db.backref("memberships", cascade="all, delete-orphan"))


class VisitLog(db.Model):
    __tablename__ = 'visit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # None이면 개인 기록

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    place_name = db.Column(db.String(200))
    photo_url = db.Column(db.String(500)) # 오라클 클라우드 스토리지 주소

    is_verified = db.Column(db.Boolean, default=False) # 알고리즘 검증 여부
    created_at = db.Column(db.DateTime, default=get_kst_now)

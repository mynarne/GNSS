### 그룹 및 방문 기록 테이블

from webbrowser import get

from .user import db
from datetime import datetime, timezone, timedelta

# KST 반환 함수
def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)


# 그룹 테이블
class Group(db.Model):
    __tablename__ = 'groups'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # 예: '우리가족', '내 친구들', '연인이랑' 등
    group_type = db.Column(db.String(20)) # individual, couple, family, friends
    invite_code = db.Column(db.String(10), unique=True) # 초대 코드
    max_members = db.Column(db.Integer, default=10, nullable=False) # 그룹 인원 수 제한
    created_at = db.Column(db.DateTime, default=get_kst_now)


# 그룹 내 멤버 테이블
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

# 기존 방문 기록 로그 저장 테이블
# class VisitLog(db.Model):
#     __tablename__ = 'visit_logs'

#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
#     group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # None이면 개인 기록

#     latitude = db.Column(db.Float, nullable=False)
#     longitude = db.Column(db.Float, nullable=False)
#     place_name = db.Column(db.String(200))
#     photo_url = db.Column(db.String(500)) # 오라클 클라우드 스토리지 주소

#     is_verified = db.Column(db.Boolean, default=False) # 알고리즘 검증 여부
#     created_at = db.Column(db.DateTime, default=get_kst_now)


# 여행 계획 틀 테이블
class TravelPlan(db.Model):
    __tablename__ = 'travel_plans'

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False) # 여행 제목
    start_date = db.Column(db.Date) # 여행 시작일
    end_date = db.Column(db.Date)   # 여행 종료일
    created_at = db.Column(db.DateTime, default=get_kst_now)

    # 그룹과의 관계 설정
    group = db.relationship("Group", backref=db.backref("plans", cascade="all, delete-orphan"))


# 상세 n일 차 방문 장소 테이블 (AI 추천 동선 및 유저 계획 저장 목적)
class PlanItem(db.Model):
    __tablename__ = 'plan_items'

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('travel_plans.id'), nullable=False)

    day_number = db.Column(db.Integer, default=1, nullable=False) # 1일차, 2일차...
    visit_order = db.Column(db.Integer, nullable=False)           # 방문 순서 (1, 2, 3...)

    place_name = db.Column(db.String(200), nullable=False)        # 유저가 입력한 지명
    memo = db.Column(db.Text)                                     # 해당 장소에서 할 내용 등의 간단한 메모

    # AI가 지명을 기반으로 찾아줄 좌표 (지도 표시용)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    # 이 동선이 AI가 짜준 건지, 유저가 직접 넣은 건지 구분 (나중에 확장성용)
    is_ai_recommended = db.Column(db.Boolean, default=False)

    plan = db.relationship("TravelPlan", backref=db.backref("items", cascade="all, delete-orphan", order_by="PlanItem.visit_order"))

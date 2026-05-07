### 1:1 문의 모델


from .user import db
from datetime import datetime, timezone, timedelta

def get_kst_now():
    kst = timezone(timedelta(hours=9))
    return datetime.now(kst)

class Inquiry(db.Model):
    __tablename__ = 'inquiries'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_answered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_kst_now)

    user = db.relationship('User', backref=db.backref('inquiries', lazy=True, cascade="all, delete-orphan"))

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(__file__)

# 기본 설정 클래스
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or '1q2w3e4r!!'

    # SQLAlchemy가 사용할 DB 경로 (기본적으로 SQLite를 사용)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///gnss_project.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DEBUG = True
    TESTING = False

# 개발 환경 설정
class DevelopmentConfig(Config):
    DEBUG = True

# 운영 환경 설정
class ProductionConfig(Config):
    DEBUG = False

# EveryTripLog

---

> Flask 및 GNSS(위성 기반 위치 검증) 알고리즘을 활용한 여행지 기록용 프로그램

---

## 이게 뭔가요?
개인 및 단체(친구, 가족, 연인)가 함께 다녀온 여행지를 지도 위에 안전하게 기록할 수 있는 애플리케이션입니다
<br>
안전한 알고리즘을 통해 검증된 위치 데이터를 기반으로 추억을 방(그룹) 단위로 나누어 공유할 수 있습니다

---

## 기술 스택

### Backend
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white">
<img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white">

### Database
<img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white">
<img src="https://img.shields.io/badge/Flask%20SQLAlchemy-07405E?style=for-the-badge&logo=sqlalchemy&logoColor=white">

### Version Control
<img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white">


---

## 주요 기능 (beta test)
- **방별 닉네임 관리**: 개인, 커플, 가족, 친구 등 모임마다 원하는 닉네임을 설정할 수 있습니다.
- **방문 인증 (VisitLog)**: 검증된 위치와 사진을 함께 남겨 지도에 표시합니다.
- **실시간 궤적 저장**: GNSS 기반의 이동 궤적 데이터를 차곡차곡 쌓아 나만의 발자취를 추적합니다.
- **확장성**: 상용화 단계에서는 소규모 프로젝트용인 Flask를 넘어 다른 웹프레임워크로의 전환을 고려하고 있습니다.

---

## 작업 진행 로드맵 (26.05.06 BETA_VER_0.1)

<details>
  
### EveryTripLog 프로젝트 작업 로드맵

#### 1. 프로젝트 초기 기획 및 인프라 설정
- 여행 로그 및 위치 정보 시스템 기획

- 사용자 이동 경로(Trajectory)와 위치 기반 방문 인증(VisitLog)을 처리하는 핵심 모델 설계

- 프로젝트 환경 세팅

- Flask, SQLAlchemy 기반의 ORM 설정 및 데이터베이스 마이그레이션 체계 구축

#### 2. 위치 정보 및 경로 추적 기능 구현
- 경로 기록 및 데이터베이스 연동

- 위도, 경도, 그룹 ID(group_id), 기록 시간(recorded_at)을 저장하는 API 및 로직 구현

- 데이터베이스 제약 조건 및 마이그레이션 최적화

- 외래키(ForeignKey) 충돌 및 Alembic 마이그레이션 에러 해결

#### 3. 그룹 및 사용자 관리 기능 구축
- 그룹(방) 및 사용자 매핑

- 다대다(N:N) 관계를 통한 그룹 멤버 관리 및 방별 닉네임 설정 기능 구현

#### 4. 관리자 대시보드 및 모니터링 고도화
- 관리자 뷰(admin_view.py) 및 대시보드 템플릿 구현

- 총 유저 수, 생성된 방 개수, 최근 이동 경로 로그 모니터링 기능 구축

- 그룹 상세 보기 페이지 구현

- 방을 클릭하여 참여 중인 멤버와 닉네임을 조회하는 상세 보기 기능 추가

</details>

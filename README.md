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

### 현재 구현 내용 (26.05.06 BETA_VER_0.1)

## 사용자 인증 (Auth) 로직 고도화

- 이메일 및 전화번호 인증 시 3분 유효시간 적용

- 인증 절차와 목적에 따른 세션 처리 파이프라인 완성

- 1년 휴면 계정 및 30일 탈퇴 유예 기간 정책을 위한 User 모델 컬럼 추가

## 그룹 (Group) 관련 로직 완성

- group_view.py 블루프린트 등록 완료

- 그룹 생성(create), 방 입장 시 최대 인원 검증 및 초대 코드 검증

- 방 안에서 개별적으로 사용하는 닉네임(room_nickname) 설정 및 변경 API 구현 완료

- 방 정보(이름, 최대 인원수) 변경 API 구현

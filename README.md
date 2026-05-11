# EveryTripLog

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

## 작업 진행 로드맵

<details>
<summary>살펴보기</summary>

### EveryTripLog 프로젝트 작업 로드맵 (26.05.08 업데이트)

> 26.05.06

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

---

> 26.05.07  금일 완료된 작업 (Milestone: UI/UX 고도화 및 인증 시스템 구축)

#### 1. 프론트엔드 아키텍처 재설계
- 관심사 분리 (Separation of Concerns): 모든 HTML 내 인라인 스타일(Inline Style) 및 스크립트를 제거하고 전용 CSS/JS 파일로 완전히 분리하여 유지보수성 향상

- 디자인 시스템 구축: Sky-Blue & White 테마를 기반으로 한 EveryTripLog 전용 디자인 가이드 적용

- 단위 표준화: 가독성과 정밀한 레이아웃 제어를 위해 모든 스타일 단위를 px로 통일

- 컴포넌트화: header.html, footer.html을 공용 컴포넌트로 분리하여 레이아웃 재사용성 확보

#### 2. 사용자 인증 및 회원 관리 (Auth & User)
- 이메일 기반 로그인 시스템: 기존 사용자 이름 방식에서 이메일 기반 로그인 체계로 전환하여 범용성 확보

- 회원가입 기능 강화: 이메일, 사용자 이름, 비밀번호, 연락처를 포함한 신규 가입 폼 구현

- 웹/앱 하이브리드 대응: 동일 라우터에서 브라우저 요청(HTML)과 앱 요청(JSON)을 구분하여 처리하는 로직 구현

- 마이페이지(MyPage): * 사용자 정보(이름, 연락처) 수정 기능 구현

- 1:1 문의하기 기능 및 본인 문의 내역 리스트 연동

#### 3. 관리자 시스템 (Admin Dashboard)
- 통계 시각화: 전체 유저 수, 활성 그룹 수, 미처리 문의 건수를 한눈에 확인 가능한 대시보드 구축

- 데이터 모니터링: 최근 이동 경로(Trajectory) 및 그룹별 상세 멤버 정보를 관리자 전용 뷰로 구현

- 문의 관리: 사용자들의 1:1 문의를 관리자가 모아볼 수 있는 인벤토리 시스템 구축

#### 4. UI/UX 개선 및 버그 수정
- 인터랙션 최적화: 폼 입력창 등 정적인 요소에서 불필요한 호버(Hover) 애니메이션을 제거하여 사용자 피로도 감소

- 여백 설계: 콘텐츠 가독성을 높이기 위해 본문 및 푸터 영역의 패딩(Padding)과 마진(Margin)을 재설계

- 사용자 피드백: 비로그인 접근 시 토스트 알림을 통한 안내 및 로그인 페이지 리다이렉트 로직 정상화

##### 추후 업데이트 예정
###### 향후 추진 계획 (Upcoming)
- AI 위치 정보 변환: 사용자가 입력한 지명을 좌표(위도/경도)로 자동 변환하는 Gemini API 연동

- 실시간 경로 시각화: 실제 수집된 GNSS 데이터를 Google Maps API Polyline으로 매핑하여 동선 시각화 고도화

- 관리자 답변 시스템: 1:1 문의에 대한 관리자 답변 기능 및 상태 업데이트 로직 추가

- React Native 연동: 모바일 앱 환경과의 데이터 동기화를 위한 REST API 최적화

---

> 26.05.08  금일 완료된 작업

#### 1. 인증 및 보안 시스템 고도화 (Auth & Security)
- 비동기 실시간 검증 도입 (AJAX/Fetch): 회원가입 시 이메일 및 닉네임 중복 여부를 폼 제출 전에 실시간으로 검사하고 피드백을 제공하도록 UI/UX 개선

- 이메일 본인 인증 시스템 구축: Flask-Mail을 활용하여 6자리 난수 인증번호 발송 및 검증 로직 구현. .env를 통한 구글 앱 비밀번호 환경변수 관리로 보안 강화

- 도메인 필터링 방어막: test.com, example.com 등 일회성 및 테스트용 이메일 도메인 가입 원천 차단 로직 적용

- 비밀번호 복잡도 검증: 프론트엔드 및 백엔드 양단에서 영문, 숫자, 특수기호 포함 8~16자 조건을 강제하여 계정 보안성 향상

- 전화번호 데이터 정제: 프론트엔드 자동 하이픈(-) 입력 스크립트 적용 및 백엔드 포맷팅 방어 로직 추가

#### 2. 아키텍처 및 라우터 분리 (Architecture & Routing)
- 관심사 분리 (Separation of Concerns): * auth_view.py에 혼재되어 있던 마이페이지 로직을 mypage_view.py로 완전 분리하고 Blueprint 맵핑 완료

- API 통신용 라우터(/check-email, /send-verification 등)와 웹 폼 제출용 라우터(/signup)를 분리하여 데이터 처리 흐름 명확화

- 스타일시트(CSS) 모듈화: common.css에 집중되어 있던 스타일을 header.css, footer.css, auth.css, mypage.css, admin.css로 분할하여 유지보수성 극대화

#### 3. 데이터베이스 모델 및 ORM 개선 (Database & Models)
- User 모델 확장: * 커뮤니티 활동을 위한 중복 불가 nickname 필드 추가

- 향후 소셜 로그인(OAuth) 연동을 대비한 provider 필드 추가

- 마이그레이션 오류 방지를 위해 전화번호 unique 제약조건 명명 (info={'name': 'uq_user_phone'})

- ORM 관계 충돌(SAWarning) 해결: User와 Trajectory 간의 양방향 관계 설정 시 발생하는 중복 복사 경고를 overlaps="trajectories,user_owner" 속성으로 완벽히 해결

- 1:1 문의(Inquiry) 관리 고도화: 관리자 답변 등록을 위한 answer, is_answered, answered_at 컬럼 추가 설계

#### 4. UI/UX 디테일 개선 (Frontend)
- 관리자 대시보드(Admin) 독립성 확보: base.html의 블록 상속({% block header %})을 활용하여 관리자 페이지 진입 시 불필요한 네비게이션 및 푸터를 숨기고 '메인으로 돌아가기' 버튼 배치

- 인증 폼 애니메이션 제어: 로그인 및 회원가입 시 카드 컴포넌트의 과도한 호버(Hover) 애니메이션을 제어하여 입력 집중도 향상

- 에러 발생 시 데이터 유지: 폼 제출 시 백엔드 검증에서 반려되더라도 기존에 입력했던 데이터가 날아가지 않도록 세션 폼 데이터 바인딩 적용

---

> 26.05.09  금일 완료된 작업

#### 1. 회원가입 검증 로직 추가
- 디바운스 함수 적용하여 실시간 검증 로직 기능 추가

- 비정상 도메인 입력 시 에러 안내 발생

- 실제 이메일로 인증번호 발송 및 인증 로직 구현



</details>

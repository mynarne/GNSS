// auth 관련 스크립트

// 상태 관리를 위한 전역 변수 (플래그)
let isEmailVerified = false; // 공용 인증 검증 변수로 사용
let isNicknameChecked = false;
let isPhoneChecked = false;

// 소셜 폼 전역 플래그
let isSocialNicknameChecked = false;
let isSocialPhoneChecked = false;

// 타이머 변수
let verifyTimer = null;
let timeRemaining = 180;

// 폼 전환 로직
function toggleForm(type) {
    const selectArea = document.getElementById('select-area');
    const emailForm = document.getElementById('signup-form');
    const socialForm = document.getElementById('social-signup-form');

    if (!selectArea || !emailForm || !socialForm) return;

    if (type === 'email') {
        selectArea.style.display = 'none';
        emailForm.style.display = 'block';
        socialForm.style.display = 'none';
    } else if (type === 'social') {
        selectArea.style.display = 'none';
        emailForm.style.display = 'none';
        socialForm.style.display = 'block';
    } else {
        selectArea.style.display = 'block';
        emailForm.style.display = 'none';
        socialForm.style.display = 'none';
    }
}

// 백엔드 에러 발생 시 자동으로 이메일 폼 열기
document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.querySelector('.auth-wrapper');
    if (wrapper) {
        if (wrapper.getAttribute('data-show-social') === 'true') {
            toggleForm('social');
            const socialPhone = document.getElementById('social-phone');
            // 전화번호가 이미 채워져서 읽기 전용이라면 통과 플래그를 true로 변경
            if (socialPhone && socialPhone.readOnly) {
                isSocialPhoneChecked = true;
            }
        } else if (wrapper.getAttribute('data-has-error') === 'true') {
            toggleForm('email');
        }
    }
});


// 입력 지연(Debounce) 함수: 사용자가 타이핑을 멈추고 0.5초 뒤에만 검증 실행 (서버 과부하 방지)
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}


// 이메일 실시간 중복 검사 (입력 시마다 동작)
const emailInput = document.getElementById('user-email');
const emailFeedback = document.getElementById('email-feedback');

const validateEmail = debounce(async (email) => {
    // 1차 클라이언트 단 정규식 검증
    const emailRegex = /^[a-zA-Z0-9+-\_.]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email)) {
        if (emailFeedback) {
            emailFeedback.innerText = "올바른 이메일 형식을 입력해주세요!";
            emailFeedback.style.color = "#ff4d4d";
        }
        return;
    }

    // 2차 서버 단 도메인 및 중복 검증
    try {
        const response = await fetch('/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await response.json();

        if (emailFeedback) {
            emailFeedback.innerText = data.message;
            emailFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
        }
    } catch (e) {
        console.error("이메일 통신 오류", e);
    }
}, 500); // 0.5초 지연

if (emailInput) {
    emailInput.addEventListener('input', async () => {
        isEmailVerified = false; // 이메일 변경 시 인증 초기화
        const email = emailInput.value;

        // 5번째 글자부터 안내 표시
        if (email.length < 5) {
            if (emailFeedback) emailFeedback.innerText = "";
            return;
        }

        try {
            const response = await fetch('/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();

            if (emailFeedback) {
                emailFeedback.innerText = data.message;
                emailFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
            }
        } catch (e) {
            console.error("이메일 체크 오류", e);
        }
    });
}

// 통합 인증번호 발송 (기존 sendEmailCode 대체)
async function requestVerifyCode(type, inputId, purpose, sectionId, btnObj) {
    const targetInput = document.getElementById(inputId);
    if (!targetInput || !targetInput.value) {
        showToast((type === 'email' ? "이메일을" : "연락처를") + " 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/request-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, value: targetInput.value, purpose: purpose })
        });
        const data = await response.json();
        showToast(data.message);

        if (data.status === 'success') {
            const verifySection = document.getElementById(sectionId);
            if (verifySection) verifySection.style.display = 'block';

            if (btnObj) btnObj.innerText = "재요청";

            startTimer(sectionId);
        }
    } catch (error) {
        showToast("인증 발송 중 서버 오류가 발생했습니다.");
    }
}

// 통합 인증번호 확인 (기존 verifyCode 대체)
async function verifyAuthCode(targetInputId, codeInputId, feedbackId, sectionId) {
    const targetInput = document.getElementById(targetInputId);
    const codeInput = document.getElementById(codeInputId);
    const feedback = document.getElementById(feedbackId);

    if (!codeInput || !codeInput.value) {
        showToast("인증번호를 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeInput.value, value: targetInput.value })
        });
        const data = await response.json();

        if (feedback) {
            feedback.innerText = data.message;
            feedback.style.color = (data.status === 'success') ? "#4d94ff" : "#ff4d4d";
        } else {
            showToast(data.message);
        }

        if (data.status === 'success') {
            isEmailVerified = true;
            if (targetInput) targetInput.readOnly = true;
            codeInput.readOnly = true;
            clearInterval(verifyTimer); // 인증 성공 시 타이머 정지

            // 확인, 연장 버튼 숨기거나 비활성화
            const section = document.getElementById(sectionId);
            if (section) {
                const btnConfirm = section.querySelector('.btn-auth-confirm');
                const btnExtend = section.querySelector('.btn-extend-time');
                if (btnConfirm) btnConfirm.disabled = true;
                if (btnExtend) btnExtend.disabled = true;
            }

            // 행님 요청: 인증 완료 시 '재요청(인증하기)' 버튼도 비활성화
            // targetInput의 부모(input-group) 안에 있는 btn-auth-action 버튼을 찾아 비활성화
            if (targetInput) {
                const requestBtn = targetInput.parentElement.querySelector('.btn-auth-action');
                if (requestBtn) {
                    requestBtn.disabled = true;
                    requestBtn.innerText = "인증완료";
                }
            }
        }
    } catch (error) {
        showToast("인증 확인 중 서버 오류가 발생했습니다.");
    }
}

// 타이머 함수
function startTimer(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const timerDisplay = section.querySelector('.timer-display');
    const codeInput = section.querySelector('.verify-code-input');
    const confirmBtn = section.querySelector('.btn-auth-confirm');
    const extendBtn = section.querySelector('.btn-extend-time');
    const feedback = section.querySelector('.verify-feedback-msg');

    if (codeInput) codeInput.disabled = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (extendBtn) extendBtn.disabled = false;
    if (feedback) feedback.innerText = "";

    if (verifyTimer) clearInterval(verifyTimer);
    timeRemaining = 180; // 3분

    verifyTimer = setInterval(() => {
        const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;

        if (--timeRemaining < 0) {
            clearInterval(verifyTimer);
            if (timerDisplay) timerDisplay.textContent = "00:00";
            if (codeInput) codeInput.disabled = true;
            if (confirmBtn) confirmBtn.disabled = true;
            if (extendBtn) extendBtn.disabled = true;
            if (feedback) {
                feedback.innerText = "인증 시간이 초과되었습니다. 재요청해주세요.";
                feedback.style.color = "#ff4d4d";
            }
            alert("요청시간이 만료되었습니다. 인증번호를 다시 요청해주세요.");
        }
    }, 1000);
}

// 시간 연장
function extendVerifyTime(sectionId) {
    fetch('/auth/extend-verify-time', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            const section = document.getElementById(sectionId);
            const feedback = section ? section.querySelector('.verify-feedback-msg') : null;

            if (data.status === 'success') {
                startTimer(sectionId);
                if (feedback) {
                    feedback.innerText = data.message;
                    feedback.style.color = "#4d94ff";
                }
            } else {
                if (feedback) {
                    feedback.innerText = data.message;
                    feedback.style.color = "#ff4d4d";
                }
            }
        }).catch(e => console.error('Error:', e));
}


// 닉네임 중복 체크 버튼
const nicknameInput = document.getElementById('user-nickname');
const nicknameFeedback = document.getElementById('nickname-feedback');

async function checkNickname() {
    if (!nicknameInput || !nicknameInput.value) {
        showToast("닉네임을 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/check-nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nicknameInput.value })
        });
        const data = await response.json();

        if (nicknameFeedback) {
            nicknameFeedback.innerText = data.message;
            nicknameFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
        }

        if (data.status === 'available') {
            isNicknameChecked = true;
        }
    } catch (error) {
        showToast("닉네임 확인 중 서버 오류가 발생했습니다.");
    }
}

// 닉네임 변경 시 플래그 초기화
if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
        isNicknameChecked = false;
        if (nicknameFeedback) nicknameFeedback.innerText = "";
    });
}


// 비밀번호 복잡도 실시간 검사
const passwordInput = document.getElementById('user-password');
const passwordFeedback = document.getElementById('password-feedback');

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

        if (password.length === 0) {
            if (passwordFeedback) passwordFeedback.innerText = "";
        } else if (!regex.test(password)) {
            if (passwordFeedback) {
                passwordFeedback.innerText = "영문, 숫자, 특수기호를 포함해 8 ~ 16자로 입력해주세요.";
                passwordFeedback.style.color = "#ff4d4d";
            }
        } else {
            if (passwordFeedback) {
                passwordFeedback.innerText = "사용 가능한 안전한 비밀번호입니다.";
                passwordFeedback.style.color = "#4d94ff";
            }
        }

        checkPasswordMatch();
    });
}


// 비밀번호 확인 일치 실시간 검사
const passwordConfirmInput = document.getElementById('user-password-confirm');
const passwordConfirmFeedback = document.getElementById('password-confirm-feedback');

function checkPasswordMatch() {
    if (!passwordConfirmInput || passwordConfirmInput.value.length === 0) {
        if (passwordConfirmFeedback) passwordConfirmFeedback.innerText = "";
        return;
    }

    if (passwordInput && passwordInput.value === passwordConfirmInput.value) {
        if (passwordConfirmFeedback) {
            passwordConfirmFeedback.innerText = "비밀번호가 일치합니다.";
            passwordConfirmFeedback.style.color = "#4d94ff";
        }
    } else {
        if (passwordConfirmFeedback) {
            passwordConfirmFeedback.innerText = "비밀번호가 일치하지 않습니다.";
            passwordConfirmFeedback.style.color = "#ff4d4d";
        }
    }
}

if (passwordConfirmInput) {
    passwordConfirmInput.addEventListener('input', checkPasswordMatch);
}


// 전화번호 실시간 중복 검사 (디바운싱 적용)
const phoneInput = document.getElementById('user-phone');
const phoneFeedback = document.getElementById('phone-feedback');

const validatePhone = debounce(async (phone) => {
    try {
        const response = await fetch('/auth/check-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        const data = await response.json();

        if (phoneFeedback) {
            phoneFeedback.innerText = data.message;
            if (data.status === 'exists' || data.status === 'error') {
                phoneFeedback.style.color = "#ff4d4d";
                isPhoneChecked = false;
            } else {
                phoneFeedback.style.color = "#4d94ff";
                isPhoneChecked = true;
            }
        }
    } catch (e) {
        console.error("전화번호 체크 오류", e);
    }
}, 500);

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        isPhoneChecked = false;
        const phone = phoneInput.value;

        // 12자리 미만(ex: 010-123-456)일 때는 피드백 제거
        if (phone.length < 12) {
            if (phoneFeedback) phoneFeedback.innerText = "";
            return;
        }
        validatePhone(phone);
    });
}


// 가입 전 폼 전송 차단 (조건 불만족 시)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        const password = passwordInput ? passwordInput.value : '';
        const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value : '';
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

        if (!isEmailVerified) {
            e.preventDefault();
            showToast("본인 인증을 완료해주세요!");
            return;
        }

        if (!isNicknameChecked) {
            e.preventDefault();
            showToast("닉네임 중복 확인을 진행해주세요!");
            if (nicknameInput) nicknameInput.focus();
            return;
        }

        if (!regex.test(password)) {
            e.preventDefault();
            showToast("비밀번호 조건을 만족하지 않습니다!");
            if (passwordInput) passwordInput.focus();
            return;
        }

        if (password !== passwordConfirm) {
            e.preventDefault();
            showToast("비밀번호가 서로 일치하지 않습니다!");
            if (passwordConfirmInput) passwordConfirmInput.focus();
            return;
        }

        if (!isPhoneChecked) {
            e.preventDefault();
            showToast("이미 가입된 번호이거나 연락처를 끝까지 입력해주세요!");
            if (phoneInput) phoneInput.focus();
            return;
        }
    });
}


// 소셜 가입 추가 폼 검증 로직

const socialNicknameInput = document.getElementById('social-nickname');
const socialNicknameFeedback = document.getElementById('social-nickname-feedback');

async function checkSocialNickname() {
    if (!socialNicknameInput || !socialNicknameInput.value) {
        showToast("닉네임을 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/check-nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: socialNicknameInput.value })
        });
        const data = await response.json();

        if (socialNicknameFeedback) {
            socialNicknameFeedback.innerText = data.message;
            socialNicknameFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
        }

        if (data.status === 'available') {
            isSocialNicknameChecked = true;
        }
    } catch (error) {
        showToast("닉네임 확인 중 서버 오류가 발생했습니다.");
    }
}

if (socialNicknameInput) {
    socialNicknameInput.addEventListener('input', () => {
        isSocialNicknameChecked = false;
        if (socialNicknameFeedback) socialNicknameFeedback.innerText = "";
    });
}

const socialPhoneInput = document.getElementById('social-phone');
const socialPhoneFeedback = document.getElementById('social-phone-feedback');

const validateSocialPhone = debounce(async (phone) => {
    try {
        const response = await fetch('/auth/check-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        const data = await response.json();

        if (socialPhoneFeedback) {
            socialPhoneFeedback.innerText = data.message;
            if (data.status === 'exists' || data.status === 'error') {
                socialPhoneFeedback.style.color = "#ff4d4d";
                isSocialPhoneChecked = false;
            } else {
                socialPhoneFeedback.style.color = "#4d94ff";
                isSocialPhoneChecked = true;
            }
        }
    } catch (e) {
        console.error("전화번호 체크 오류", e);
    }
}, 500);

if (socialPhoneInput) {
    socialPhoneInput.addEventListener('input', () => {
        isSocialPhoneChecked = false;
        const phone = socialPhoneInput.value;

        if (phone.length < 12) {
            if (socialPhoneFeedback) socialPhoneFeedback.innerText = "";
            return;
        }
        validateSocialPhone(phone);
    });
}

function submitSocialForm() {
    if (!isSocialNicknameChecked) {
        showToast("닉네임 중복 확인을 진행해주세요!");
        if (socialNicknameInput) socialNicknameInput.focus();
        return;
    }
    if (!isSocialPhoneChecked) {
        showToast("이미 가입된 번호이거나 올바르지 않은 연락처입니다!");
        if (socialPhoneInput) socialPhoneInput.focus();
        return;
    }

    // 검증 완료 시 실제 폼 제출
    const form = document.getElementById('social-signup-form');
    if (form) form.submit();
}


// 마이페이지 비밀번호 변경 실시간 검증 로직
const newPw = document.getElementById('new_password');
const newPwConfirm = document.getElementById('new_password_confirm');
const formatError = document.getElementById('pw-format-error');
const matchError = document.getElementById('pw-match-error');
const matchSuccess = document.getElementById('pw-match-success');
const submitBtn = document.getElementById('submitBtn');

if (newPw && newPwConfirm) {
    const pwChangeRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

    function validatePasswordChange() {
        let isValid = true;

        // 형식 검사
        if (newPw.value.length > 0 && !pwChangeRegex.test(newPw.value)) {
            if (formatError) formatError.style.display = 'block';
            isValid = false;
        } else {
            if (formatError) formatError.style.display = 'none';
        }

        // 일치 검사
        if (newPwConfirm.value.length > 0) {
            if (newPw.value !== newPwConfirm.value) {
                if (matchError) matchError.style.display = 'block';
                if (matchSuccess) matchSuccess.style.display = 'none';
                isValid = false;
            } else {
                if (matchError) matchError.style.display = 'none';
                if (matchSuccess) matchSuccess.style.display = 'block';
            }
        } else {
            if (matchError) matchError.style.display = 'none';
            if (matchSuccess) matchSuccess.style.display = 'none';
            isValid = false;
        }

        // 형식이 맞고, 서로 일치할 때만 버튼 활성화
        if (submitBtn) submitBtn.disabled = !isValid;
    }

    newPw.addEventListener('input', validatePasswordChange);
    newPwConfirm.addEventListener('input', validatePasswordChange);
}


document.addEventListener('DOMContentLoaded', function () {
    // 아이디 중복 체크 이벤트 리스너 연결
    const checkLoginIdBtn = document.getElementById('btn-check-login-id');
    if (checkLoginIdBtn) {
        checkLoginIdBtn.addEventListener('click', checkLoginId);
    }

    // 계정 찾기 탭에서 라디오 버튼 클릭 시 입력 폼 변경
    const searchTypeRadios = document.querySelectorAll('.search-type-radio');
    searchTypeRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            const target = this.getAttribute('data-target'); // 'id' 또는 'pw'
            const value = this.value; // 'email' 또는 'phone'

            const emailArea = document.getElementById(`${target}_email_input_area`);
            const phoneArea = document.getElementById(`${target}_phone_input_area`);
            const emailInput = document.getElementById(`${target}_email`);
            const phoneInput = document.getElementById(`${target}_phone`);

            // 탭 변경 시 기존 인증관련 창 숨김
            const verifySection = document.getElementById(`${target}-verify-section`);
            if (verifySection) verifySection.style.display = 'none';

            if (value === 'email') {
                if (emailArea) emailArea.style.display = 'block';
                if (phoneArea) phoneArea.style.display = 'none';
                if (phoneInput) phoneInput.value = ''; // 값 초기화
            } else {
                if (emailArea) emailArea.style.display = 'none';
                if (phoneArea) phoneArea.style.display = 'block';
                if (emailInput) emailInput.value = ''; // 값 초기화
            }
        });
    });
});

// 아이디 중복 체크 함수 로직
function checkLoginId() {
    const loginIdInput = document.getElementById('login-id');
    const feedback = document.getElementById('login-id-feedback');

    if (!loginIdInput || !feedback) return;
    const loginId = loginIdInput.value;

    if (!loginId) {
        feedback.innerText = '아이디를 입력해주세요.';
        feedback.className = 'feedback-msg text-danger';
        return;
    }

    fetch('/auth/check-login-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: loginId })
    })
        .then(response => response.json())
        .then(data => {
            feedback.innerText = data.message;
            feedback.className = data.success ? 'feedback-msg text-success' : 'feedback-msg text-danger';
        })
        .catch(error => console.error('Error:', error));
}

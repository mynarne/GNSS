// auth 관련 스크립트


// 상태 관리를 위한 전역 변수 (플래그)
let isEmailVerified = false;
let isNicknameChecked = false;
let isPhoneChecked = false;

// 소셜 폼 전역 플래그
let isSocialNicknameChecked = false;
let isSocialPhoneChecked = false;


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
        emailFeedback.innerText = "올바른 이메일 형식을 입력해주세요!";
        emailFeedback.style.color = "#ff4d4d";
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

        emailFeedback.innerText = data.message;
        emailFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
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
            emailFeedback.innerText = "";
            return;
        }

        try {
            const response = await fetch('/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();

            emailFeedback.innerText = data.message;
            emailFeedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
        } catch (e) {
            console.error("이메일 체크 오류", e);
        }
    });
}

// 인증번호 발송
async function sendEmailCode() {
    if (!emailInput || !emailInput.value) {
        showToast("이메일을 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/request-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'email', value: emailInput.value, purpose: 'signup' })
        });
        const data = await response.json();
        showToast(data.message);

        if (data.status === 'success') {
            document.getElementById('verify-section').style.display = 'block';
        }
    } catch (error) {
        showToast("인증 발송 중 서버 오류가 발생했습니다.");
    }
}


// 인증번호 확인
async function verifyCode() {
    const codeInput = document.getElementById('verify-code');
    const verifyFeedback = document.getElementById('verify-feedback');

    if (!codeInput || !codeInput.value) {
        showToast("인증번호를 입력해주세요!");
        return;
    }

    try {
        const response = await fetch('/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeInput.value, value: emailInput.value })
        });
        const data = await response.json();

        if (verifyFeedback) {
            verifyFeedback.innerText = data.message;
            verifyFeedback.style.color = (data.status === 'success') ? "#4d94ff" : "#ff4d4d";
        } else {
            showToast(data.message);
        }

        if (data.status === 'success') {
            isEmailVerified = true;
            emailInput.readOnly = true; // 이메일 수정 방지
            codeInput.readOnly = true;  // 인증번호 수정 방지
        }
    } catch (error) {
        showToast("인증 확인 중 서버 오류가 발생했습니다.");
    }
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
            passwordFeedback.innerText = "";
        } else if (!regex.test(password)) {
            passwordFeedback.innerText = "영문, 숫자, 특수기호를 포함해 8 ~ 16자로 입력해주세요.";
            passwordFeedback.style.color = "#ff4d4d";
        } else {
            passwordFeedback.innerText = "사용 가능한 안전한 비밀번호입니다.";
            passwordFeedback.style.color = "#4d94ff";
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

    if (passwordInput.value === passwordConfirmInput.value) {
        passwordConfirmFeedback.innerText = "비밀번호가 일치합니다.";
        passwordConfirmFeedback.style.color = "#4d94ff";
    } else {
        passwordConfirmFeedback.innerText = "비밀번호가 일치하지 않습니다.";
        passwordConfirmFeedback.style.color = "#ff4d4d";
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

        phoneFeedback.innerText = data.message;
        if (data.status === 'exists' || data.status === 'error') {
            phoneFeedback.style.color = "#ff4d4d";
            isPhoneChecked = false;
        } else {
            phoneFeedback.style.color = "#4d94ff";
            isPhoneChecked = true;
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
            phoneFeedback.innerText = "";
            return;
        }
        validatePhone(phone);
    });
}


// 가입 전 폼 전송 차단 (조건 불만족 시)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

        if (!isEmailVerified) {
            e.preventDefault();
            showToast("이메일 인증을 완료해주세요!");
            return;
        }

        if (!isNicknameChecked) {
            e.preventDefault();
            showToast("닉네임 중복 확인을 진행해주세요!");
            nicknameInput.focus();
            return;
        }

        if (!regex.test(password)) {
            e.preventDefault();
            showToast("비밀번호 조건을 만족하지 않습니다!");
            passwordInput.focus();
            return;
        }

        if (password !== passwordConfirm) {
            e.preventDefault();
            showToast("비밀번호가 서로 일치하지 않습니다!");
            passwordConfirmInput.focus();
            return;
        }

        if (!isPhoneChecked) {
            e.preventDefault();
            showToast("이미 가입된 번호이거나 연락처를 끝까지 입력해주세요!");
            phoneInput.focus();
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

        socialPhoneFeedback.innerText = data.message;
        if (data.status === 'exists' || data.status === 'error') {
            socialPhoneFeedback.style.color = "#ff4d4d";
            isSocialPhoneChecked = false;
        } else {
            socialPhoneFeedback.style.color = "#4d94ff";
            isSocialPhoneChecked = true;
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
            socialPhoneFeedback.innerText = "";
            return;
        }
        validateSocialPhone(phone);
    });
}

function submitSocialForm() {
    if (!isSocialNicknameChecked) {
        showToast("닉네임 중복 확인을 진행해주세요!");
        socialNicknameInput.focus();
        return;
    }
    if (!isSocialPhoneChecked) {
        showToast("이미 가입된 번호이거나 올바르지 않은 연락처입니다!");
        socialPhoneInput.focus();
        return;
    }

    // 검증 완료 시 실제 폼 제출
    document.getElementById('social-signup-form').submit();
}

// auth 관련 스크립트

// 이메일 실시간 중복 검사 (입력 시마다 동작)
const emailInput = document.getElementById('user-email');
const emailFeedback = document.getElementById('email-feedback');

emailInput.addEventListener('input', async () => {
    const email = emailInput.value;
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

        if (data.status === 'exists' || data.status === 'error') {
            emailFeedback.innerText = data.message;
            emailFeedback.style.color = "#ff4d4d"; // 빨간색
        } else {
            emailFeedback.innerText = "사용 가능한 이메일입니다.";
            emailFeedback.style.color = "#4d94ff"; // 파란색
        }
    } catch (e) {
        console.error("이메일 체크 오류", e);
    }
});

// 인증번호 발송
async function sendEmailCode() {
    const email = emailInput.value;
    if (!email) {
        showToast("이메일을 입력해주세요!");
        return;
    }

    const response = await fetch('/auth/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: email, purpose: 'signup' })
    });
    const data = await response.json();
    showToast(data.message);

    if (data.status === 'success') {
        document.getElementById('verify-section').style.display = 'block';
    }
}

// 닉네임 중복 체크 버튼
async function checkNickname() {
    const nickname = document.getElementById('user-nickname').value;
    const feedback = document.getElementById('nickname-feedback');

    if (!nickname) {
        showToast("닉네임을 입력해주세요!");
        return;
    }

    const response = await fetch('/auth/check-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname })
    });
    const data = await response.json();

    feedback.innerText = data.message;
    feedback.style.color = (data.status === 'available') ? "#4d94ff" : "#ff4d4d";
}

// 비밀번호 복잡도 실시간 검사
const passwordInput = document.getElementById('user-password');
const passwordFeedback = document.getElementById('password-feedback');

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        // 영문자, 숫자, 특수기호(@$!%*#?&) 포함 8~16자 정규표현식
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

        if (password.length === 0) {
            passwordFeedback.innerText = "";
        } else if (!regex.test(password)) {
            passwordFeedback.innerText = "영문, 숫자, 특수기호를 포함해 8~16자로 입력해주세요.";
            passwordFeedback.style.color = "#ff4d4d"; // 빨간색
        } else {
            passwordFeedback.innerText = "사용 가능한 안전한 비밀번호입니다.";
            passwordFeedback.style.color = "#4d94ff"; // 파란색
        }

        // 비밀번호 확인 칸과도 실시간 비교 동기화
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
        passwordConfirmFeedback.style.color = "#4d94ff"; // 파란색
    } else {
        passwordConfirmFeedback.innerText = "비밀번호가 일치하지 않습니다.";
        passwordConfirmFeedback.style.color = "#ff4d4d"; // 빨간색
    }
}

if (passwordConfirmInput) {
    passwordConfirmInput.addEventListener('input', checkPasswordMatch);
}

// 가입 전 폼 전송 차단 (조건 불만족 시)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;

        if (!regex.test(password)) {
            e.preventDefault();
            showToast("비밀번호 조건을 만족하지 않습니다!");
            passwordInput.focus();
            return;
        }

        if (password !== passwordConfirm) {
            e.preventDefault();
            showToast("비밀번호가 일치하지 않습니다!");
            passwordConfirmInput.focus();
            return;
        }
    });
}

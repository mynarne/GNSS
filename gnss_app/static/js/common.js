// 공용 스크립트 및 토스트 로직


// 토스트 메시지
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<i class="fa-solid fa-bell me-2" style="color: #87CEEB;"></i> ${message}`;

    container.appendChild(toast);

    // 0.1초 뒤에 날아옴
    setTimeout(() => toast.classList.add('show'), 100);

    // 3초 뒤에 다시 나감
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500); // 완전히 사라지면 삭제
    }, 3000);
}


// 전화번호 포맷
// html 요소에 oninput="autoHyphen(this)" 속성을 추가하여 사용
function autoHyphen(target) {
    // 숫자가 아닌 문자는 모두 제거
    let number = target.value.replace(/[^0-9]/g, '');
    let length = number.length;
    let result = '';

    if (length < 4) {
        result = number;
    } else if (length < 8) {
        result = number.substring(0, 3) + '-' + number.substring(3);
    } else {
        result = number.substring(0, 3) + '-' + number.substring(3, 7) + '-' + number.substring(7, 11);
    }

    target.value = result;
}


// 이메일 인증 - 인증번호 요청 함수 (AJAX)
async function requestVerification(type, value, purpose) {
    try {
        const response = await fetch('/auth/request-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: type,
                value: value,
                purpose: purpose
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            showToast(result.message);
            // 여기에 타이머 작동 로직 등을 추가할 수 있슈
        } else {
            showToast(result.message);
        }
    } catch (error) {
        console.error('인증 요청 중 오류 발생:', error);
        showToast('서버 통신에 실패했습니다.');
    }
}

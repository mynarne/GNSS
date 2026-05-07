// 공용 스크립트 및 토스트 로직


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

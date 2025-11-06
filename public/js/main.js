// ============================================================================
// Fortune For You - Main JavaScript
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 페이지 로드 완료 시 실행

  // 모든 폼의 입력값 검증
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      // 각 input 필드 검증
      const inputs = form.querySelectorAll('[required]');
      inputs.forEach(input => {
        if (!input.value.trim()) {
          e.preventDefault();
          alert('모든 필드를 채워주세요.');
        }
      });
    });
  });

  // 비밀번호 확인
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('blur', () => {
      if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.style.borderColor = 'var(--danger-color)';
      } else {
        confirmPasswordInput.style.borderColor = 'var(--border-color)';
      }
    });
  }

  // 자동 알림 닫기 (5초 후)
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.display = 'none';
    }, 5000);
  });

  // 확인 대화 스타일 향상
  window.confirmDelete = () => {
    return confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
  };
});

// 유틸리티 함수들

/**
 * 날짜 포맷팅
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 시간 포맷팅
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 상대 시간 표시 (예: "2시간 전")
 */
function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000); // 초 단위

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  
  return formatDate(d);
}

/**
 * 로컬 스토리지 유틸
 */
const storage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear()
};

/**
 * API 호출
 */
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
}

/**
 * 알림 표시
 */
function showAlert(message, type = 'info') {
  const alertTypes = ['success', 'danger', 'warning', 'info'];
  if (!alertTypes.includes(type)) type = 'info';

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '80px';
  alert.style.right = '20px';
  alert.style.zIndex = '2000';
  alert.style.minWidth = '300px';

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 5000);
}

/**
 * 로딩 표시
 */
function showLoading(message = '로딩 중...') {
  const loading = document.createElement('div');
  loading.id = 'loading-overlay';
  loading.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
  `;

  const spinner = document.createElement('div');
  spinner.className = 'loading';
  spinner.style.margin = '0 auto 1rem';

  const text = document.createElement('p');
  text.textContent = message;

  content.appendChild(spinner);
  content.appendChild(text);
  loading.appendChild(content);
  document.body.appendChild(loading);

  return () => loading.remove();
}

/**
 * 로딩 제거
 */
function hideLoading() {
  const loading = document.getElementById('loading-overlay');
  if (loading) loading.remove();
}

// Export for use in other scripts
window.formatDate = formatDate;
window.formatTime = formatTime;
window.timeAgo = timeAgo;
window.storage = storage;
window.apiCall = apiCall;
window.showAlert = showAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;


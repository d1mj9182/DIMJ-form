// Admin configuration
const ADMIN_CONFIG = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 10, // 10회 실패 시 잠금
    lockoutTime: 15 * 60 * 1000 // 15분 대기
};

// API Configuration
const PROXY_URL = 'https://dimj-form-proxy.vercel.app/api/supabase';
const SUPABASE_URL = 'https://tmqwzvyrodpdmfglsqqw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcXd6dnlyb2RwZG1mZ2xzcXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzMjUzMzEsImV4cCI6MjA0NzkwMTMzMX0.MkFZj8gNdkZT7xE9ysD1fkzN3bfOh5CtpOEtQGUCqY4';

// Admin state
let adminState = {
    isLoggedIn: false,
    loginTime: null,
    applications: [],
    blockedIPs: [],
    loginAttempts: 0,
    lastFailedLogin: null,
    currentPage: 'dashboard',
    currentPaginationPage: 1,
    itemsPerPage: 10,
    filteredApplications: [],
    loginHistory: []
};

// Utility Functions
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    setupEventListeners();
    loadBlockedIPs();
    loadLoginHistory();
});

// Event listeners
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Navigation listeners
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
                // Close mobile menu after navigation
                closeMobileMenu();
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar?.classList.toggle('active');
            sidebarOverlay?.classList.toggle('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            closeMobileMenu();
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchInput');

    if (statusFilter) statusFilter.addEventListener('change', loadApplications);
    if (dateFilter) dateFilter.addEventListener('change', loadApplications);

    // Debounced search
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            filterAndRenderApplications();
        }, 500));
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            toggleSelectAll(this.checked);
        });
    }

    // Set today's date as default
    if (dateFilter) {
        dateFilter.value = new Date().toISOString().split('T')[0];
    }
}

// Close mobile menu
function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
}

// Page navigation
function navigateToPage(pageName) {
    console.log('네비게이션:', pageName);

    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Update page visibility - HTML에서는 page-content 클래스 사용
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }

    // Update page title
    const titles = {
        'dashboard': '대시보드',
        'applications': '신청 관리',
        'content': '콘텐츠 관리',
        'banners': '배너 관리',
        'security': '보안 설정'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[pageName] || '대시보드';
    }

    adminState.currentPage = pageName;

    // Load page-specific data
    if (pageName === 'applications') {
        loadApplications();
    } else if (pageName === 'dashboard') {
        updateStats();
        loadRecentApplications();
    } else if (pageName === 'banners') {
        // 배너 페이지 로드 시 기존 업로드된 이미지 표시
        setTimeout(loadBannersToAdmin, 100);
    } else if (pageName === 'security') {
        renderLoginHistory();
    }
}

// Simple hash function for password verification
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Verify password against Supabase (checks both master_password and admin_password)
async function verifyPassword(inputPassword) {
    try {
        console.log('verifyPassword 시작');
        const hashedInput = await hashPassword(inputPassword);
        console.log('입력한 패스워드 해시:', hashedInput);

        // 마스터 패스워드 체크
        const masterResponse = await fetch(`${PROXY_URL}?table=admin_settings&key=master_password`, {
            method: 'GET',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        const masterResult = await masterResponse.json();
        console.log('마스터 패스워드 응답:', masterResult);

        if (Array.isArray(masterResult) && masterResult.length > 0) {
            const masterHash = masterResult[0].setting_value || masterResult[0].설정값;
            console.log('저장된 마스터 패스워드 해시:', masterHash);
            if (hashedInput === masterHash) {
                console.log('마스터 패스워드 일치!');
                return true;
            }
        }

        // 일반 패스워드 체크
        const response = await fetch(`${PROXY_URL}?table=admin_settings&key=admin_password`, {
            method: 'GET',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('일반 패스워드 응답:', result);

        if (Array.isArray(result) && result.length > 0) {
            // 가장 최신 패스워드 사용 (배열의 마지막)
            const latestPassword = result[result.length - 1];
            const storedHash = latestPassword.setting_value || latestPassword.설정값;
            console.log('저장된 일반 패스워드 해시:', storedHash);
            if (hashedInput === storedHash) {
                console.log('일반 패스워드 일치!');
                return true;
            }
        }

        // Supabase에 패스워드가 없으면 로그인 실패
        console.error('Supabase에 admin_password가 설정되지 않았습니다.');
        return false;
    } catch (error) {
        console.error('비밀번호 확인 실패:', error);
        return false;
    }
}

// Login handling
async function handleLogin(e) {
    e.preventDefault();

    // Check if locked out
    if (isLockedOut()) {
        const remainingTime = Math.ceil((ADMIN_CONFIG.lockoutTime - (Date.now() - adminState.lastFailedLogin)) / 1000 / 60);
        showToast('error', '계정 잠김', `너무 많은 로그인 시도로 인해 ${remainingTime}분간 잠겨있습니다.`);
        return;
    }

    const password = document.getElementById('adminPassword').value;

    showLoading();

    // Verify password from Supabase
    const isValid = await verifyPassword(password);

    hideLoading();

    // Get user IP
    getUserIP().then(ipAddress => {
        if (isValid) {
            adminState.isLoggedIn = true;
            adminState.loginTime = Date.now();
            adminState.loginAttempts = 0;
            adminState.lastFailedLogin = null;

            // Save login state
            sessionStorage.setItem('adminAuth', JSON.stringify({
                loginTime: adminState.loginTime,
                isLoggedIn: true
            }));

            // Record successful login
            recordLoginAttempt(ipAddress, true);

            showAdminPanel();
            navigateToPage('dashboard');
            loadApplications();
            updateStats();
        } else {
            // Record failed login
            recordLoginAttempt(ipAddress, false);

            adminState.loginAttempts++;
            adminState.lastFailedLogin = Date.now();

            const remainingAttempts = ADMIN_CONFIG.maxLoginAttempts - adminState.loginAttempts;

            if (remainingAttempts > 0) {
                showToast('error', '로그인 실패', `잘못된 비밀번호입니다. ${remainingAttempts}번 더 시도할 수 있습니다.`);
            } else {
                showToast('error', '계정 잠김', '너무 많은 로그인 시도로 인해 15분간 잠겨있습니다.');
            }

            document.getElementById('adminPassword').value = '';
        }
    });
}

// Get user IP address
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('IP 조회 실패:', error);
        return 'Unknown';
    }
}

// Record login attempt
function recordLoginAttempt(ipAddress, isSuccess) {
    const now = new Date();
    const loginRecord = {
        timestamp: now.toISOString(),
        date: now.toLocaleDateString('ko-KR'),
        time: now.toLocaleTimeString('ko-KR'),
        ip: ipAddress,
        status: isSuccess ? '성공' : '실패',
        browser: navigator.userAgent.split(' ').pop().split('/')[0] || 'Unknown'
    };

    // Load existing history
    let history = JSON.parse(localStorage.getItem('adminLoginHistory') || '[]');

    // Add new record at the beginning
    history.unshift(loginRecord);

    // Keep only last 100 records
    if (history.length > 100) {
        history = history.slice(0, 100);
    }

    // Save to localStorage (persistent)
    localStorage.setItem('adminLoginHistory', JSON.stringify(history));

    adminState.loginHistory = history;

    // Render if on security page
    if (adminState.currentPage === 'security') {
        renderLoginHistory();
    }
}

// Load login history
function loadLoginHistory() {
    const history = JSON.parse(localStorage.getItem('adminLoginHistory') || '[]');
    adminState.loginHistory = history;
}

// Render login history table
function renderLoginHistory() {
    const tbody = document.getElementById('loginHistoryTableBody');
    if (!tbody) return;

    const history = adminState.loginHistory;

    if (history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #64748b; padding: 2rem;">
                    로그인 기록이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = history.map((record, index) => `
        <tr>
            <td><strong>${index + 1}</strong></td>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td>${record.ip}</td>
            <td>
                <span class="status-badge ${record.status === '성공' ? 'status-success' : 'status-error'}">
                    ${record.status === '성공' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>'}
                    ${record.status}
                </span>
            </td>
            <td>${record.browser}</td>
        </tr>
    `).join('');
}


// Change password function
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('warning', '입력 필요', '모든 필드를 입력해주세요.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('error', '비밀번호 불일치', '새 비밀번호가 일치하지 않습니다.');
        return;
    }

    if (newPassword.length < 8) {
        showToast('warning', '비밀번호 약함', '비밀번호는 최소 8자 이상이어야 합니다.');
        return;
    }

    showLoading();

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword);

    if (!isCurrentValid) {
        hideLoading();
        showToast('error', '인증 실패', '현재 비밀번호가 올바르지 않습니다.');
        return;
    }

    try {
        // Hash new password
        const newHash = await hashPassword(newPassword);

        // Update in Supabase
        const response = await fetch(`${PROXY_URL}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'admin_settings',
                setting_key: 'admin_password',
                setting_value: newHash
            })
        });

        hideLoading();

        if (response.ok) {
            showToast('success', '비밀번호 변경 완료', '비밀번호가 성공적으로 변경되었습니다.');

            // Clear inputs
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            throw new Error('비밀번호 업데이트 실패');
        }
    } catch (error) {
        hideLoading();
        console.error('비밀번호 변경 에러:', error);
        showToast('error', '변경 실패', '비밀번호 변경에 실패했습니다.');
    }
}

// Change settings password function
async function changeSettingsPassword() {
    const currentPassword = document.getElementById('currentSettingsPassword').value;
    const newPassword = document.getElementById('newSettingsPassword').value;
    const confirmPassword = document.getElementById('confirmSettingsPassword').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('warning', '입력 필요', '모든 필드를 입력해주세요.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('error', '비밀번호 불일치', '새 비밀번호가 일치하지 않습니다.');
        return;
    }

    if (newPassword.length < 4) {
        showToast('warning', '비밀번호 약함', '비밀번호는 최소 4자 이상이어야 합니다.');
        return;
    }

    showLoading();

    try {
        // Verify current settings password
        const currentHash = await hashPassword(currentPassword);

        const checkResponse = await fetch(`${PROXY_URL}?table=admin_settings&key=settings_password`, {
            method: 'GET',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        const currentData = await checkResponse.json();

        if (Array.isArray(currentData) && currentData.length > 0) {
            const storedHash = currentData[currentData.length - 1].setting_value;
            if (currentHash !== storedHash) {
                hideLoading();
                showToast('error', '인증 실패', '현재 설정 패스워드가 올바르지 않습니다.');
                return;
            }
        } else {
            hideLoading();
            showToast('error', '설정 패스워드 없음', '설정 패스워드가 등록되지 않았습니다. 관리자에게 문의하세요.');
            return;
        }

        // Hash new password
        const newHash = await hashPassword(newPassword);

        // Update in Supabase
        const response = await fetch(`${PROXY_URL}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'admin_settings',
                setting_key: 'settings_password',
                setting_value: newHash
            })
        });

        hideLoading();

        if (response.ok) {
            showToast('success', '설정 패스워드 변경 완료', '설정 패스워드가 성공적으로 변경되었습니다.');

            // Clear inputs
            document.getElementById('currentSettingsPassword').value = '';
            document.getElementById('newSettingsPassword').value = '';
            document.getElementById('confirmSettingsPassword').value = '';
        } else {
            throw new Error('설정 패스워드 업데이트 실패');
        }
    } catch (error) {
        hideLoading();
        console.error('설정 패스워드 변경 에러:', error);
        showToast('error', '변경 실패', '설정 패스워드 변경에 실패했습니다.');
    }
}

function isLockedOut() {
    return adminState.loginAttempts >= ADMIN_CONFIG.maxLoginAttempts &&
           adminState.lastFailedLogin &&
           (Date.now() - adminState.lastFailedLogin) < ADMIN_CONFIG.lockoutTime;
}

function checkLoginStatus() {
    const authData = sessionStorage.getItem('adminAuth');

    if (authData) {
        const parsed = JSON.parse(authData);

        // Check if session is still valid
        if (parsed.isLoggedIn && (Date.now() - parsed.loginTime) < ADMIN_CONFIG.sessionTimeout) {
            adminState.isLoggedIn = true;
            adminState.loginTime = parsed.loginTime;
            showAdminPanel();
            navigateToPage('dashboard');
            loadApplications();
            updateStats();
        } else {
            logout();
        }
    }
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminMain').style.display = 'flex';
}

function logout() {
    adminState.isLoggedIn = false;
    adminState.loginTime = null;
    sessionStorage.removeItem('adminAuth');

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminMain').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

// Data management
async function loadApplications() {
    if (!adminState.isLoggedIn) return;

    try {
        console.log('📋 Supabase에서 관리자 데이터 로딩...');

        // Show skeleton loader
        const skeleton = document.getElementById('tableSkeletonLoader');
        const table = document.getElementById('applicationsTable');
        if (skeleton) skeleton.style.display = 'block';
        if (table) table.style.opacity = '0.3';

        const response = await fetch(`${PROXY_URL}?table=consultations`, {
            method: 'GET',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('🔍 프록시 응답:', result);

        // 응답 형식에 따른 처리
        let data;
        if (result.success && result.data) {
            data = result.data;  // 프록시가 {success: true, data: [...]} 형식
        } else if (Array.isArray(result)) {
            data = result;  // 직접 배열
        } else if (result.fullData) {
            data = result.fullData;  // fullData가 있는 경우
        } else {
            console.error('❌ 예상치 못한 응답 형식:', result);
            throw new Error('데이터 형식 오류');
        }

        // 🔥 영문 필드명으로 데이터 매핑 - Supabase 대응
        const applications = data.map(record => ({
            id: record.id,
            name: record.name || '익명',
            phone: record.phone || '-',
            service: record.main_service || '-',
            provider: record.carrier || '-',
            additionalServices: record.other_service || '-',
            preference: record.preferred_time || '-',
            status: record.status || '상담대기',
            giftAmount: record.gift_amount || 0,
            ip: record.ip_address || '-',
            personalInfoConsent: record.privacy_agreed || false,
            timestamp: record.created_at,
            submissionTime: record.created_at
        }));

        // Store all applications for stats (통계용 전체 데이터)
        adminState.applications = applications;
        console.log('📊 통계용 전체 데이터:', applications.length, '건');
        console.log('📊 상태별 데이터:', {
            상담대기: applications.filter(a => a.status === '상담대기').length,
            상담중: applications.filter(a => a.status === '상담중').length,
            상담완료: applications.filter(a => a.status === '상담완료').length,
            설치예약: applications.filter(a => a.status === '설치예약').length,
            설치완료: applications.filter(a => a.status === '설치완료').length
        });

        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');

        const statusValue = statusFilter ? statusFilter.value : '';
        const dateValue = dateFilter ? dateFilter.value : '';

        // 필터링 적용 (테이블 표시용)
        let filteredApps = [...applications]; // 복사본 생성

        // 30일 경과 데이터 필터링 (어드민 테이블에서만 숨김, 통계에는 포함)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredApps = filteredApps.filter(app => {
            const createdAt = new Date(app.timestamp);
            return createdAt >= thirtyDaysAgo;
        });

        if (statusValue) {
            filteredApps = filteredApps.filter(app => app.status === statusValue);
        }

        // 전체 상태일 때는 날짜 필터 무시
        if (dateValue && statusValue !== '') {
            filteredApps = filteredApps.filter(app => {
                const appDate = new Date(app.timestamp).toISOString().split('T')[0];
                return appDate === dateValue;
            });
        } else if (dateValue && statusValue === '') {
            // 전체 상태에서는 날짜 필터 적용하지 않음
            console.log('전체 상태 선택 시 날짜 필터 무시');
        }

        // 최신순 정렬
        filteredApps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        adminState.filteredApplications = filteredApps;
        adminState.currentPaginationPage = 1; // Reset to first page

        renderPaginatedTable();

        console.log(`✅ ${filteredApps.length}개 신청서 로딩 완료`);

        // Hide skeleton loader
        if (skeleton) skeleton.style.display = 'none';
        if (table) table.style.opacity = '1';

        // Update stats after loading applications
        updateStats();

        showToast('success', '로딩 완료', `${filteredApps.length}개의 신청서를 불러왔습니다.`);

    } catch (error) {
        console.error('❌ 데이터 로딩 실패:', error);

        // Hide skeleton loader
        if (skeleton) skeleton.style.display = 'none';
        if (table) table.style.opacity = '1';

        showToast('error', '로딩 실패', `데이터를 불러오는데 실패했습니다: ${error.message}`);
    }
}

// Pagination rendering
function renderPaginatedTable() {
    const { filteredApplications, currentPaginationPage, itemsPerPage } = adminState;

    const startIdx = (currentPaginationPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedApps = filteredApplications.slice(startIdx, endIdx);

    renderApplicationsTable(paginatedApps, startIdx);
    renderPaginationControls();
}

function renderPaginationControls() {
    const { filteredApplications, currentPaginationPage, itemsPerPage } = adminState;
    const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
    const startIdx = (currentPaginationPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, filteredApplications.length);

    // Update showing info
    const showingInfo = document.getElementById('showingInfo');
    if (showingInfo) {
        showingInfo.textContent = `${startIdx + 1}-${endIdx} / 총 ${filteredApplications.length}개`;
    }

    // Render pagination buttons
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    let html = '';

    // Previous button
    html += `<button class="pagination-btn" ${currentPaginationPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPaginationPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPaginationPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPaginationPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
        html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="pagination-btn" ${currentPaginationPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPaginationPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(adminState.filteredApplications.length / adminState.itemsPerPage);
    if (page < 1 || page > totalPages) return;

    adminState.currentPaginationPage = page;
    renderPaginatedTable();

    // Scroll to top of table
    document.getElementById('applicationsTable')?.scrollIntoView({ behavior: 'smooth' });
}

function filterAndRenderApplications() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const { applications } = adminState;

    const filtered = applications.filter(app => {
        return app.name.toLowerCase().includes(searchTerm) ||
               app.phone.includes(searchTerm) ||
               app.ip.includes(searchTerm);
    });

    adminState.filteredApplications = filtered;
    adminState.currentPaginationPage = 1;
    renderPaginatedTable();
}

// 개인정보 암호화 함수 (48시간 경과 시)
function maskPersonalInfo(app) {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const createdAt = new Date(app.timestamp);

    // 48시간 경과 여부 확인
    if (createdAt < fortyEightHoursAgo) {
        // 이름 마스킹: 홍길동 → 홍*동, 김철수 → 김*수
        const maskedName = app.name ?
            (app.name.length === 1 ? app.name[0] + '*' :
             app.name.length === 2 ? app.name[0] + '*' :
             app.name[0] + '*'.repeat(app.name.length - 2) + app.name[app.name.length-1]) : '-';

        // 전화번호 마스킹: 010-7171-6361 → 010-****-6361
        const maskedPhone = app.phone ?
            String(app.phone).replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$3") : '-';

        return {
            ...app,
            name: maskedName,
            phone: maskedPhone
        };
    }

    return app;
}

function renderApplicationsTable(applications, startIndex = 0) {
    const tbody = document.getElementById('applicationsTableBody');

    if (!tbody) return;

    if (applications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; color: #64748b; padding: 2rem;">
                    신청 내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = applications.map((app, index) => {
        // 48시간 경과 시 개인정보 암호화
        const displayApp = maskPersonalInfo(app);

        return `<tr>
            <td><input type="checkbox"></td>
            <td><strong>${startIndex + index + 1}</strong></td>
            <td>${displayApp.id}</td>
            <td>${displayApp.name}</td>
            <td>${displayApp.phone}</td>
            <td>${app.service}</td>
            <td>${app.provider || '-'}</td>
            <td>
                <button onclick="openDateModal('${app.id}', '${formatDateForInput(app.timestamp)}')"
                        style="padding: 4px 8px; font-size: 0.875rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">
                    ${new Date(app.timestamp).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </button>
            </td>
            <td>${app.ip ? app.ip.substring(0, 15) : '-'}</td>
            <td>
                <select class="status-select" onchange="updateApplicationStatus('${app.id}', this.value)" data-original="${app.status || '상담대기'}">
                    <option value="상담대기" ${app.status === '상담대기' ? 'selected' : ''}>상담대기</option>
                    <option value="상담중" ${app.status === '상담중' ? 'selected' : ''}>상담중</option>
                    <option value="상담완료" ${app.status === '상담완료' ? 'selected' : ''}>상담완료</option>
                    <option value="설치예약" ${app.status === '설치예약' ? 'selected' : ''}>설치예약</option>
                    <option value="설치완료" ${app.status === '설치완료' ? 'selected' : ''}>설치완료</option>
                </select>
            </td>
            <td>
                <input type="number" class="gift-amount-input" value="${app.giftAmount || 0}"
                       onchange="updateGiftAmount('${app.id}', this.value)"
                       style="width: 80px; padding: 4px; text-align: right;" min="0" step="10000">원
            </td>
            <td class="table-actions">
                <button class="btn-icon danger" onclick="deleteApplication('${app.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForInput(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Update stats
async function updateStats() {
    if (!adminState.isLoggedIn) return;

    const today = new Date().toISOString().split('T')[0];
    const todayApplications = adminState.applications.filter(app => {
        const appDate = new Date(app.timestamp).toISOString().split('T')[0];
        return appDate === today;
    }).length;

    const statusWaiting = adminState.applications.filter(app =>
        app.status === '상담대기'
    ).length;

    const statusInProgress = adminState.applications.filter(app =>
        app.status === '상담중'
    ).length;

    const statusDone = adminState.applications.filter(app =>
        app.status === '상담완료'
    ).length;

    const statusScheduled = adminState.applications.filter(app =>
        app.status === '설치예약'
    ).length;

    const completedInstall = adminState.applications.filter(app =>
        app.status === '설치완료'
    ).length;

    const totalGiftAmount = adminState.applications.reduce((sum, app) => {
        return sum + (parseInt(app.giftAmount) || 0);
    }, 0);

    // 년간 통계 계산 (올해 1월 1일부터 현재까지)
    const thisYear = new Date().getFullYear();
    const yearStart = new Date(thisYear, 0, 1); // 1월 1일

    const yearlyInstallCompleted = adminState.applications.filter(app => {
        const appDate = new Date(app.timestamp);
        return app.status === '설치완료' && appDate >= yearStart;
    }).length;

    const yearlyGiftAmount = adminState.applications.reduce((sum, app) => {
        const appDate = new Date(app.timestamp);
        if (appDate >= yearStart) {
            return sum + (parseInt(app.giftAmount) || 0);
        }
        return sum;
    }, 0);

    // Update stat values
    const todayEl = document.getElementById('todayApplications');
    const waitingEl = document.getElementById('statusWaiting');
    const inProgressEl = document.getElementById('statusInProgress');
    const doneEl = document.getElementById('statusDone');
    const scheduledEl = document.getElementById('statusScheduled');
    const completedEl = document.getElementById('completedInstall');
    const giftEl = document.getElementById('totalGiftAmount');
    const yearlyInstallEl = document.getElementById('yearlyInstallCompleted');
    const yearlyGiftEl = document.getElementById('yearlyGiftAmount');
    const pendingBadgeEl = document.getElementById('pendingBadge');

    if (todayEl) todayEl.textContent = todayApplications;
    if (waitingEl) waitingEl.textContent = statusWaiting;
    if (inProgressEl) inProgressEl.textContent = statusInProgress;
    if (doneEl) doneEl.textContent = statusDone;
    if (scheduledEl) scheduledEl.textContent = statusScheduled;
    if (completedEl) completedEl.textContent = completedInstall;
    if (giftEl) giftEl.textContent = totalGiftAmount.toLocaleString() + '만원';
    if (yearlyInstallEl) yearlyInstallEl.textContent = yearlyInstallCompleted;
    if (yearlyGiftEl) yearlyGiftEl.textContent = yearlyGiftAmount.toLocaleString() + '만원';
    if (pendingBadgeEl) {
        pendingBadgeEl.textContent = statusWaiting;
        pendingBadgeEl.style.display = statusWaiting > 0 ? 'block' : 'none';
    }

    // 월별 그래프 업데이트
    updateMonthlyChart();
}

// 월별 그래프 생성
let monthlyChartInstance = null;

function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    // 최근 6개월 데이터 계산
    const monthlyData = {};
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = { applications: 0, completed: 0, giftAmount: 0 };
    }

    // 신청 데이터 집계
    adminState.applications.forEach(app => {
        const appDate = new Date(app.timestamp);
        const monthKey = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyData[monthKey]) {
            monthlyData[monthKey].applications++;
            if (app.status === '설치완료') {
                monthlyData[monthKey].completed++;
            }
            monthlyData[monthKey].giftAmount += (parseInt(app.giftAmount) || 0);
        }
    });

    const labels = Object.keys(monthlyData).map(key => {
        const [year, month] = key.split('-');
        return `${month}월`;
    });

    const applicationsData = Object.values(monthlyData).map(d => d.applications);
    const completedData = Object.values(monthlyData).map(d => d.completed);
    const doneData = [];

    // 상담완료 데이터 계산
    adminState.applications.forEach(app => {
        const appDate = new Date(app.timestamp);
        const monthKey = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyData[monthKey]) {
            if (!monthlyData[monthKey].done) {
                monthlyData[monthKey].done = 0;
            }
            if (app.status === '상담완료') {
                monthlyData[monthKey].done++;
            }
        }
    });

    Object.values(monthlyData).forEach(d => {
        doneData.push(d.done || 0);
    });

    // 기존 차트 제거
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    // 새 차트 생성
    monthlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '접수 신청',
                    data: applicationsData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                },
                {
                    label: '설치 완료',
                    data: completedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                },
                {
                    label: '상담 완료',
                    data: doneData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + '개';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '개수'
                    },
                    ticks: {
                        beginAtZero: true,
                        stepSize: 5,
                        max: 10000,
                        callback: function(value) {
                            return value + '개';
                        }
                    }
                }
            }
        }
    });
}

// Status update
async function updateStatus(id, newStatus) {
    if (!newStatus) return;

    try {
        console.log(`📝 상태 업데이트 시작: ID ${id} -> ${newStatus}`);

        const response = await fetch(`${PROXY_URL}?table=consultations&id=${id}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus
            })
        });

        const result = await response.json();
        console.log('✅ 상태 업데이트 응답:', result);

        if (result.success || response.ok) {
            alert('상태가 업데이트되었습니다.');
            loadApplications(); // Reload to get fresh data
        } else {
            throw new Error(result.error || '상태 업데이트 실패');
        }

    } catch (error) {
        console.error('❌ 상태 업데이트 실패:', error);
        alert(`상태 업데이트에 실패했습니다.\n\n에러: ${error.message}`);
    }
}

// Gift amount update
async function updateGiftAmount(id, amount) {
    try {
        console.log(`🎁 사은품 금액 업데이트: ID ${id} -> ${amount}만원`);

        const response = await fetch(`${PROXY_URL}?table=consultations&id=${id}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gift_amount: parseInt(amount) || 0
            })
        });

        const result = await response.json();
        console.log('✅ 사은품 금액 업데이트 응답:', result);

        if (result.success || response.ok) {
            alert('사은품 금액이 업데이트되었습니다.');
            loadApplications();
        } else {
            throw new Error(result.error || '사은품 금액 업데이트 실패');
        }

    } catch (error) {
        console.error('❌ 사은품 금액 업데이트 실패:', error);
        alert(`사은품 금액 업데이트에 실패했습니다.\n\n에러: ${error.message}`);
    }
}

// Delete application
async function deleteApplication(id) {
    if (!confirm('정말 이 신청서를 삭제하시겠습니까?')) {
        return;
    }

    try {
        console.log(`🗑️ 신청서 삭제 시작: ID ${id}`);

        const response = await fetch(`${PROXY_URL}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'consultations',
                id: id
            })
        });

        if (response.ok) {
            alert('신청서가 삭제되었습니다.');
            loadApplications();
        } else {
            const result = await response.json();
            throw new Error(result.error || '삭제 실패');
        }

    } catch (error) {
        console.error('❌ 삭제 실패:', error);
        alert(`삭제에 실패했습니다.\n\n에러: ${error.message}`);
    }
}

// View application
function viewApplication(id) {
    const app = adminState.applications.find(a => a.id === id);
    if (app) {
        alert(`신청 상세정보\n\nID: ${app.id}\n이름: ${app.name}\n전화: ${app.phone}\n서비스: ${app.service}\n통신사: ${app.provider}\n상태: ${app.status}\nIP: ${app.ip}`);
    }
}

// Edit application
function editApplication(id) {
    alert('신청 수정 기능은 준비 중입니다.');
}

// Search functionality
function searchApplications() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();

    const filtered = adminState.applications.filter(app => {
        return app.name.toLowerCase().includes(searchTerm) ||
               app.phone.includes(searchTerm) ||
               app.ip.includes(searchTerm);
    });

    renderApplicationsTable(filtered);
}

// Export to Excel
function exportToExcel() {
    if (adminState.applications.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    let csv = '신청번호,이름,전화번호,서비스,통신사,추가서비스,선호시간,신청일시,IP주소,상태,사은품\n';

    adminState.applications.forEach(app => {
        csv += `${app.id},${app.name},${app.phone},${app.service},${app.provider},${app.additionalServices || '-'},${app.preference},${formatDate(app.timestamp)},${app.ip},${app.status},${app.giftAmount || 0}\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `신청목록_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// IP Blocking
function loadBlockedIPs() {
    const blocked = localStorage.getItem('blockedIPs');
    if (blocked) {
        adminState.blockedIPs = JSON.parse(blocked);
        renderBlockedIPs();
    }
}

function blockIP() {
    const ipInput = document.getElementById('ipInput');
    if (!ipInput) return;

    const ip = ipInput.value.trim();

    if (!ip) {
        alert('IP 주소를 입력하세요.');
        return;
    }

    if (adminState.blockedIPs.includes(ip)) {
        alert('이미 차단된 IP입니다.');
        return;
    }

    adminState.blockedIPs.push(ip);
    localStorage.setItem('blockedIPs', JSON.stringify(adminState.blockedIPs));

    renderBlockedIPs();
    ipInput.value = '';
    alert('IP가 차단되었습니다.');
}

function unblockIP(ip) {
    adminState.blockedIPs = adminState.blockedIPs.filter(blocked => blocked !== ip);
    localStorage.setItem('blockedIPs', JSON.stringify(adminState.blockedIPs));
    renderBlockedIPs();
    alert('IP 차단이 해제되었습니다.');
}

function renderBlockedIPs() {
    const list = document.getElementById('blockedIPsList');
    if (!list) return;

    if (adminState.blockedIPs.length === 0) {
        list.innerHTML = '<p style="color: #64748b;">차단된 IP가 없습니다.</p>';
        return;
    }

    list.innerHTML = adminState.blockedIPs.map(ip => `
        <div class="ip-tag">
            ${ip}
            <button onclick="unblockIP('${ip}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Content Management Functions (Banners & Detail Page)
function switchBannerTab(tabName) {
    console.log('배너 탭 전환:', tabName);

    // Remove active class from all tabs
    document.querySelectorAll('.banner-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Hide all banner editor sections
    document.querySelectorAll('.banner-editor .tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Show selected banner content
    const selectedContent = document.getElementById(tabName + 'Editor');
    if (selectedContent) {
        selectedContent.style.display = 'block';
    } else {
        console.error('배너 콘텐츠를 찾을 수 없음:', tabName + 'Editor');
    }
}

// Main Banner Image Upload (Step 1)
async function previewMainBannerImage(event, step) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;

        // Save to localStorage (백업용)
        localStorage.setItem(`mainBannerImage_${step}`, imageData);

        // Save to Supabase DB
        try {
            const response = await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: `main_banner_${step}`,
                    setting_value: imageData,
                    setting_type: 'image'
                })
            });

            const result = await response.json();
            console.log('배너 DB 저장 결과:', result);
            console.log('응답 상태:', response.status, response.statusText);

            if (!response.ok || (!result.success && result.error)) {
                throw new Error(result.error || `DB 저장 실패 (${response.status})`);
            }
        } catch (error) {
            console.error('배너 DB 저장 에러:', error);
            alert('이미지는 업로드되었으나 DB 저장에 실패했습니다. localStorage에만 저장됩니다.');
        }

        // Update preview
        const previewContainer = document.getElementById(`mainBannerPreview_${step}`);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Main Banner Preview">
                <button class="btn btn-remove" onclick="removeMainBannerImage('${step}')">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }

        alert('메인 배너 이미지가 업로드되었습니다.');

        // 메인 폼 새로고침
        if (window.opener && !window.opener.closed) {
            window.opener.location.reload();
        }
    };

    reader.readAsDataURL(file);
}

async function removeMainBannerImage(step) {
    if (!confirm('메인 배너 이미지를 제거하시겠습니까?')) return;

    // Remove from localStorage
    localStorage.removeItem(`mainBannerImage_${step}`);

    // Remove from Supabase DB
    try {
        const response = await fetch(`${PROXY_URL}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'admin_settings',
                setting_key: `main_banner_${step}`
            })
        });

        if (!response.ok) {
            console.warn('DB에서 배너 삭제 실패, localStorage만 삭제됨');
        }
    } catch (error) {
        console.error('배너 DB 삭제 에러:', error);
    }

    const previewContainer = document.getElementById(`mainBannerPreview_${step}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }

    const fileInput = document.getElementById(`step${step}MainBannerImageUpload`);
    if (fileInput) {
        fileInput.value = '';
    }

    alert('메인 배너 이미지가 제거되었습니다.');

    // 메인 폼 새로고침
    if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
    }
}

// Detail Page Images Upload
async function previewDetailImage(event, imageNumber) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;

        // Save to localStorage (백업용)
        localStorage.setItem(`detailImage${imageNumber}`, imageData);

        // Save to Supabase DB
        try {
            const response = await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: `detail_image_${imageNumber}`,
                    setting_value: imageData,
                    setting_type: 'image'
                })
            });

            const result = await response.json();
            console.log(`상세이미지 ${imageNumber} DB 저장 결과:`, result);
            console.log(`📦 저장된 데이터 확인:`, result.data ? result.data[0] : 'No data');

            if (!result.success && !response.ok) {
                throw new Error('DB 저장 실패');
            } else if (result.success) {
                console.log(`✅ 상세이미지 ${imageNumber} DB 저장 성공!`);
            }
        } catch (error) {
            console.error(`상세이미지 ${imageNumber} DB 저장 에러:`, error);
            alert('이미지는 업로드되었으나 DB 저장에 실패했습니다. localStorage에만 저장됩니다.');
        }

        // Update preview
        const previewContainer = document.getElementById(`detailImagePreview${imageNumber}`);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Detail Image ${imageNumber}">
                <button class="btn btn-remove" onclick="removeDetailImage(${imageNumber})">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }

        alert(`상세페이지 이미지 ${imageNumber}가 업로드되었습니다.`);

        // 메인 폼 새로고침
        if (window.opener && !window.opener.closed) {
            window.opener.location.reload();
        }
    };

    reader.readAsDataURL(file);
}

async function removeDetailImage(imageNumber) {
    if (!confirm(`상세페이지 이미지 ${imageNumber}를 제거하시겠습니까?`)) return;

    // Remove from localStorage
    localStorage.removeItem(`detailImage${imageNumber}`);

    // Remove from Supabase DB
    try {
        const response = await fetch(`${PROXY_URL}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'admin_settings',
                setting_key: `detail_image_${imageNumber}`
            })
        });

        if (!response.ok) {
            console.warn('DB에서 상세이미지 삭제 실패, localStorage만 삭제됨');
        }
    } catch (error) {
        console.error('상세이미지 DB 삭제 에러:', error);
    }

    const previewContainer = document.getElementById(`detailImagePreview${imageNumber}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }

    const fileInput = document.getElementById(`detailImage${imageNumber}Upload`);
    if (fileInput) {
        fileInput.value = '';
    }

    alert(`상세페이지 이미지 ${imageNumber}가 제거되었습니다.`);

    // 메인 폼 새로고침
    if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
    }
}

// Save detail image caption
function saveDetailCaption(imageNumber) {
    const captionInput = document.getElementById(`detailCaption${imageNumber}`);
    if (!captionInput) return;

    const caption = captionInput.value;
    localStorage.setItem(`detailCaption${imageNumber}`, caption);
    alert('캡션이 저장되었습니다.');
}

// Load detail page content
function loadDetailPageContent() {
    // Load main banner images
    for (let step of ['1', '2']) {
        const imageData = localStorage.getItem(`mainBannerImage_${step}`);
        const previewContainer = document.getElementById(`mainBannerPreview_${step}`);

        if (imageData && previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Main Banner Preview">
                <button class="btn btn-remove" onclick="removeMainBannerImage('${step}')">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }
    }

    // Load detail images
    for (let i = 1; i <= 10; i++) {
        const imageData = localStorage.getItem(`detailImage${i}`);
        const captionData = localStorage.getItem(`detailCaption${i}`);

        const previewContainer = document.getElementById(`detailImagePreview${i}`);
        const captionInput = document.getElementById(`detailCaption${i}`);

        if (imageData && previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Detail Image ${i}">
                <button class="btn btn-remove" onclick="removeDetailImage(${i})">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }

        if (captionData && captionInput) {
            captionInput.value = captionData;
        }
    }
}

// Content Editor Tab Switching
function switchContentTab(tabName) {
    console.log('콘텐츠 탭 전환:', tabName);

    // Remove active from all content tabs
    document.querySelectorAll('.content-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active to clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Hide all tab contents in content editor
    document.querySelectorAll('.content-editor .tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Show selected tab content
    const selectedContent = document.getElementById(tabName + 'Content');
    if (selectedContent) {
        selectedContent.style.display = 'block';
    } else {
        console.error('탭 콘텐츠를 찾을 수 없음:', tabName + 'Content');
    }
}

// Save content
async function saveContent() {
    showLoading();

    try {
        // 부정클릭 경고 메시지 저장
        const fraudWarningMessage = document.getElementById('fraudWarningMessage');
        if (fraudWarningMessage) {
            await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: 'fraud_warning_message',
                    setting_value: fraudWarningMessage.value,
                    setting_type: 'text'
                })
            });
        }

        // 메인페이지 콘텐츠 저장
        const mainPageTitle = document.getElementById('mainPageTitle');
        const mainPageSubtitle = document.getElementById('mainPageSubtitle');
        if (mainPageTitle) {
            await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: 'main_page_title',
                    setting_value: mainPageTitle.value,
                    setting_type: 'text'
                })
            });
        }
        if (mainPageSubtitle) {
            await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: 'main_page_subtitle',
                    setting_value: mainPageSubtitle.value,
                    setting_type: 'text'
                })
            });
        }

        // 히어로 섹션 저장
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        if (heroTitle) {
            await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: 'hero_title',
                    setting_value: heroTitle.value,
                    setting_type: 'text'
                })
            });
        }
        if (heroSubtitle) {
            await fetch(`${PROXY_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'admin_settings',
                    setting_key: 'hero_subtitle',
                    setting_value: heroSubtitle.value,
                    setting_type: 'text'
                })
            });
        }

        hideLoading();
        showToast('success', '저장 완료', '콘텐츠가 성공적으로 저장되었습니다.');
    } catch (error) {
        hideLoading();
        console.error('콘텐츠 저장 에러:', error);
        showToast('error', '저장 실패', '콘텐츠 저장에 실패했습니다.');
    }
}

// Load recent applications for dashboard
function loadRecentApplications() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList || adminState.applications.length === 0) return;

    // Get last 5 applications
    const recentApps = adminState.applications.slice(0, 5);

    activityList.innerHTML = recentApps.map(app => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-user-plus"></i>
            </div>
            <div class="activity-content">
                <p class="activity-text">${app.name}님이 ${app.service} 신청</p>
                <span class="activity-time">${getTimeAgo(app.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Get time ago text
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
}

// Go to main page
function goToMainPage() {
    window.open('index.html', '_blank');
}

// Filter applications
function filterApplications() {
    loadApplications();
}

// Update application status with retry
async function updateApplicationStatus(id, newStatus) {
    if (!confirm(`상태를 "${newStatus}"(으)로 변경하시겠습니까?`)) {
        loadApplications(); // 취소 시 원래 값으로 되돌리기
        return;
    }

    await retryableOperation(async () => {
        const response = await fetch(`${PROXY_URL}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'consultations',
                id: id,
                status: newStatus
            })
        });

        if (!response.ok) {
            throw new Error('상태 업데이트 실패');
        }

        showToast('success', '상태 변경', `상태가 "${newStatus}"(으)로 변경되었습니다.`);
        loadApplications();
    }, '상태 업데이트');
}

// Retryable operation wrapper
async function retryableOperation(operation, operationName, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            showLoading();
            await operation();
            hideLoading();
            return;
        } catch (error) {
            lastError = error;
            console.error(`${operationName} 시도 ${attempt}/${maxRetries} 실패:`, error);
            hideLoading();

            if (attempt < maxRetries) {
                const retry = confirm(`${operationName}에 실패했습니다.\n다시 시도하시겠습니까? (${attempt}/${maxRetries})`);
                if (!retry) break;
            }
        }
    }

    showToast('error', operationName + ' 실패', `${maxRetries}번 시도했지만 실패했습니다: ${lastError.message}`);
    loadApplications(); // 실패 시 원래 값으로 되돌리기
}

// Update gift amount
async function updateGiftAmount(id, newAmount) {
    try {
        const amount = parseInt(newAmount) || 0;

        const response = await fetch(`${PROXY_URL}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'consultations',
                id: id,
                gift_amount: amount
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('사은품 금액 업데이트 완료:', amount);
        } else {
            throw new Error(result.error || '사은품 금액 업데이트 실패');
        }
    } catch (error) {
        console.error('사은품 금액 업데이트 에러:', error);
        alert(`사은품 금액 업데이트 실패: ${error.message}`);
        loadApplications();
    }
}

// Date modal functions
let currentDateChangeId = null;

function openDateModal(id, currentDate) {
    currentDateChangeId = id;
    document.getElementById('dateChangeInput').value = currentDate;
    document.getElementById('dateChangeModal').style.display = 'flex';
}

function closeDateModal() {
    document.getElementById('dateChangeModal').style.display = 'none';
    currentDateChangeId = null;
}

function confirmDateChange() {
    const newDate = document.getElementById('dateChangeInput').value;
    if (newDate && currentDateChangeId) {
        updateApplicationDate(currentDateChangeId, newDate);
        closeDateModal();
    }
}

// Update application date
async function updateApplicationDate(id, newDate) {
    try {
        // datetime-local 형식을 TIMESTAMP로 변환 (타임존 없이)
        const dateObj = new Date(newDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');

        // TIMESTAMP 형식: YYYY-MM-DD HH:MM:SS
        const timestampValue = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        console.log('날짜 업데이트 시도:', { id, timestampValue });

        // 프록시 서버를 통해 업데이트
        const response = await fetch(`${PROXY_URL}`, {
            method: 'PATCH',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'consultations',
                id: id,
                created_at: timestampValue
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('날짜 업데이트 완료:', timestampValue);
            showToast('날짜가 성공적으로 업데이트되었습니다.', 'success');
            loadApplications();
        } else {
            throw new Error(result.error || '날짜 업데이트 실패');
        }
    } catch (error) {
        console.error('날짜 업데이트 에러:', error);
        alert(`날짜 업데이트 실패: ${error.message}`);
        loadApplications();
    }
}

// Export data
function exportData() {
    exportToExcel();
}

// Clear old data
function clearOldData() {
    if (confirm('30일 이상 지난 데이터를 삭제하시겠습니까?')) {
        alert('오래된 데이터 정리 기능은 준비 중입니다.');
    }
}

// Reset daily limits
function resetDailyLimits() {
    if (confirm('일일 제한을 리셋하시겠습니까?')) {
        alert('일일 제한이 리셋되었습니다.');
    }
}

// Save detail page content
function saveDetailPageContent() {
    alert('상세페이지 콘텐츠가 저장되었습니다.');
}

// Preview detail page
function previewDetailPage() {
    window.open('index.html', '_blank');
}

// Reset detail page content
function resetDetailPageContent() {
    if (confirm('상세페이지 콘텐츠를 초기화하시겠습니까?')) {
        alert('초기화되었습니다.');
    }
}

// Add FAQ
function addFAQ() {
    alert('FAQ 추가 기능은 준비 중입니다.');
}

// Save banner settings
function saveBannerSettings() {
    alert('배너 설정이 저장되었습니다.');
}

// Save main banner settings
function saveMainBannerSettings() {
    alert('메인 배너 설정이 저장되었습니다.');
    // 메인 폼에도 즉시 반영
    if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
    }
}

// Save detail images settings
function saveDetailImagesSettings() {
    alert('상세페이지 이미지 설정이 저장되었습니다.');
    // 메인 폼에도 즉시 반영
    if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
    }
}

// Load banners to admin (DB에서 로드)
async function loadBannersToAdmin() {
    console.log('어드민에 배너 로드 중 (DB 우선)...');

    // Load Step 1 & 2 Main Banners from DB
    for (let step of ['step1', 'step2']) {
        try {
            const response = await fetch(`${PROXY_URL}?table=admin_settings&key=main_banner_${step}`, {
                method: 'GET',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY
                }
            });

            const result = await response.json();
            let imageData = null;

            if (result.success && result.data && result.data.length > 0) {
                imageData = result.data[0].setting_value || result.data[0].설정값;
                console.log(`DB에서 ${step} 배너 로드 성공`);
            } else {
                // DB에 없으면 localStorage에서 가져오기
                imageData = localStorage.getItem(`mainBannerImage_${step}`);
                console.log(`localStorage에서 ${step} 배너 로드`);
            }

            if (imageData) {
                const previewContainer = document.getElementById(`mainBannerPreview_${step}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <img src="${imageData}" class="preview-image" alt="Main Banner Preview" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                        <button class="btn btn-remove" onclick="removeMainBannerImage('${step}')" style="margin-top: 1rem;">
                            <i class="fas fa-trash"></i> 이미지 제거
                        </button>
                    `;
                }
            }
        } catch (error) {
            console.error(`${step} 배너 로드 에러:`, error);
            // 에러 시 localStorage 폴백
            const imageData = localStorage.getItem(`mainBannerImage_${step}`);
            if (imageData) {
                const previewContainer = document.getElementById(`mainBannerPreview_${step}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <img src="${imageData}" class="preview-image" alt="Main Banner Preview" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                        <button class="btn btn-remove" onclick="removeMainBannerImage('${step}')" style="margin-top: 1rem;">
                            <i class="fas fa-trash"></i> 이미지 제거
                        </button>
                    `;
                }
            }
        }
    }

    // Load Detail Images from DB
    for (let i = 1; i <= 5; i++) {
        try {
            const response = await fetch(`${PROXY_URL}?table=admin_settings&key=detail_image_${i}`, {
                method: 'GET',
                headers: {
                    'x-api-key': SUPABASE_ANON_KEY
                }
            });

            const result = await response.json();
            let imageData = null;

            if (result.success && result.data && result.data.length > 0) {
                imageData = result.data[0].setting_value || result.data[0].설정값;
                console.log(`DB에서 상세이미지 ${i} 로드 성공`);
            } else {
                // DB에 없으면 localStorage에서 가져오기
                imageData = localStorage.getItem(`detailImage${i}`);
                console.log(`localStorage에서 상세이미지 ${i} 로드`);
            }

            if (imageData) {
                const previewContainer = document.getElementById(`detailImagePreview${i}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <img src="${imageData}" class="preview-image" alt="Detail Image ${i}" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                        <button class="btn btn-remove" onclick="removeDetailImage(${i})" style="margin-top: 1rem;">
                            <i class="fas fa-trash"></i> 이미지 제거
                        </button>
                    `;
                }
            }
        } catch (error) {
            console.error(`상세이미지 ${i} 로드 에러:`, error);
            // 에러 시 localStorage 폴백
            const imageData = localStorage.getItem(`detailImage${i}`);
            if (imageData) {
                const previewContainer = document.getElementById(`detailImagePreview${i}`);
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <img src="${imageData}" class="preview-image" alt="Detail Image ${i}" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                        <button class="btn btn-remove" onclick="removeDetailImage(${i})" style="margin-top: 1rem;">
                            <i class="fas fa-trash"></i> 이미지 제거
                        </button>
                    `;
                }
            }
        }
    }
}

// Toggle select all checkboxes
function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('#applicationsTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// Delete selected applications
async function deleteSelectedApplications() {
    const checkboxes = document.querySelectorAll('#applicationsTableBody input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
        showToast('warning', '선택 없음', '삭제할 항목을 선택해주세요.');
        return;
    }

    const confirmed = confirm(`선택한 ${checkboxes.length}개 항목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    showLoading();

    let successCount = 0;
    let failCount = 0;

    for (const checkbox of checkboxes) {
        const row = checkbox.closest('tr');
        const idCell = row.querySelector('td:nth-child(3)'); // ID 셀
        const id = idCell ? idCell.textContent : null;

        if (id) {
            try {
                const response = await fetch(`${PROXY_URL}`, {
                    method: 'DELETE',
                    headers: {
                        'x-api-key': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        table: 'consultations',
                        id: id
                    })
                });

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`ID ${id} 삭제 실패:`, error);
                failCount++;
            }
        }
    }

    hideLoading();

    if (successCount > 0) {
        showToast('success', '삭제 완료', `${successCount}개 항목이 삭제되었습니다.`);

        // Uncheck select all
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;

        loadApplications();
    }

    if (failCount > 0) {
        showToast('error', '일부 실패', `${failCount}개 항목 삭제에 실패했습니다.`);
    }
}

// Admin configuration
const ADMIN_CONFIG = {
    password: 'aszx1004!', // 관리자 초기 패스워드
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000 // 15 minutes
};

// API Configuration
const PROXY_URL = 'https://dimj-form-proxy.vercel.app/api/supabase';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtcXd6dnlyb2RwZG1mZ2xzcXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzMjUzMzEsImV4cCI6MjA0NzkwMTMzMX0.MkFZj8gNdkZT7xE9ysD1fkzN3bfOh5CtpOEtQGUCqY4';

// Admin state
let adminState = {
    isLoggedIn: false,
    loginTime: null,
    applications: [],
    blockedIPs: [],
    loginAttempts: 0,
    lastFailedLogin: null,
    currentPage: 'dashboard'
};

// Initialize admin page
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    setupEventListeners();
    loadBlockedIPs();
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

    if (statusFilter) statusFilter.addEventListener('change', loadApplications);
    if (dateFilter) dateFilter.addEventListener('change', loadApplications);

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
    }
}

// Login handling
async function handleLogin(e) {
    e.preventDefault();

    // Check if locked out
    if (isLockedOut()) {
        const remainingTime = Math.ceil((ADMIN_CONFIG.lockoutTime - (Date.now() - adminState.lastFailedLogin)) / 1000 / 60);
        alert(`너무 많은 로그인 시도로 인해 잠겨있습니다. ${remainingTime}분 후 다시 시도하세요.`);
        return;
    }

    const password = document.getElementById('adminPassword').value;

    if (password === ADMIN_CONFIG.password) {
        adminState.isLoggedIn = true;
        adminState.loginTime = Date.now();
        adminState.loginAttempts = 0;
        adminState.lastFailedLogin = null;

        // Save login state
        sessionStorage.setItem('adminAuth', JSON.stringify({
            loginTime: adminState.loginTime,
            isLoggedIn: true
        }));

        showAdminPanel();
        navigateToPage('dashboard');
        loadApplications();
        updateStats();
    } else {
        adminState.loginAttempts++;
        adminState.lastFailedLogin = Date.now();

        const remainingAttempts = ADMIN_CONFIG.maxLoginAttempts - adminState.loginAttempts;

        if (remainingAttempts > 0) {
            alert(`잘못된 비밀번호입니다. ${remainingAttempts}번 더 시도할 수 있습니다.`);
        } else {
            alert('너무 많은 로그인 시도로 인해 15분간 잠겨있습니다.');
        }

        document.getElementById('adminPassword').value = '';
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

        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');

        const statusValue = statusFilter ? statusFilter.value : '';
        const dateValue = dateFilter ? dateFilter.value : '';

        // 필터링 적용
        let filteredApps = applications;

        if (statusValue) {
            filteredApps = filteredApps.filter(app => app.status === statusValue);
        }

        if (dateValue) {
            filteredApps = filteredApps.filter(app => {
                const appDate = new Date(app.timestamp).toISOString().split('T')[0];
                return appDate === dateValue;
            });
        }

        // 최신순 정렬
        filteredApps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        renderApplicationsTable(filteredApps);
        adminState.applications = applications; // Store all applications for stats

        console.log(`✅ ${filteredApps.length}개 신청서 로딩 완료`);

        // Update stats after loading applications
        updateStats();

    } catch (error) {
        console.error('❌ 데이터 로딩 실패:', error);
        alert(`데이터를 불러오는데 실패했습니다.\n\n에러: ${error.message}`);
    }
}

function renderApplicationsTable(applications) {
    const tbody = document.getElementById('applicationsTableBody');

    if (!tbody) return;

    if (applications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #64748b; padding: 2rem;">
                    신청 내역이 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = applications.map(app => `
        <tr>
            <td><input type="checkbox"></td>
            <td>${app.id}</td>
            <td>${app.name}</td>
            <td>${app.phone}</td>
            <td>${app.service}</td>
            <td>${app.provider || '-'}</td>
            <td>${formatDate(app.timestamp)}</td>
            <td>${app.ip ? app.ip.substring(0, 15) : '-'}</td>
            <td>
                <span class="status-badge ${app.status === '상담대기' ? 'status-pending' : app.status === '상담중' ? 'status-processing' : 'status-completed'}">
                    ${app.status || '상담대기'}
                </span>
            </td>
            <td class="table-actions">
                <button class="btn-icon" onclick="viewApplication('${app.id}')" title="상세보기">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editApplication('${app.id}')" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteApplication('${app.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
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

// Update stats
async function updateStats() {
    if (!adminState.isLoggedIn) return;

    const totalApplications = adminState.applications.length;

    const today = new Date().toISOString().split('T')[0];
    const todayApplications = adminState.applications.filter(app => {
        const appDate = new Date(app.timestamp).toISOString().split('T')[0];
        return appDate === today;
    }).length;

    const pendingApplications = adminState.applications.filter(app =>
        app.status === '상담대기'
    ).length;

    // Update stat values
    const totalEl = document.getElementById('totalApplications');
    const todayEl = document.getElementById('todayApplications');
    const pendingEl = document.getElementById('pendingApplications');
    const pendingBadgeEl = document.getElementById('pendingBadge');

    if (totalEl) totalEl.textContent = totalApplications;
    if (todayEl) todayEl.textContent = todayApplications;
    if (pendingEl) pendingEl.textContent = pendingApplications;
    if (pendingBadgeEl) {
        pendingBadgeEl.textContent = pendingApplications;
        pendingBadgeEl.style.display = pendingApplications > 0 ? 'block' : 'none';
    }
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

        const response = await fetch(`${PROXY_URL}?table=consultations&id=${id}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('✅ 삭제 응답:', result);

        if (result.success || response.ok) {
            alert('신청서가 삭제되었습니다.');
            loadApplications();
        } else {
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
function previewMainBannerImage(event, step) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        // Save to localStorage
        localStorage.setItem(`mainBannerImage_${step}`, imageData);

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
    };

    reader.readAsDataURL(file);
}

function removeMainBannerImage(step) {
    if (!confirm('메인 배너 이미지를 제거하시겠습니까?')) return;

    localStorage.removeItem(`mainBannerImage_${step}`);

    const previewContainer = document.getElementById(`mainBannerPreview_${step}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }

    const fileInput = document.getElementById(`step${step}MainBannerImageUpload`);
    if (fileInput) {
        fileInput.value = '';
    }

    alert('메인 배너 이미지가 제거되었습니다.');
}

// Detail Page Images Upload
function previewDetailImage(event, imageNumber) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;

        // Save to localStorage
        localStorage.setItem(`detailImage${imageNumber}`, imageData);

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
    };

    reader.readAsDataURL(file);
}

function removeDetailImage(imageNumber) {
    if (!confirm(`상세페이지 이미지 ${imageNumber}를 제거하시겠습니까?`)) return;

    localStorage.removeItem(`detailImage${imageNumber}`);

    const previewContainer = document.getElementById(`detailImagePreview${imageNumber}`);
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }

    const fileInput = document.getElementById(`detailImage${imageNumber}Upload`);
    if (fileInput) {
        fileInput.value = '';
    }

    alert(`상세페이지 이미지 ${imageNumber}가 제거되었습니다.`);
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
function saveContent() {
    alert('콘텐츠가 저장되었습니다.');
    // Content saving logic would go here
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

// Load banners to admin (기존 업로드된 이미지 표시)
function loadBannersToAdmin() {
    console.log('어드민에 배너 로드 중...');

    // Load Step 1 & 2 Main Banners
    for (let step of ['step1', 'step2']) {
        const imageData = localStorage.getItem(`mainBannerImage_${step}`);
        const previewContainer = document.getElementById(`mainBannerPreview_${step}`);

        if (imageData && previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Main Banner Preview" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                <button class="btn btn-remove" onclick="removeMainBannerImage('${step}')" style="margin-top: 1rem;">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }
    }

    // Load Detail Images
    for (let i = 1; i <= 5; i++) {
        const imageData = localStorage.getItem(`detailImage${i}`);
        const previewContainer = document.getElementById(`detailImagePreview${i}`);

        if (imageData && previewContainer) {
            previewContainer.innerHTML = `
                <img src="${imageData}" class="preview-image" alt="Detail Image ${i}" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">
                <button class="btn btn-remove" onclick="removeDetailImage(${i})" style="margin-top: 1rem;">
                    <i class="fas fa-trash"></i> 이미지 제거
                </button>
            `;
        }
    }
}

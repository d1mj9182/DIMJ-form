// Admin configuration
const ADMIN_CONFIG = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 999999, // 로그인 시도 제한 해제
    lockoutTime: 0 // 잠금 시간 없음
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
    lastFailedLogin: null
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

    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (statusFilter) statusFilter.addEventListener('change', loadApplications);
    if (dateFilter) dateFilter.addEventListener('change', loadApplications);

    // 날짜 필터 기본값 제거 - 전체 보기로 시작
    // if (dateFilter) {
    //     dateFilter.value = new Date().toISOString().split('T')[0];
    // }
}

// Hash password using SHA-256
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

        if (masterResult.success && masterResult.data && masterResult.data.length > 0) {
            const masterHash = masterResult.data[0].setting_value || masterResult.data[0].설정값;
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

        if (result.success && result.data && result.data.length > 0) {
            // 가장 최신 패스워드 사용 (배열의 마지막)
            const latestPassword = result.data[result.data.length - 1];
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
        alert(`너무 많은 로그인 시도로 인해 잠겨있습니다. ${remainingTime}분 후 다시 시도하세요.`);
        return;
    }

    const password = document.getElementById('adminPassword').value;

    const isValid = await verifyPassword(password);

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

        showAdminPanel();
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
            loadApplications();
            updateStats();
        } else {
            logout();
        }
    }
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminMain').style.display = 'block';
    
    // Load detail page content
    setTimeout(() => {
        loadDetailPageContent();
    }, 100);
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

    // Load from both localStorage and Supabase
    const localApplications = getAllApplications();
    let supabaseApplications = [];

    // Try to fetch from Supabase through proxy server
    try {
        const response = await fetch(`https://dimj-form-proxy.vercel.app/api/supabase`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.records) {
                    supabaseApplications = data.records.map(record => ({
                        id: record.id,
                        name: record.name || '',
                        phone: record.phone || '',
                        service: record.main_service || '',
                        provider: record.carrier || '',
                        preference: record.preferred_time || '',
                        timestamp: record.created_at || '',
                        ip: record.ip_address || '',
                        status: record.status || '상담대기',
                        giftAmount: record.gift_amount || 0,
                        additionalServices: record.other_service || '',
                        source: 'supabase'
                    }));
                    console.log(`Supabase에서 ${supabaseApplications.length}개 신청 로드됨`);
                }
            }
        }
    } catch (error) {
        console.error('Supabase 데이터 로드 실패:', error);
    }

    // Merge applications (Supabase takes priority over localStorage)
    const allApplications = mergeApplications(localApplications, supabaseApplications);

    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    // Filter applications
    let filteredApps = allApplications;
    
    if (statusFilter) {
        filteredApps = filteredApps.filter(app => app.status === statusFilter);
    }
    
    if (dateFilter) {
        filteredApps = filteredApps.filter(app => {
            const appDate = new Date(app.timestamp).toISOString().split('T')[0];
            return appDate === dateFilter;
        });
    }
    
    // Sort by timestamp (newest first) - 최신 접수건이 상단에 표시
    filteredApps.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA; // 최신 날짜가 위로
    });
    
    renderApplicationsTable(filteredApps);
    adminState.applications = filteredApps;
}

function getAllApplications() {
    // Get all applications from localStorage
    const applications = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('application_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                applications.push({
                    id: key.replace('application_', ''),
                    ...data
                });
            } catch (error) {
                console.error('Error parsing application data:', error);
            }
        }
    }
    
    return applications;
}

function mergeApplications(localApps, supabaseApps) {
    // Create a map to avoid duplicates (Supabase takes priority)
    const mergedMap = new Map();

    // Add local applications first
    localApps.forEach(app => {
        mergedMap.set(app.id, { ...app, source: 'local' });
    });

    // Add Supabase applications (overwrite local ones with same ID)
    supabaseApps.forEach(app => {
        mergedMap.set(app.id, app);
    });

    return Array.from(mergedMap.values());
}

function renderApplicationsTable(applications) {
    const tbody = document.getElementById('applicationsTableBody');

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

    // 자동 순서 번호 부여 (1, 2, 3, 4, 5...)
    tbody.innerHTML = applications.map((app, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${app.name}</td>
            <td>${app.phone}</td>
            <td>${app.service}${app.additionalServices ? ` + ${app.additionalServices}` : ''}</td>
            <td>${app.provider || '-'}</td>
            <td>${app.preference || '빠른 시간'}</td>
            <td>${formatDate(app.timestamp)}</td>
            <td>${app.ip ? app.ip.substring(0, 12) + '...' : '-'}</td>
            <td>
                <span class="status-badge status-${app.status || 'pending'}">${getStatusText(app.status)}</span>
                <span class="source-badge ${app.source || 'local'}">${app.source === 'supabase' ? 'SB' : 'Local'}</span>
            </td>
            <td>${app.giftAmount ? app.giftAmount + '만원' : '-'}</td>
            <td>
                <button class="action-btn" onclick="updateStatus('${app.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn" onclick="updateGiftAmount('${app.id}')">
                    <i class="fas fa-won"></i>
                </button>
                <button class="action-btn delete" onclick="deleteApplication('${app.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusText(status) {
    switch (status) {
        case '상담대기': return '상담대기';
        case '상담중': return '상담중';
        case '상담완료': return '상담완료';
        case '설치예약': return '설치예약';
        case '설치완료': return '설치완료';
        // 기존 상태 호환성 유지
        case 'pending': return '상담대기';
        case 'contacted': return '상담완료';
        case 'completed': return '설치완료';
        default: return '상담대기';
    }
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

function updateStatus(id) {
    const newStatus = prompt('상태를 선택하세요:\n1. 상담대기\n2. 상담중\n3. 상담완료\n4. 설치예약\n5. 설치완료', '1');

    const statusMap = {
        '1': '상담대기',
        '2': '상담중',
        '3': '상담완료',
        '4': '설치예약',
        '5': '설치완료'
    };

    if (statusMap[newStatus]) {
        const appKey = `application_${id}`;
        const appData = JSON.parse(localStorage.getItem(appKey));
        appData.status = statusMap[newStatus];
        localStorage.setItem(appKey, JSON.stringify(appData));

        loadApplications();
        updateStats();
    }
}

function updateGiftAmount(id) {
    const newAmount = prompt('사은품 금액을 입력하세요 (만원 단위):', '0');

    if (newAmount !== null && !isNaN(newAmount)) {
        const amount = parseInt(newAmount, 10);

        // Update in localStorage if exists
        const appKey = `application_${id}`;
        const appData = localStorage.getItem(appKey);
        if (appData) {
            const parsedData = JSON.parse(appData);
            parsedData.giftAmount = amount;
            localStorage.setItem(appKey, JSON.stringify(parsedData));
        }

        // TODO: Update in Supabase through proxy server
        // This would require implementing an UPDATE API endpoint in the proxy server

        loadApplications();
        updateStats();
    }
}

async function deleteApplication(id) {
    if (confirm('정말로 이 신청을 삭제하시겠습니까? (localStorage + Supabase에서 모두 삭제됩니다)')) {
        try {
            // 1. localStorage에서 삭제
            localStorage.removeItem(`application_${id}`);
            console.log(`✅ localStorage에서 삭제 완료: application_${id}`);

            // 2. Supabase에서 삭제 (프록시 서버를 통해)
            const response = await fetch('https://dimj-form-proxy.vercel.app/api/supabase', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'consultations',
                    id: id
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Supabase에서 삭제 완료:', id);
                    alert('신청이 모든 시스템에서 삭제되었습니다.');
                } else {
                    console.error('❌ Supabase 삭제 실패:', result.error);
                    alert('Supabase 삭제 중 오류가 발생했습니다: ' + result.error);
                }
            } else {
                console.error('❌ 삭제 요청 실패:', response.status);
                alert('삭제 요청이 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 삭제 중 오류:', error);
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
        }

        // 목록 새로고침
        loadApplications();
        updateStats();
    }
}

// Statistics
function updateStats() {
    if (!adminState.isLoggedIn) return;
    
    const allApplications = getAllApplications();
    const today = new Date().toISOString().split('T')[0];
    const todayApps = allApplications.filter(app => {
        return new Date(app.timestamp).toISOString().split('T')[0] === today;
    });
    
    const pendingApps = allApplications.filter(app => 
        !app.status || app.status === 'pending'
    );
    
    // Get today's visitors count
    const visitors = JSON.parse(localStorage.getItem('dailyVisitors') || '{}');
    const todayVisitors = visitors[today] || 0;
    
    document.getElementById('totalApplications').textContent = allApplications.length;
    document.getElementById('todayApplications').textContent = todayApps.length;
    document.getElementById('pendingApplications').textContent = pendingApps.length;
    document.getElementById('blockedIPs').textContent = adminState.blockedIPs.length;
    document.getElementById('todayVisitors').textContent = todayVisitors;
}

// Control functions
function exportData() {
    const applications = getAllApplications();
    const dataStr = JSON.stringify(applications, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `applications_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function clearOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
    
    if (confirm('30일 이전의 데이터를 모두 삭제하시겠습니까?')) {
        let deletedCount = 0;
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('application_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (new Date(data.timestamp) < cutoffDate) {
                        localStorage.removeItem(key);
                        deletedCount++;
                    }
                } catch (error) {
                    console.error('Error processing old data:', error);
                }
            }
        }
        
        alert(`${deletedCount}개의 오래된 신청이 삭제되었습니다.`);
        loadApplications();
        updateStats();
    }
}

function resetDailyLimits() {
    if (confirm('모든 일일 제한을 리셋하시겠습니까?')) {
        // Remove all submit count entries
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('submit_count_')) {
                localStorage.removeItem(key);
            }
        }
        
        alert('모든 일일 제한이 리셋되었습니다.');
    }
}

// IP blocking
function loadBlockedIPs() {
    const blocked = localStorage.getItem('blockedIPs');
    adminState.blockedIPs = blocked ? JSON.parse(blocked) : [];
    renderBlockedIPs();
}

function blockIP() {
    const ip = document.getElementById('ipInput').value.trim();
    
    if (!ip) {
        alert('IP 주소를 입력해주세요.');
        return;
    }
    
    if (!isValidIP(ip)) {
        alert('올바른 IP 주소 형식이 아닙니다.');
        return;
    }
    
    if (adminState.blockedIPs.includes(ip)) {
        alert('이미 차단된 IP 주소입니다.');
        return;
    }
    
    adminState.blockedIPs.push(ip);
    localStorage.setItem('blockedIPs', JSON.stringify(adminState.blockedIPs));
    
    document.getElementById('ipInput').value = '';
    renderBlockedIPs();
    updateStats();
}

function unblockIP(ip) {
    if (confirm(`${ip}의 차단을 해제하시겠습니까?`)) {
        adminState.blockedIPs = adminState.blockedIPs.filter(blocked => blocked !== ip);
        localStorage.setItem('blockedIPs', JSON.stringify(adminState.blockedIPs));
        renderBlockedIPs();
        updateStats();
    }
}

function renderBlockedIPs() {
    const container = document.getElementById('blockedIPsList');
    
    if (adminState.blockedIPs.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">차단된 IP가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = adminState.blockedIPs.map(ip => `
        <div class="blocked-ip">
            ${ip}
            <button class="unblock-btn" onclick="unblockIP('${ip}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// Session management
setInterval(() => {
    if (adminState.isLoggedIn && adminState.loginTime) {
        const elapsed = Date.now() - adminState.loginTime;
        if (elapsed >= ADMIN_CONFIG.sessionTimeout) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            logout();
        }
    }
}, 60000); // Check every minute

// Page content management
let pageContent = {
    mainPage: {
        heroTitle: '🏆 인터넷·TV·가전렌탈 성지',
        heroSubtitle: '💰 120만원 현금사은품 당일지급',
        heroNote: '(2025년 9월 기준, 사은품 금액은 변동될 수 있습니다)',
        warningTitle: '⚠️ 인터넷·TV 방치하면 130만원 손해',
        warningContent: '전화할 때마다 다른 금액? 이제는 모두에게 똑같이! 정찰제 도입',
        cashRewardAmount: 120,
        totalLossAmount: 130
    },
    hero: {
        title: '⚠️ 인터넷·TV 방치하면 130만원 손해',
        subtitle: '알고 계셨나요? 통신비 정찰제 도입으로 누구나 동일한 혜택을 받을 수 있습니다!'
    },
    loss: {
        internet: 60,
        iptv: 40,
        gift: 30
    },
    comparison: {
        oldInternet: 8,
        newInternet: 3,
        oldIptv: 5,
        newIptv: 2,
        giftAmount: 120
    },
    testimonials: [
        {
            content: '정말 몰랐던 사실이네요. 상담받고 연 80만원 절약하고 사은품까지 받았어요!',
            author: '김○○님',
            location: '서울 강남구'
        },
        {
            content: '3년 동안 비싼 요금 내고 있었는데, 당일민족 덕분에 해결됐습니다.',
            author: '이○○님',
            location: '부산 해운대구'
        },
        {
            content: '당일 설치에 현금사은품까지! 정말 만족스러운 서비스였습니다.',
            author: '박○○님',
            location: '대구 수성구'
        }
    ],
    faq: [
        {
            question: '정말 130만원이나 손해를 보고 있나요?',
            answer: '네, 맞습니다. 기존 요금제 유지시 연간 인터넷 60만원 + IPTV 40만원 + 사은품 혜택 30만원으로 총 130만원의 손해가 발생할 수 있습니다. 이는 2025년 1월 기준 평균 산정 금액입니다.'
        },
        {
            question: '상담비용이 있나요?',
            answer: '아니요, 상담은 완전 무료입니다. 요금제 분석, 비교, 제안 모든 과정이 무료로 제공됩니다.'
        },
        {
            question: '현금사은품은 언제 받나요?',
            answer: '설치 완료 당일에 현금으로 지급됩니다. 최대 120만원까지 받으실 수 있습니다.'
        }
    ]
};

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Add active class to clicked tab and corresponding content
    event.target.classList.add('active');
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
    }
    
    // Load content for the selected tab
    loadTabContent(tabName);
}

function loadTabContent(tabName) {
    switch(tabName) {
        case 'mainPage':
            if (document.getElementById('mainHeroTitle')) {
                document.getElementById('mainHeroTitle').value = pageContent.mainPage.heroTitle;
                document.getElementById('mainHeroSubtitle').value = pageContent.mainPage.heroSubtitle;
                document.getElementById('mainHeroNote').value = pageContent.mainPage.heroNote;
                document.getElementById('warningTitle').value = pageContent.mainPage.warningTitle;
                document.getElementById('warningContent').value = pageContent.mainPage.warningContent;
                document.getElementById('cashRewardAmount').value = pageContent.mainPage.cashRewardAmount;
                document.getElementById('totalLossAmount').value = pageContent.mainPage.totalLossAmount;
            }
            break;
            
        case 'mainBanner':
            loadMainBannerSettings();
            break;
            
            
        case 'banner':
            loadBannerSettings();
            break;
            
        case 'hero':
            if (document.getElementById('heroTitle')) {
                document.getElementById('heroTitle').value = pageContent.hero.title;
                document.getElementById('heroSubtitle').value = pageContent.hero.subtitle;
            }
            break;
            
        case 'loss':
            if (document.getElementById('internetLoss')) {
                document.getElementById('internetLoss').value = pageContent.loss.internet;
                document.getElementById('iptvLoss').value = pageContent.loss.iptv;
                document.getElementById('giftLoss').value = pageContent.loss.gift;
                updateTotalLoss();
            }
            break;
            
        case 'comparison':
            if (document.getElementById('oldInternet')) {
                document.getElementById('oldInternet').value = pageContent.comparison.oldInternet;
                document.getElementById('newInternet').value = pageContent.comparison.newInternet;
                document.getElementById('oldIptv').value = pageContent.comparison.oldIptv;
                document.getElementById('newIptv').value = pageContent.comparison.newIptv;
                document.getElementById('giftAmount').value = pageContent.comparison.giftAmount;
            }
            break;
            
        case 'testimonials':
            pageContent.testimonials.forEach((testimonial, index) => {
                const contentEl = document.getElementById(`testimonial${index + 1}`);
                const authorEl = document.getElementById(`author${index + 1}`);
                const locationEl = document.getElementById(`location${index + 1}`);
                
                if (contentEl) contentEl.value = testimonial.content;
                if (authorEl) authorEl.value = testimonial.author;
                if (locationEl) locationEl.value = testimonial.location;
            });
            break;
            
        case 'faq':
            pageContent.faq.forEach((item, index) => {
                const questionEl = document.getElementById(`faqQ${index + 1}`);
                const answerEl = document.getElementById(`faqA${index + 1}`);
                
                if (questionEl) questionEl.value = item.question;
                if (answerEl) answerEl.value = item.answer;
            });
            break;
            
        case 'fraudWarning':
            const fraudWarningMessage = document.getElementById('fraudWarningMessage');
            if (fraudWarningMessage) {
                const savedContent = localStorage.getItem('adminContent');
                if (savedContent) {
                    const content = JSON.parse(savedContent);
                    if (content.fraudWarningMessage) {
                        fraudWarningMessage.value = content.fraudWarningMessage;
                    }
                } else if (pageContent.fraudWarningMessage) {
                    fraudWarningMessage.value = pageContent.fraudWarningMessage;
                }
            }
            break;
            
        case 'detailImages':
            loadDetailImagesSettings();
            break;
    }
}

function updateTotalLoss() {
    const internetEl = document.getElementById('internetLoss');
    const iptvEl = document.getElementById('iptvLoss');
    const giftEl = document.getElementById('giftLoss');
    const totalEl = document.getElementById('totalLossDisplay');
    
    if (internetEl && iptvEl && giftEl && totalEl) {
        const internet = parseInt(internetEl.value) || 0;
        const iptv = parseInt(iptvEl.value) || 0;
        const gift = parseInt(giftEl.value) || 0;
        const total = internet + iptv + gift;
        
        totalEl.textContent = total;
    }
}

function loadDetailPageContent() {
    const saved = localStorage.getItem('detailPageContent');
    if (saved) {
        try {
            pageContent = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading saved page content:', e);
        }
    }
    
    // Set up event listeners for loss calculation
    setTimeout(() => {
        const internetEl = document.getElementById('internetLoss');
        const iptvEl = document.getElementById('iptvLoss');
        const giftEl = document.getElementById('giftLoss');
        
        if (internetEl && iptvEl && giftEl) {
            internetEl.addEventListener('input', updateTotalLoss);
            iptvEl.addEventListener('input', updateTotalLoss);
            giftEl.addEventListener('input', updateTotalLoss);
        }
    }, 100);
    
    // Load initial tab content
    loadTabContent('mainPage');
}

function saveDetailPageContent() {
    try {
        // Load existing content first to preserve banner settings
        const existingSavedContent = localStorage.getItem('detailPageContent');
        if (existingSavedContent) {
            const existingContent = JSON.parse(existingSavedContent);
            // Preserve banner settings if they exist
            if (existingContent.banner) {
                pageContent.banner = existingContent.banner;
            }
            if (existingContent.mainBanners) {
                pageContent.mainBanners = existingContent.mainBanners;
            }
            if (existingContent.detailImages) {
                pageContent.detailImages = existingContent.detailImages;
            }
        }
        
        // Collect main page data
        const mainHeroTitle = document.getElementById('mainHeroTitle');
        const mainHeroSubtitle = document.getElementById('mainHeroSubtitle');
        const mainHeroNote = document.getElementById('mainHeroNote');
        const warningTitle = document.getElementById('warningTitle');
        const warningContent = document.getElementById('warningContent');
        const cashRewardAmount = document.getElementById('cashRewardAmount');
        const totalLossAmount = document.getElementById('totalLossAmount');
        const fraudWarningMessage = document.getElementById('fraudWarningMessage');
        
        if (mainHeroTitle && mainHeroSubtitle && mainHeroNote && warningTitle && warningContent) {
            pageContent.mainPage.heroTitle = mainHeroTitle.value;
            pageContent.mainPage.heroSubtitle = mainHeroSubtitle.value;
            pageContent.mainPage.heroNote = mainHeroNote.value;
            pageContent.mainPage.warningTitle = warningTitle.value;
            pageContent.mainPage.warningContent = warningContent.value;
            pageContent.mainPage.cashRewardAmount = parseInt(cashRewardAmount.value) || 120;
            pageContent.mainPage.totalLossAmount = parseInt(totalLossAmount.value) || 130;
        }
        
        // Collect detail page data
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        
        if (heroTitle && heroSubtitle) {
            pageContent.hero.title = heroTitle.value;
            pageContent.hero.subtitle = heroSubtitle.value;
        }
        
        const internetLoss = document.getElementById('internetLoss');
        const iptvLoss = document.getElementById('iptvLoss');
        const giftLoss = document.getElementById('giftLoss');
        
        if (internetLoss && iptvLoss && giftLoss) {
            pageContent.loss.internet = parseInt(internetLoss.value) || 0;
            pageContent.loss.iptv = parseInt(iptvLoss.value) || 0;
            pageContent.loss.gift = parseInt(giftLoss.value) || 0;
        }
        
        const oldInternet = document.getElementById('oldInternet');
        const newInternet = document.getElementById('newInternet');
        const oldIptv = document.getElementById('oldIptv');
        const newIptv = document.getElementById('newIptv');
        const giftAmount = document.getElementById('giftAmount');
        
        if (oldInternet && newInternet && oldIptv && newIptv && giftAmount) {
            pageContent.comparison.oldInternet = parseInt(oldInternet.value) || 0;
            pageContent.comparison.newInternet = parseInt(newInternet.value) || 0;
            pageContent.comparison.oldIptv = parseInt(oldIptv.value) || 0;
            pageContent.comparison.newIptv = parseInt(newIptv.value) || 0;
            pageContent.comparison.giftAmount = parseInt(giftAmount.value) || 0;
        }
        
        // Update testimonials
        for (let i = 0; i < 3; i++) {
            const contentEl = document.getElementById(`testimonial${i + 1}`);
            const authorEl = document.getElementById(`author${i + 1}`);
            const locationEl = document.getElementById(`location${i + 1}`);
            
            if (contentEl && authorEl && locationEl && pageContent.testimonials[i]) {
                pageContent.testimonials[i].content = contentEl.value;
                pageContent.testimonials[i].author = authorEl.value;
                pageContent.testimonials[i].location = locationEl.value;
            }
        }
        
        // Update FAQ
        for (let i = 0; i < pageContent.faq.length; i++) {
            const questionEl = document.getElementById(`faqQ${i + 1}`);
            const answerEl = document.getElementById(`faqA${i + 1}`);
            
            if (questionEl && answerEl && pageContent.faq[i]) {
                pageContent.faq[i].question = questionEl.value;
                pageContent.faq[i].answer = answerEl.value;
            }
        }
        
        // Don't call save functions here - they're already preserved from existing content
        
        // Save fraud warning message
        if (fraudWarningMessage) {
            pageContent.fraudWarningMessage = fraudWarningMessage.value;
        }
        
        // Save to localStorage
        localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
        
        // Also save to adminContent for the main site
        const adminContent = JSON.parse(localStorage.getItem('adminContent') || '{}');
        adminContent.fraudWarningMessage = fraudWarningMessage ? fraudWarningMessage.value : '부정클릭은 법적 처벌 대상입니다. 정당한 목적으로만 서비스를 이용해 주세요.';
        localStorage.setItem('adminContent', JSON.stringify(adminContent));
        
        // Show success message
        alert('상세 페이지 내용이 저장되었습니다!');
        
    } catch (error) {
        console.error('Error saving page content:', error);
        alert('저장 중 오류가 발생했습니다.');
    }
}

function previewDetailPage() {
    // Save current content first
    saveDetailPageContent();
    
    // Open detail page in new tab
    window.open('detail.html', '_blank');
}

function resetDetailPageContent() {
    if (confirm('정말로 모든 내용을 초기값으로 되돌리시겠습니까?')) {
        // Remove saved content
        localStorage.removeItem('detailPageContent');
        
        // Reset pageContent to defaults
        pageContent = {
            mainPage: {
                heroTitle: '🏆 인터넷·TV·가전렌탈 성지',
                heroSubtitle: '💰 120만원 현금사은품 당일지급',
                heroNote: '(2025년 9월 기준, 사은품 금액은 변동될 수 있습니다)',
                warningTitle: '⚠️ 인터넷·TV 방치하면 130만원 손해',
                warningContent: '전화할 때마다 다른 금액? 이제는 모두에게 똑같이! 정찰제 도입',
                cashRewardAmount: 120,
                totalLossAmount: 130
            },
            hero: {
                title: '⚠️ 인터넷·TV 방치하면 130만원 손해',
                subtitle: '알고 계셨나요? 통신비 정찰제 도입으로 누구나 동일한 혜택을 받을 수 있습니다!'
            },
            loss: {
                internet: 60,
                iptv: 40,
                gift: 30
            },
            comparison: {
                oldInternet: 8,
                newInternet: 3,
                oldIptv: 5,
                newIptv: 2,
                giftAmount: 120
            },
            testimonials: [
                {
                    content: '정말 몰랐던 사실이네요. 상담받고 연 80만원 절약하고 사은품까지 받았어요!',
                    author: '김○○님',
                    location: '서울 강남구'
                },
                {
                    content: '3년 동안 비싼 요금 내고 있었는데, 당일민족 덕분에 해결됐습니다.',
                    author: '이○○님',
                    location: '부산 해운대구'
                },
                {
                    content: '당일 설치에 현금사은품까지! 정말 만족스러운 서비스였습니다.',
                    author: '박○○님',
                    location: '대구 수성구'
                }
            ],
            faq: [
                {
                    question: '정말 130만원이나 손해를 보고 있나요?',
                    answer: '네, 맞습니다. 기존 요금제 유지시 연간 인터넷 60만원 + IPTV 40만원 + 사은품 혜택 30만원으로 총 130만원의 손해가 발생할 수 있습니다. 이는 2025년 1월 기준 평균 산정 금액입니다.'
                },
                {
                    question: '상담비용이 있나요?',
                    answer: '아니요, 상담은 완전 무료입니다. 요금제 분석, 비교, 제안 모든 과정이 무료로 제공됩니다.'
                },
                {
                    question: '현금사은품은 언제 받나요?',
                    answer: '설치 완료 당일에 현금으로 지급됩니다. 최대 120만원까지 받으실 수 있습니다.'
                }
            ]
        };
        
        // Reload current tab content
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const tabName = activeTab.textContent === '메인 페이지' ? 'mainPage' :
                           activeTab.textContent === '상세 제목' ? 'hero' :
                           activeTab.textContent === '손해 계산' ? 'loss' :
                           activeTab.textContent === '요금제 비교' ? 'comparison' :
                           activeTab.textContent === '고객 후기' ? 'testimonials' : 'faq';
            loadTabContent(tabName);
        }
        
        alert('모든 내용이 초기값으로 되돌려졌습니다.');
    }
}

function addFAQ() {
    const faqEditor = document.querySelector('.faq-editor');
    const newIndex = pageContent.faq.length + 1;
    
    const newFAQEditor = document.createElement('div');
    newFAQEditor.className = 'faq-item-editor';
    newFAQEditor.innerHTML = `
        <input type="text" placeholder="FAQ 질문 ${newIndex}" id="faqQ${newIndex}">
        <textarea rows="3" placeholder="FAQ 답변 ${newIndex}" id="faqA${newIndex}"></textarea>
        <button class="remove-faq-btn" onclick="removeFAQ(this)" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">
            <i class="fas fa-trash"></i> 삭제
        </button>
    `;
    
    // Insert before the add button
    const addBtn = document.querySelector('.add-faq-btn');
    faqEditor.insertBefore(newFAQEditor, addBtn);
    
    // Add to pageContent array
    pageContent.faq.push({
        question: '',
        answer: ''
    });
}

function removeFAQ(button) {
    if (confirm('이 FAQ를 삭제하시겠습니까?')) {
        const faqItem = button.closest('.faq-item-editor');
        const faqEditor = document.querySelector('.faq-editor');
        
        // Get index
        const index = Array.from(faqEditor.querySelectorAll('.faq-item-editor')).indexOf(faqItem);
        
        // Remove from DOM
        faqItem.remove();
        
        // Remove from pageContent
        pageContent.faq.splice(index, 1);
        
        // Update IDs of remaining FAQ items
        const remainingItems = faqEditor.querySelectorAll('.faq-item-editor');
        remainingItems.forEach((item, idx) => {
            const input = item.querySelector('input');
            const textarea = item.querySelector('textarea');
            
            if (input) input.id = `faqQ${idx + 1}`;
            if (textarea) textarea.id = `faqA${idx + 1}`;
        });
    }
}

// Banner Management Functions
function previewBannerImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imagePreview = document.getElementById('bannerImagePreview');
        const previewImage = document.getElementById('previewImage');
        const bannerPreviewContainer = document.getElementById('bannerPreviewContainer');
        
        previewImage.src = e.target.result;
        imagePreview.style.display = 'block';
        
        // Update banner preview background
        bannerPreviewContainer.style.backgroundImage = `url(${e.target.result})`;
        
        // Save image data to localStorage
        pageContent.banner = pageContent.banner || {};
        pageContent.banner.imageData = e.target.result;
        
        updateBannerPreview();
    };
    reader.readAsDataURL(file);
}

function removeBannerImage() {
    const imagePreview = document.getElementById('bannerImagePreview');
    const bannerPreviewContainer = document.getElementById('bannerPreviewContainer');
    const bannerImageUpload = document.getElementById('bannerImageUpload');
    
    imagePreview.style.display = 'none';
    bannerPreviewContainer.style.backgroundImage = '';
    bannerImageUpload.value = '';
    
    // Remove image data from storage
    if (pageContent.banner) {
        pageContent.banner.imageData = null;
    }
    
    updateBannerPreview();
}

function updateBannerPreview() {
    const bannerTitle = document.getElementById('bannerTitle').value || '🎯 실시간 상담 현황';
    const bannerDescription = document.getElementById('bannerDescription').value || '지금 이 순간에도 많은 고객님들이 최고의 혜택을 받고 계십니다!';
    
    const previewTitle = document.getElementById('previewTitle');
    const previewDescription = document.getElementById('previewDescription');
    
    if (previewTitle) previewTitle.textContent = bannerTitle;
    if (previewDescription) previewDescription.textContent = bannerDescription;
}

function loadBannerSettings() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) return;
    
    try {
        const content = JSON.parse(savedContent);
        if (content.banner) {
            // Load banner text content
            const bannerTitle = document.getElementById('bannerTitle');
            const bannerDescription = document.getElementById('bannerDescription');
            const bannerLink = document.getElementById('bannerLink');
            const bannerEnabled = document.getElementById('bannerEnabled');
            
            if (bannerTitle && content.banner.title) {
                bannerTitle.value = content.banner.title;
            }
            
            if (bannerDescription && content.banner.description) {
                bannerDescription.value = content.banner.description;
            }
            
            if (bannerLink && content.banner.link) {
                bannerLink.value = content.banner.link;
            }
            
            if (bannerEnabled && typeof content.banner.enabled === 'boolean') {
                bannerEnabled.checked = content.banner.enabled;
            }
            
            // Load banner image
            if (content.banner.imageData) {
                const imagePreview = document.getElementById('bannerImagePreview');
                const previewImage = document.getElementById('previewImage');
                const bannerPreviewContainer = document.getElementById('bannerPreviewContainer');
                
                previewImage.src = content.banner.imageData;
                imagePreview.style.display = 'block';
                bannerPreviewContainer.style.backgroundImage = `url(${content.banner.imageData})`;
            }
            
            updateBannerPreview();
        }
    } catch (error) {
        console.error('Error loading banner settings:', error);
    }
}

function saveBannerSettings() {
    const bannerTitle = document.getElementById('bannerTitle').value;
    const bannerDescription = document.getElementById('bannerDescription').value;
    const bannerLink = document.getElementById('bannerLink').value;
    const bannerEnabled = document.getElementById('bannerEnabled').checked;
    
    // Initialize banner object if it doesn't exist
    if (!pageContent.banner) {
        pageContent.banner = {};
    }
    
    pageContent.banner.title = bannerTitle;
    pageContent.banner.description = bannerDescription;
    pageContent.banner.link = bannerLink;
    pageContent.banner.enabled = bannerEnabled;
    
    // Save to localStorage
    localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
    
    console.log('Banner settings saved:', pageContent.banner);
}

// Main Banner Management Functions
function previewMainBannerImage(event, stepName) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imagePreview = document.getElementById(`${stepName}MainBannerImagePreview`);
        const previewImage = document.getElementById(`${stepName}PreviewImage`);
        
        previewImage.src = e.target.result;
        imagePreview.style.display = 'block';
        
        // Save image data to localStorage
        pageContent.mainBanners = pageContent.mainBanners || {};
        pageContent.mainBanners[stepName] = pageContent.mainBanners[stepName] || {};
        pageContent.mainBanners[stepName].imageData = e.target.result;
        pageContent.mainBanners[stepName].enabled = true; // Auto-enable when image is uploaded
        
        // Auto-save to localStorage immediately
        localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
        
        // Update enabled checkbox automatically
        const enabledCheckbox = document.getElementById(`${stepName}MainBannerEnabled`);
        if (enabledCheckbox) enabledCheckbox.checked = true;
    };
    reader.readAsDataURL(file);
}

function removeMainBannerImage(stepName) {
    const imagePreview = document.getElementById(`${stepName}MainBannerImagePreview`);
    const bannerImageUpload = document.getElementById(`${stepName}MainBannerImageUpload`);
    
    imagePreview.style.display = 'none';
    bannerImageUpload.value = '';
    
    // Remove image data from storage
    if (pageContent.mainBanners && pageContent.mainBanners[stepName]) {
        pageContent.mainBanners[stepName].imageData = null;
    }
}

function loadMainBannerSettings() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) return;
    
    try {
        const content = JSON.parse(savedContent);
        if (content.mainBanners) {
            ['step1', 'step2'].forEach(stepName => {
                const bannerData = content.mainBanners[stepName];
                if (bannerData) {
                    const enabledInput = document.getElementById(`${stepName}MainBannerEnabled`);
                    
                    if (enabledInput && typeof bannerData.enabled === 'boolean') {
                        enabledInput.checked = bannerData.enabled;
                    }
                    
                    // Load banner image
                    if (bannerData.imageData) {
                        const imagePreview = document.getElementById(`${stepName}MainBannerImagePreview`);
                        const previewImage = document.getElementById(`${stepName}PreviewImage`);
                        
                        if (imagePreview && previewImage) {
                            previewImage.src = bannerData.imageData;
                            imagePreview.style.display = 'block';
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading main banner settings:', error);
    }
}

function saveMainBannerSettings() {
    // Initialize main banners object if it doesn't exist
    if (!pageContent.mainBanners) {
        pageContent.mainBanners = {};
    }
    
    ['step1', 'step2'].forEach(stepName => {
        const enabledInput = document.getElementById(`${stepName}MainBannerEnabled`);
        
        if (!pageContent.mainBanners[stepName]) {
            pageContent.mainBanners[stepName] = {};
        }
        
        if (enabledInput) pageContent.mainBanners[stepName].enabled = enabledInput.checked;
        
        // Keep existing imageData if it exists
        // (imageData is saved when image is uploaded via previewMainBannerImage function)
    });
    
    // Save to localStorage
    localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
    
    console.log('Main banner settings saved:', pageContent.mainBanners);
}

// Detail Images Management Functions
function previewDetailImage(event, imageNumber) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imagePreview = document.getElementById(`detailImage${imageNumber}Preview`);
        const previewImage = document.getElementById(`detailPreview${imageNumber}`);
        
        previewImage.src = e.target.result;
        imagePreview.style.display = 'block';
        
        // Save image data to localStorage
        pageContent.detailImages = pageContent.detailImages || {};
        pageContent.detailImages.enabled = true; // Auto-enable when image is uploaded
        pageContent.detailImages[`image${imageNumber}`] = {
            imageData: e.target.result,
            caption: document.getElementById(`detailCaption${imageNumber}`).value || ''
        };
        
        // Auto-save to localStorage immediately
        localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
        
        // Update enabled checkbox automatically
        const enabledCheckbox = document.getElementById('detailImagesEnabled');
        if (enabledCheckbox) enabledCheckbox.checked = true;
    };
    reader.readAsDataURL(file);
}

function removeDetailImage(imageNumber) {
    const imagePreview = document.getElementById(`detailImage${imageNumber}Preview`);
    const imageUpload = document.getElementById(`detailImage${imageNumber}Upload`);
    const captionInput = document.getElementById(`detailCaption${imageNumber}`);
    
    imagePreview.style.display = 'none';
    imageUpload.value = '';
    if (captionInput) captionInput.value = '';
    
    // Remove image data from storage
    if (pageContent.detailImages && pageContent.detailImages[`image${imageNumber}`]) {
        delete pageContent.detailImages[`image${imageNumber}`];
    }
}

function loadDetailImagesSettings() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) return;
    
    try {
        const content = JSON.parse(savedContent);
        if (content.detailImages) {
            // Load enabled state
            const enabledInput = document.getElementById('detailImagesEnabled');
            if (enabledInput && typeof content.detailImages.enabled === 'boolean') {
                enabledInput.checked = content.detailImages.enabled;
            }
            
            // Load image (only 1 image now)
            const imageData = content.detailImages.image1;
            if (imageData) {
                const imagePreview = document.getElementById('detailImage1Preview');
                const previewImage = document.getElementById('detailPreview1');
                const captionInput = document.getElementById('detailCaption1');
                
                if (imagePreview && previewImage) {
                    previewImage.src = imageData.imageData;
                    imagePreview.style.display = 'block';
                }
                
                if (captionInput && imageData.caption) {
                    captionInput.value = imageData.caption;
                }
            }
        }
    } catch (error) {
        console.error('Error loading detail images settings:', error);
    }
}

function saveDetailImagesSettings() {
    // Initialize detail images object if it doesn't exist
    if (!pageContent.detailImages) {
        pageContent.detailImages = {};
    }
    
    const enabledInput = document.getElementById('detailImagesEnabled');
    if (enabledInput) {
        pageContent.detailImages.enabled = enabledInput.checked;
    }
    
    // Save caption for the single image
    const captionInput = document.getElementById('detailCaption1');
    if (captionInput && pageContent.detailImages.image1) {
        pageContent.detailImages.image1.caption = captionInput.value || '';
    }
    
    // Save to localStorage
    localStorage.setItem('detailPageContent', JSON.stringify(pageContent));
    
    console.log('Detail images settings saved:', pageContent.detailImages);
}


// Go to main page function
function goToMainPage() {
    window.open('index.html', '_blank');
}

// Make functions globally accessible
window.previewBannerImage = previewBannerImage;
window.removeBannerImage = removeBannerImage;
window.updateBannerPreview = updateBannerPreview;
window.previewMainBannerImage = previewMainBannerImage;
window.removeMainBannerImage = removeMainBannerImage;
window.loadMainBannerSettings = loadMainBannerSettings;
window.saveMainBannerSettings = saveMainBannerSettings;
window.previewDetailImage = previewDetailImage;
window.removeDetailImage = removeDetailImage;
window.loadDetailImagesSettings = loadDetailImagesSettings;
window.saveDetailImagesSettings = saveDetailImagesSettings;
window.goToMainPage = goToMainPage;

// Update consultation list with card UI
function updateConsultationList(data) {
    const container = document.querySelector('.consultation-list-container');

    if (!data || data.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = data.map(item => {
        // 이름 마스킹 (이○○ 형태)
        const maskedName = item.name ? item.name[0] + '○○' : '○○○';

        // 서비스 정보
        const serviceInfo = [item.carrier, item.main_service, item.other_service].filter(Boolean).join(' / ');

        // 상태별 색상
        const statusColors = {
            '상담대기': '#17a2b8',
            '상담중': '#dc3545',
            '상담완료': '#28a745',
            '설치예약': '#6f42c1',
            '설치완료': '#fd7e14'
        };

        return `
            <div style="
                background: rgba(30, 40, 50, 0.9);
                border: 1px solid rgba(40, 167, 69, 0.5);
                border-radius: 10px;
                padding: 15px 20px;
                margin-bottom: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: #fff; font-weight: bold;">
                        ${maskedName} 고객님
                    </div>
                    <div style="color: ${statusColors[item.status] || '#17a2b8'}; font-weight: bold;">
                        ${serviceInfo} | ${item.status || '상담대기'}
                    </div>
                </div>
                <div style="margin-top: 8px; color: #8fb6c4; font-size: 14px;">
                    연락처: ${item.phone || '-'} | 신호시간: ${item.preferred_time || '빠른 시간에 연락드립니다'}
                </div>
                <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6c757d; font-size: 12px;">
                        신청일: ${new Date(item.created_at).toLocaleDateString('ko-KR').slice(5)}
                    </span>
                    ${item.gift_amount ? `<span style="color: #ffc107; font-weight: bold; font-size: 16px;">${item.gift_amount}만원</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.updateConsultationList = updateConsultationList;


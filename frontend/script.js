// Global state
let currentStep = 1;
window.currentStep = currentStep;

// Simple nextStep function - defined early to ensure it's available
function nextStep() {
    console.log('nextStep function called, currentStep:', currentStep);

    if (currentStep >= 3) {
        console.log('Already at final step');
        return;
    }

    currentStep++;
    window.currentStep = currentStep;
    console.log('Moving to step:', currentStep);

    // Hide all steps
    const allSteps = document.querySelectorAll('.step-content');
    allSteps.forEach(step => step.classList.remove('active'));

    // Show current step
    const targetStep = document.getElementById(`step${currentStep}`);
    if (targetStep) {
        targetStep.classList.add('active');
        console.log('Successfully showed step', currentStep);

        // Step 2로 이동할 때 상담현황 너비 조정
        if (currentStep === 2) {
            setTimeout(adjustDesktopStatusWidth, 100);
        }
    } else {
        console.error('Could not find step element:', `step${currentStep}`);
    }
    
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = (currentStep / 3) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Update step indicator
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make it globally available immediately
window.nextStep = nextStep;

// Previous step function
function previousStep() {
    console.log('previousStep function called, currentStep:', currentStep);
    
    if (currentStep <= 1) {
        console.log('Already at first step');
        return;
    }
    
    currentStep--;
    window.currentStep = currentStep;
    console.log('Moving back to step:', currentStep);
    
    // Hide all steps
    const allSteps = document.querySelectorAll('.step-content');
    allSteps.forEach(step => step.classList.remove('active'));
    
    // Show current step
    const targetStep = document.getElementById(`step${currentStep}`);
    if (targetStep) {
        targetStep.classList.add('active');
        console.log('Successfully showed step', currentStep);
    } else {
        console.error('Could not find step element:', `step${currentStep}`);
    }
    
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = (currentStep / 3) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Update step indicator
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make it globally available
window.previousStep = previousStep;

// Preview Step 3 function
function previewStep3() {
    console.log('previewStep3 function called');
    
    // Set currentStep to 3 for preview
    const originalStep = currentStep;
    currentStep = 3;
    window.currentStep = currentStep;
    
    // Hide all steps
    const allSteps = document.querySelectorAll('.step-content');
    allSteps.forEach(step => step.classList.remove('active'));
    
    // Show step 3
    const step3 = document.getElementById('step3');
    if (step3) {
        step3.classList.add('active');
        
        // Display preview info
        const submittedInfoEl = document.getElementById('submittedInfo');
        if (submittedInfoEl) {
            submittedInfoEl.innerHTML = `
                <p><strong>이름:</strong> 홍길동 (미리보기)</p>
                <p><strong>연락처:</strong> 010-1234-5678 (미리보기)</p>
                <p><strong>관심 서비스:</strong> 인터넷, IPTV (미리보기)</p>
                <p><strong>선택 통신사:</strong> SK (미리보기)</p>
                <p><strong>희망 시간:</strong> 빠른 시간에 연락드립니다 (미리보기)</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-radius: 0.5rem; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; font-weight: 500;">
                        ⚠️ 이것은 미리보기입니다. 실제 신청 데이터가 아닙니다.
                    </p>
                </div>
            `;
        }
        
        console.log('Successfully showed step 3 preview');
    }
    
    // Update progress bar to 100%
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    // Update step indicator
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 <= 3) {
            step.classList.add('active');
        }
    });
    
    // Add back to form button
    setTimeout(() => {
        const completionContent = document.querySelector('.completion-content');
        if (completionContent) {
            const backToFormBtn = document.createElement('button');
            backToFormBtn.innerHTML = '<i class="fas fa-arrow-left"></i> 폼으로 돌아가기';
            backToFormBtn.className = 'back-to-form-btn';
            backToFormBtn.onclick = function() {
                // Restore original step
                currentStep = originalStep;
                window.currentStep = currentStep;
                
                // Show original step
                allSteps.forEach(step => step.classList.remove('active'));
                const targetStep = document.getElementById(`step${originalStep}`);
                if (targetStep) {
                    targetStep.classList.add('active');
                }
                
                // Update progress bar
                if (progressBar) {
                    const percentage = (currentStep / 3) * 100;
                    progressBar.style.width = `${percentage}%`;
                }
                
                // Update step indicator
                steps.forEach((step, index) => {
                    if (index + 1 <= currentStep) {
                        step.classList.add('active');
                    } else {
                        step.classList.remove('active');
                    }
                });
                
                // Remove the button
                this.remove();
            };
            
            // Check if button doesn't already exist
            if (!completionContent.querySelector('.back-to-form-btn')) {
                completionContent.appendChild(backToFormBtn);
            }
        }
    }, 100);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make it globally available
window.previewStep3 = previewStep3;

// Check URL hash for direct step access
function checkURLHash() {
    const hash = window.location.hash;
    console.log('Current URL hash:', hash);
    
    if (hash === '#step1') {
        goToStep(1);
    } else if (hash === '#step2') {
        goToStep(2);
    } else if (hash === '#step3') {
        goToStep(3, true); // true = preview mode for step 3
    }
}

// Go to specific step function
function goToStep(stepNumber, isPreview = false) {
    console.log('goToStep called:', stepNumber, isPreview ? '(preview)' : '');
    
    // Validate step number
    if (stepNumber < 1 || stepNumber > 3) {
        console.error('Invalid step number:', stepNumber);
        return;
    }
    
    // Update current step
    currentStep = stepNumber;
    window.currentStep = currentStep;
    
    // Hide all steps
    const allSteps = document.querySelectorAll('.step-content');
    allSteps.forEach(step => step.classList.remove('active'));
    
    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        console.log('Successfully showed step', stepNumber);
    } else {
        console.error('Could not find step element:', `step${stepNumber}`);
        return;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = (stepNumber / 3) * 100;
        progressBar.style.width = `${percentage}%`;
    }
    
    // Update step indicator
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index + 1 <= stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Special handling for step 3 (completion page)
    if (stepNumber === 3 && isPreview) {
        const submittedInfoEl = document.getElementById('submittedInfo');
        if (submittedInfoEl) {
            submittedInfoEl.innerHTML = `
                <p><strong>이름:</strong> 홍길동 (URL 미리보기)</p>
                <p><strong>연락처:</strong> 010-1234-5678 (URL 미리보기)</p>
                <p><strong>관심 서비스:</strong> 인터넷, IPTV (URL 미리보기)</p>
                <p><strong>선택 통신사:</strong> SK (URL 미리보기)</p>
                <p><strong>희망 시간:</strong> 빠른 시간에 연락드립니다 (URL 미리보기)</p>
                <div style="margin-top: 1rem; padding: 1rem; background: #e0f2fe; border-radius: 0.5rem; border-left: 4px solid #0ea5e9;">
                    <p style="color: #0c4a6e; font-weight: 500;">
                        💡 URL로 직접 접근한 3단계 미리보기입니다.
                    </p>
                    <p style="color: #0c4a6e; font-size: 0.875rem; margin-top: 0.5rem;">
                        다른 단계로 이동: <a href="#step1" style="color: #0ea5e9;">1단계</a> | <a href="#step2" style="color: #0ea5e9;">2단계</a>
                    </p>
                </div>
            `;
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Listen for hash changes
window.addEventListener('hashchange', function() {
    console.log('Hash changed, rechecking...');
    checkURLHash();
});

// Make functions globally available
window.checkURLHash = checkURLHash;
window.goToStep = goToStep;
let formData = {
    name: '',
    phone: '',
    service: '',
    provider: '',
    preference: ''
};

// Anti-fraud protection
let antiSpam = {
    isSubmitting: false,
    lastSubmitTime: 0,
    clickCount: 0,
    lastClickTime: 0,
    ipSubmitCount: 0,
    startTime: Date.now(),
    userInteractions: [],
    userIP: null,
    dailyLimit: 3
};

let realTimeData = {
    todayApplications: 47,
    cashReward: 1200,
    installationsCompleted: 23,
    onlineConsultants: 12,
    recentConsultations: []
};

// 데스크톱에서만 실시간 상담현황 너비 조정
function adjustDesktopStatusWidth() {
    if (window.innerWidth >= 1024) {
        console.log('Adjusting desktop status width...');

        // 여러 선택자로 실시간 상담현황 섹션 찾기
        const selectors = [
            '.status-board',
            '.status-section',
            '[class*="consultation"]',
            '[class*="status"]',
            'div:contains("실시간")',
            '#step2 .status-board', // 2페이지 내 status-board
            '.main-content .status-board'
        ];

        let found = false;
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && (element.textContent.includes('실시간') || element.classList.contains('status-board'))) {
                        element.style.cssText += `
                            max-width: 1200px !important;
                            margin: 40px auto !important;
                            width: 90% !important;
                            padding: 40px 20px !important;
                            box-sizing: border-box !important;
                        `;
                        console.log('Status section width adjusted:', element.className);
                        found = true;
                    }
                });
            } catch (e) {
                // 일부 브라우저에서 지원하지 않는 선택자 무시
            }
        });

        if (!found) {
            console.log('Status section not found, trying alternative method...');
            // 대안: step2 내의 모든 div 확인
            const step2 = document.getElementById('step2');
            if (step2) {
                const divs = step2.querySelectorAll('div');
                divs.forEach(div => {
                    if (div.style.background && div.style.background.includes('gradient')) {
                        div.style.cssText += `
                            max-width: 1200px !important;
                            margin: 40px auto !important;
                            width: 90% !important;
                        `;
                        console.log('Found gradient div, adjusted width');
                    }
                });
            }
        }
    }
}

// 페이지 로드와 리사이즈 시 실행
window.addEventListener('load', adjustDesktopStatusWidth);
window.addEventListener('resize', adjustDesktopStatusWidth);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing application');
    
    // Check URL hash for direct step access
    checkURLHash();
    trackVisitor();

    // 데스크톱 상담현황 너비 조정 실행
    adjustDesktopStatusWidth();

    // 스텝 변경 시에도 다시 실행
    setTimeout(adjustDesktopStatusWidth, 1000);
    
    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        // Handle typing/input
        phoneInput.addEventListener('input', function(e) {
            const formatted = formatPhoneNumber(e.target.value);
            e.target.value = formatted;
        });

        // Handle paste events
        phoneInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const formatted = formatPhoneNumber(pastedText);
            e.target.value = formatted;

            // Trigger input event for validation
            const inputEvent = new Event('input', { bubbles: true });
            e.target.dispatchEvent(inputEvent);
        });

        // Handle backspace and delete keys properly
        phoneInput.addEventListener('keydown', function(e) {
            // Allow: backspace, delete, tab, escape, enter
            if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true)) {
                return;
            }
            // Ensure that it is a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }
    
    // Initialize all components
    updateProgressBar();
    updateStepIndicator();
    updateLiveTime();
    renderConsultationList();
    setupEventListeners();
    startRealTimeUpdates();
    addInteractionTracking();
    cleanOldSubmitCounts();
    checkDailyLimit();
    loadMainPageContent();
    loadBannerContent();
    loadMainBannersContent();
    loadDetailImagesContent();
    setupClickHandlers();
    initializeTelecomButtons();
    
    // Add entrance animations with delay
    setTimeout(addEntranceAnimations, 100);
    
    console.log('Application initialization complete');
});

// Event Listeners Setup
function setupEventListeners() {
    // Form validation
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const serviceCheckboxes = document.querySelectorAll('input[name="service"]');
    const providerRadios = document.querySelectorAll('input[name="provider"]');
    
    if (nameInput) nameInput.addEventListener('input', validateForm);
    if (phoneInput) phoneInput.addEventListener('input', validateForm);
    
    serviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedServices();
            validateForm();
        });
    });

    providerRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateSelectedProvider();
            validateForm();
        });
    });

    // Form submission
    const applicationForm = document.getElementById('applicationForm');
    if (applicationForm) {
        applicationForm.addEventListener('submit', handleFormSubmit);
    }
}

// Step Navigation (main nextStep function is defined at the top)

function updateStep() {
    console.log('updateStep called for step:', currentStep);
    
    // Hide all step contents
    const stepContents = document.querySelectorAll('.step-content');
    stepContents.forEach(content => content.classList.remove('active'));
    
    // Show current step content
    const currentContent = document.getElementById(`step${currentStep}`);
    if (currentContent) {
        currentContent.classList.add('active');
        console.log('Successfully activated step', currentStep);
    } else {
        console.error('Could not find step content for step:', currentStep);
    }
    
    updateProgressBar();
    updateStepIndicator();
    
    // Re-setup event listeners for new step
    if (currentStep === 2) {
        setupEventListeners();
    }
}

// Progress Bar
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = (currentStep / 3) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

// Step Indicator
function updateStepIndicator() {
    const steps = document.querySelectorAll('.step');
    const stepLines = document.querySelectorAll('.step-line');
    
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    stepLines.forEach((line, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

// Real-time Updates
function startRealTimeUpdates() {
    // Update statistics every 5 seconds
    setInterval(() => {
        updateStatistics();
    }, 5000);

    // Update consultation list every 8 seconds
    setInterval(() => {
        updateConsultationList();
    }, 8000);

    // Update live time every second
    setInterval(() => {
        updateLiveTime();
    }, 1000);

    // Update gift amounts from Airtable every 30 seconds (if configured)
    setInterval(() => {
        updateGiftAmountFromAirtable();
    }, 30000);

    // Initial gift amount update
    updateGiftAmountFromAirtable();
}

function updateStatistics() {
    realTimeData.todayApplications += Math.floor(Math.random() * 3);
    realTimeData.cashReward += Math.floor(Math.random() * 100);
    realTimeData.installationsCompleted += Math.floor(Math.random() * 2);
    realTimeData.onlineConsultants = 8 + Math.floor(Math.random() * 8);
    
    // Update DOM elements
    const todayAppsEl = document.getElementById('todayApplications');
    const completedEl = document.getElementById('completedConsultations');
    const cashRewardEl = document.getElementById('cashReward');
    const consultantsEl = document.getElementById('onlineConsultants');
    
    if (todayAppsEl) todayAppsEl.textContent = realTimeData.todayApplications;
    if (completedEl) completedEl.textContent = realTimeData.installationsCompleted;
    if (cashRewardEl) cashRewardEl.textContent = realTimeData.cashReward;
    if (consultantsEl) consultantsEl.textContent = realTimeData.onlineConsultants;
}

async function updateConsultationList() {
    try {
        // 프록시 서버를 통해 실제 에어테이블 데이터 가져오기
        const response = await fetch(`https://dimj-form-proxy.vercel.app/api/airtable`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.records && data.records.length > 0) {
                // 실제 에어테이블 데이터 사용
                const latestRecord = data.records[data.records.length - 1]; // 최신 데이터
                const newConsultation = {
                    id: Date.now(),
                    name: latestRecord.fields['이름'] ? latestRecord.fields['이름'].replace(/(.)/g, '$1○').slice(0, 3) : '신규○○',
                    service: latestRecord.fields['주요서비스'] || '상담',
                    status: latestRecord.fields['상태'] || '접수완료',
                    amount: latestRecord.fields['사은품금액'] || 50,
                    time: '방금 전',
                    date: new Date().toISOString().split('T')[0],
                    color: ['green', 'blue', 'purple', 'orange'][Math.floor(Math.random() * 4)]
                };

                // 실제 데이터로 업데이트
                addToConsultationList(newConsultation);
                return;
            }
        }
    } catch (error) {
        console.error('실시간 데이터 로드 실패:', error);
    }

    // API 호출 실패시 폴백 (가짜 데이터 대신 빈 상태)
    console.log('에어테이블 연결 실패 - 실시간 업데이트 대기 중');
    
    // Update time for existing consultations
    realTimeData.recentConsultations = realTimeData.recentConsultations.map(item => ({
        ...item,
        time: item.time === '방금 전' ? '2분 전' : 
              item.time === '2분 전' ? '5분 전' :
              item.time === '5분 전' ? '8분 전' : '12분 전'
    }));
    
    // Add new consultation and keep only 7 most recent
    realTimeData.recentConsultations = [newConsultation, ...realTimeData.recentConsultations.slice(0, 6)];
    
    renderConsultationList();
}

function renderConsultationList() {
    const consultationList = document.getElementById('consultationList');
    if (!consultationList) return;
    
    consultationList.innerHTML = realTimeData.recentConsultations.map((consultation, index) => `
        <div class="consultation-item ${consultation.color} ${index === 0 ? 'new' : ''}">
            <div class="consultation-left">
                <div class="consultation-dot ${consultation.color}"></div>
                <div class="consultation-info">
                    <h4 class="consultation-name ${consultation.color}">${consultation.name} 고객님</h4>
                    <p class="consultation-service">${consultation.service} ${consultation.status}</p>
                    <p class="consultation-date">신청일: ${formatDate(consultation.date)}</p>
                </div>
            </div>
            <div class="consultation-right">
                <p class="consultation-amount ${consultation.color}">현금 ${consultation.amount}만원</p>
                <p class="consultation-time">${consultation.time}</p>
            </div>
        </div>
    `).join('');
}


function formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
}

function updateLiveTime() {
    const liveTimeEl = document.getElementById('liveTime');
    if (liveTimeEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR');
        liveTimeEl.textContent = `LIVE • ${timeString}`;
    }
}

// Form Handling
function updateSelectedServices() {
    const checkboxes = document.querySelectorAll('input[name="service"]:checked');
    const selectedServices = Array.from(checkboxes).map(cb => cb.value);
    formData.service = selectedServices.join(',');
}

function updateSelectedProvider() {
    const selectedProvider = document.querySelector('input[name="provider"]:checked');
    formData.provider = selectedProvider ? selectedProvider.value : '';
}

function validateForm() {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const submitButton = document.getElementById('submitButton');
    
    if (!nameInput || !phoneInput || !submitButton) return;
    
    formData.name = nameInput.value.trim();
    formData.phone = phoneInput.value.trim();
    
    const isValid = formData.name && formData.phone && formData.service && formData.provider;
    
    submitButton.disabled = !isValid;
    
    if (isValid) {
        submitButton.classList.remove('disabled');
    } else {
        submitButton.classList.add('disabled');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const preferenceSelect = document.getElementById('preference');
    
    if (nameInput) formData.name = nameInput.value.trim();
    if (phoneInput) formData.phone = phoneInput.value.trim();
    if (preferenceSelect) formData.preference = preferenceSelect.value;
    
    // Submit to Airtable (simulation)
    submitToAirtable(formData);
    
    // Move to completion step
    nextStep();
    
    // Display submitted information
    displaySubmittedInfo();
}

// 에어테이블 설정은 airtable-config.js에서 불러옴

// Data Storage (localStorage + Airtable)
async function submitToAirtable(data) {
    try {
        console.log('Submitting application:', data);

        // Generate unique ID for application
        const applicationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // 선택된 서비스들을 수집
        const selectedServices = getSelectedServices();
        const selectedProvider = getSelectedProvider();

        // 에어테이블용 데이터 준비
        const airtableData = {
            fields: {
                '이름': data.name,
                '연락처': data.phone,
                '주요서비스': selectedServices.main || '',
                '통신사': selectedProvider || '',
                '기타서비스': selectedServices.additional.join(', ') || '',
                '상담희망시간': data.preference || '빠른 시간에 연락드립니다',
                '접수일시': new Date().toISOString(),
                'IP주소': antiSpam.userIP || 'Unknown',
                '상태': '상담 대기',
                '사은품금액': 0, // 기본값 0, 관리자가 나중에 설정
                'ID': applicationId
            }
        };

        // 로컬 스토리지에 백업 저장
        const localData = {
            ...airtableData.fields,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(`application_${applicationId}`, JSON.stringify(localData));

        // 에어테이블 API 호출 (프록시 서버 환경변수 사용)
        try {
            const response = await fetch(`https://dimj-form-proxy.vercel.app/api/airtable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(airtableData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`에어테이블 API 오류: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('에어테이블 전송 성공:', result);
        } catch (apiError) {
            console.error('에어테이블 API 오류:', apiError);
            // API 오류가 발생해도 로컬 저장소에는 저장되므로 계속 진행
            console.log('로컬 저장소에만 저장됨');
        }

        console.log('Application submitted successfully:', applicationId);

    } catch (error) {
        console.error('Submission error:', error);
        throw error;
    }
}

// 선택된 서비스 수집
function getSelectedServices() {
    const mainService = document.querySelector('.main-service-btn.selected')?.textContent.trim() || '';
    const additionalServices = [];

    // 기타 서비스 수집 (가전렌탈, 유심, CCTV)
    document.querySelectorAll('.service-category:last-child .telecom-btn.selected').forEach(btn => {
        const text = btn.textContent.trim();
        additionalServices.push(text);
    });

    return {
        main: mainService,
        additional: additionalServices
    };
}

// 선택된 통신사 수집
function getSelectedProvider() {
    const providerSection = document.querySelector('.service-category:nth-child(2)');
    const providerBtn = providerSection?.querySelector('.telecom-btn.selected');
    return providerBtn ? providerBtn.textContent.trim() : '';
}

// 에어테이블에서 사은품 금액 총합 가져오기
async function updateGiftAmountFromAirtable() {
    try {
        // 프록시 서버를 통해 에어테이블 데이터 조회 (환경변수 사용)
        const response = await fetch(`https://dimj-form-proxy.vercel.app/api/airtable`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`에어테이블 API 오류: ${response.status}`);
        }

        const data = await response.json();

        // 사은품 금액 총합 계산
        let totalGiftAmount = 0;
        data.records.forEach(record => {
            const giftAmount = record.fields['사은품금액'] || 0;
            totalGiftAmount += Number(giftAmount);
        });

        // 실시간 현황판 업데이트
        realTimeData.cashReward = totalGiftAmount;
        const cashRewardEl = document.getElementById('cashReward');
        if (cashRewardEl) {
            cashRewardEl.textContent = totalGiftAmount;
        }

        console.log('사은품 총 금액 업데이트:', totalGiftAmount);

    } catch (error) {
        console.error('사은품 금액 업데이트 오류:', error);
    }
}

function displaySubmittedInfo() {
    const submittedInfoEl = document.getElementById('submittedInfo');
    if (!submittedInfoEl) return;
    
    const serviceLabels = {
        'internet': '인터넷',
        'tv': 'IPTV',
        'appliance': '가전렌탈',
        'mobile': '유심',
        'cctv': 'CCTV'
    };
    
    const selectedServices = formData.service.split(',').map(service => 
        serviceLabels[service] || service
    ).join(', ');
    
    submittedInfoEl.innerHTML = `
        <p><strong>이름:</strong> ${formData.name}</p>
        <p><strong>연락처:</strong> ${formData.phone}</p>
        <p><strong>관심 서비스:</strong> ${selectedServices}</p>
        <p><strong>선택 통신사:</strong> ${formData.provider}</p>
        <p><strong>희망 시간:</strong> ${formData.preference || '빠른 시간에 연락드립니다'}</p>
    `;
}

// Utility Functions
function formatPhoneNumber(input) {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');

    // Limit to 11 digits (010-1234-5678 format)
    const limitedDigits = digits.substring(0, 11);

    // Format as 010-1234-5678
    if (limitedDigits.length <= 3) {
        return limitedDigits;
    } else if (limitedDigits.length <= 7) {
        return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
        return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 7)}-${limitedDigits.slice(7, 11)}`;
    }
}

// Phone number formatting will be added to main DOMContentLoaded listener

// Detail Preview functionality removed

// Load main page content from admin settings
function loadMainPageContent() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) return;
    
    try {
        const content = JSON.parse(savedContent);
        
        if (content.mainPage) {
            // Update hero section
            const heroTitle = document.querySelector('.landing-hero h1');
            const heroSubtitle = document.querySelector('.hero-subtitle');
            const heroNote = document.querySelector('.hero-note');
            
            if (heroTitle && content.mainPage.heroTitle) {
                heroTitle.textContent = content.mainPage.heroTitle;
            }
            
            if (heroSubtitle && content.mainPage.heroSubtitle) {
                heroSubtitle.textContent = content.mainPage.heroSubtitle;
            }
            
            if (heroNote && content.mainPage.heroNote) {
                heroNote.textContent = content.mainPage.heroNote;
            }
            
            // Update warning box
            const warningTitle = document.querySelector('.warning-box h3');
            const warningText = document.querySelector('.warning-box p');
            
            if (warningTitle && content.mainPage.warningTitle) {
                warningTitle.textContent = content.mainPage.warningTitle;
            }
            
            if (warningText && content.mainPage.warningContent) {
                // Keep the strong tag for "정찰제 도입"
                const strongText = warningText.querySelector('strong');
                if (strongText) {
                    const parts = content.mainPage.warningContent.split('정찰제 도입');
                    warningText.innerHTML = parts[0] + '<strong>정찰제 도입</strong>' + (parts[1] || '');
                } else {
                    warningText.textContent = content.mainPage.warningContent;
                }
            }
            
            // Update cash reward amounts throughout the page
            if (content.mainPage.cashRewardAmount) {
                const cashAmount = content.mainPage.cashRewardAmount;
                
                // Update all elements that mention cash reward amount
                const rewardElements = document.querySelectorAll('*');
                rewardElements.forEach(el => {
                    if (el.textContent && el.textContent.includes('120만원')) {
                        el.innerHTML = el.innerHTML.replace(/120만원/g, `${cashAmount}만원`);
                    }
                });
            }
            
            // Update total loss amounts throughout the page
            if (content.mainPage.totalLossAmount) {
                const lossAmount = content.mainPage.totalLossAmount;
                
                // Update all elements that mention total loss amount
                const lossElements = document.querySelectorAll('*');
                lossElements.forEach(el => {
                    if (el.textContent && el.textContent.includes('130만원')) {
                        el.innerHTML = el.innerHTML.replace(/130만원/g, `${lossAmount}만원`);
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('Error loading main page content:', error);
    }
}

// Smooth scrolling for better UX
function smoothScrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Smooth scroll function is now integrated in the main nextStep function above

// Add loading animation for form submission
function showLoadingState() {
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...';
        submitButton.disabled = true;
    }
}

function hideLoadingState() {
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.innerHTML = '🎉 지금 바로 신청하고 120만원 받기 <i class="fas fa-chevron-right"></i>';
        submitButton.disabled = false;
    }
}

// Enhanced form submission with loading state and anti-fraud protection
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Check daily limit first
    const dailyCheck = await checkDailyLimit();
    if (!dailyCheck.allowed) {
        showDailyLimitMessage(dailyCheck.count, dailyCheck.limit);
        return;
    }
    
    // Anti-fraud checks
    if (!preventDoubleSubmit()) {
        console.warn('Double submit prevented');
        return;
    }
    
    if (!validateFormIntegrity()) {
        alert('비정상적인 접근이 감지되었습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        resetAntiSpam();
        return;
    }
    
    showLoadingState();
    
    // Get form data
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const preferenceSelect = document.getElementById('preference');
    
    if (nameInput) formData.name = nameInput.value.trim();
    if (phoneInput) formData.phone = phoneInput.value.trim();
    if (preferenceSelect) formData.preference = preferenceSelect.value;
    
    try {
        // Submit to Airtable
        await submitToAirtable(formData);
        
        // Small delay for better UX
        setTimeout(() => {
            hideLoadingState();
            resetAntiSpam();
            recordSuccessfulSubmit(); // Record successful submission for daily limit
            nextStep();
            displaySubmittedInfo();
        }, 1500);
        
    } catch (error) {
        console.error('Form submission error:', error);
        hideLoadingState();
        resetAntiSpam();
        alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

// Add entrance animations
function addEntranceAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Add animation to elements
    const animatedElements = document.querySelectorAll('.form-section, .status-board, .consultation-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Entrance animations will be added to main DOMContentLoaded listener

// Error handling for missing elements
function safeElementUpdate(elementId, updateFunction) {
    const element = document.getElementById(elementId);
    if (element) {
        updateFunction(element);
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

// Enhanced error handling for all functions
function updateStatistics() {
    try {
        realTimeData.todayApplications += Math.floor(Math.random() * 3);
        realTimeData.cashReward += Math.floor(Math.random() * 100);
        realTimeData.installationsCompleted += Math.floor(Math.random() * 2);
        realTimeData.onlineConsultants = 8 + Math.floor(Math.random() * 8);
        
        // Update main status board
        safeElementUpdate('todayApplications', (el) => el.textContent = realTimeData.todayApplications);
        safeElementUpdate('completedConsultations', (el) => el.textContent = realTimeData.installationsCompleted);
        safeElementUpdate('cashReward', (el) => el.textContent = realTimeData.cashReward);
        safeElementUpdate('onlineConsultants', (el) => el.textContent = realTimeData.onlineConsultants);
        
        // Update banner statistics
        updateBannerStats();
        
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

function updateBannerStats() {
    // Update banner stats with current data
    const bannerStats = document.querySelectorAll('.banner-stat .stat-number');
    if (bannerStats.length >= 3) {
        bannerStats[0].textContent = realTimeData.todayApplications; // 오늘 신청
        bannerStats[1].textContent = realTimeData.cashReward + '만원'; // 누적 사은품
        bannerStats[2].textContent = realTimeData.onlineConsultants + '명'; // 상담사 대기
    }
}

// Top Button Functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/Hide Top Button based on scroll position
function handleTopButtonVisibility() {
    const topButton = document.getElementById('topButton');
    if (!topButton) return;
    
    if (window.pageYOffset > 300) {
        topButton.classList.add('visible');
    } else {
        topButton.classList.remove('visible');
    }
}

// Add scroll event listener for top button
window.addEventListener('scroll', handleTopButtonVisibility);

// Load banner content from admin settings
function loadBannerContent() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) {
        // Show default banner if no saved content
        showDefaultBanner();
        return;
    }
    
    try {
        const content = JSON.parse(savedContent);
        if (content.banner && content.banner.enabled !== false) {
            const bannerElement = document.getElementById('step2Banner');
            const bannerTitle = document.getElementById('bannerTitle');
            const bannerDescription = document.getElementById('bannerDescription');
            
            if (bannerElement) {
                // Update banner content
                if (bannerTitle && content.banner.title) {
                    bannerTitle.textContent = content.banner.title;
                }
                
                if (bannerDescription && content.banner.description) {
                    bannerDescription.textContent = content.banner.description;
                }
                
                // Set banner image if available
                if (content.banner.imageData) {
                    bannerElement.style.backgroundImage = `url(${content.banner.imageData})`;
                    bannerElement.style.backgroundSize = 'cover';
                    bannerElement.style.backgroundPosition = 'center';
                }
                
                // Add click handler if link is provided
                if (content.banner.link) {
                    bannerElement.style.cursor = 'pointer';
                    bannerElement.onclick = function() {
                        window.open(content.banner.link, '_blank');
                    };
                }
                
                // Show the banner
                bannerElement.style.display = 'flex';
            }
        } else {
            // Banner is disabled, hide it
            const bannerElement = document.getElementById('step2Banner');
            if (bannerElement) {
                bannerElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading banner content:', error);
        showDefaultBanner();
    }
}

function showDefaultBanner() {
    const bannerElement = document.getElementById('step2Banner');
    if (bannerElement) {
        bannerElement.style.display = 'flex';
    }
}

// Load main banners content from admin settings
function loadMainBannersContent() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) {
        // Hide banners if no saved content
        hideMainBanners();
        return;
    }
    
    try {
        const content = JSON.parse(savedContent);
        if (content.mainBanners) {
            ['step1', 'step2'].forEach(stepName => {
                const bannerData = content.mainBanners[stepName];
                const bannerElement = document.getElementById(`${stepName}MainBanner`);
                const imageElement = document.getElementById(`${stepName}BannerImage`);
                
                if (bannerElement && imageElement && bannerData && bannerData.imageData) {
                    // Set banner image
                    imageElement.src = bannerData.imageData;
                    imageElement.style.display = 'block';
                    
                    // Hide placeholder and show image
                    const placeholder = document.getElementById(`${stepName}BannerPlaceholder`);
                    if (placeholder) placeholder.style.display = 'none';
                    
                    console.log(`${stepName} main banner loaded with image`);
                } else if (bannerElement) {
                    // No image, show placeholder
                    const imageElement = document.getElementById(`${stepName}BannerImage`);
                    const placeholder = document.getElementById(`${stepName}BannerPlaceholder`);
                    
                    if (imageElement) imageElement.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'flex';
                }
            });
        } else {
            hideMainBanners();
        }
    } catch (error) {
        console.error('Error loading main banners content:', error);
        hideMainBanners();
    }
}

function hideMainBanners() {
    // Show placeholders when no images are set
    ['step1', 'step2'].forEach(stepName => {
        const imageElement = document.getElementById(`${stepName}BannerImage`);
        const placeholder = document.getElementById(`${stepName}BannerPlaceholder`);
        
        if (imageElement) imageElement.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    });
}

// Load detail images content from admin settings
function loadDetailImagesContent() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) {
        // Show placeholder even if no saved content
        showDetailImagesPlaceholder();
        return;
    }
    
    try {
        const content = JSON.parse(savedContent);
        if (content.detailImages && content.detailImages.enabled !== false) {
            const detailImagesSection = document.getElementById('detailImagesSection');
            const detailImagesGrid = document.getElementById('detailImagesGrid');
            
            if (detailImagesSection && detailImagesGrid) {
                // Check if we have the detail image
                let hasImages = false;
                let imagesHTML = '';
                
                const imageData = content.detailImages.image1;
                if (imageData && imageData.imageData) {
                    hasImages = true;
                    imagesHTML = `
                        <div class="detail-image-single">
                            <img src="${imageData.imageData}" alt="상세페이지" loading="lazy" style="width: 100%; height: auto; max-width: 1050px; margin: 0 auto; display: block;">
                            ${imageData.caption ? `<p class="image-caption" style="text-align: center; margin-top: 1rem; color: #64748b;">${imageData.caption}</p>` : ''}
                        </div>
                    `;
                }
                
                if (hasImages) {
                    detailImagesGrid.innerHTML = imagesHTML;
                    detailImagesSection.style.display = 'block';
                    
                    // Hide placeholder
                    const placeholder = document.getElementById('detailImagesPlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                    
                    console.log('Detail images section loaded with single A4 image');
                } else {
                    // Show placeholder
                    detailImagesSection.style.display = 'block';
                    const placeholder = document.getElementById('detailImagesPlaceholder');
                    if (placeholder) placeholder.style.display = 'flex';
                    
                    detailImagesGrid.innerHTML = `
                        <div class="detail-images-placeholder" id="detailImagesPlaceholder">
                            <div class="placeholder-content">
                                <i class="fas fa-images"></i>
                                <h4>A4 5장 분량 상세페이지를 추가해주세요</h4>
                                <p>권장 사이즈: <strong>1050 × 2970px (A4 5장 세로 연결)</strong></p>
                                <p>JPG/PNG 형식, 1개 파일로 업로드</p>
                                <a href="admin.html" class="admin-link-btn">관리자 페이지로 이동</a>
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            showDetailImagesPlaceholder();
        }
    } catch (error) {
        console.error('Error loading detail images content:', error);
        showDetailImagesPlaceholder();
    }
}

function showDetailImagesPlaceholder() {
    const detailImagesSection = document.getElementById('detailImagesSection');
    const detailImagesGrid = document.getElementById('detailImagesGrid');
    
    if (detailImagesSection && detailImagesGrid) {
        detailImagesSection.style.display = 'block';
        detailImagesGrid.innerHTML = `
            <div class="detail-images-placeholder" id="detailImagesPlaceholder">
                <div class="placeholder-content">
                    <i class="fas fa-images"></i>
                    <h4>A4 5장 분량 상세페이지를 추가해주세요</h4>
                    <p>권장 사이즈: <strong>1050 × 2970px (A4 5장 세로 연결)</strong></p>
                    <p>JPG/PNG 형식, 1개 파일로 업로드</p>
                    <a href="admin.html" class="admin-link-btn">관리자 페이지로 이동</a>
                </div>
            </div>
        `;
    }
}

function hideDetailImagesSection() {
    const detailImagesSection = document.getElementById('detailImagesSection');
    if (detailImagesSection) {
        detailImagesSection.style.display = 'none';
    }
}

// Load detail page banner content from admin settings
function loadDetailPageBannerContent() {
    const savedContent = localStorage.getItem('detailPageContent');
    if (!savedContent) {
        // Show placeholder if no saved content
        showDetailPageBannerPlaceholder();
        return;
    }
    
    try {
        const content = JSON.parse(savedContent);
        if (content.detailPageBanner && content.detailPageBanner.enabled !== false && content.detailPageBanner.imageData) {
            const bannerElement = document.getElementById('detailPageBanner');
            const imageElement = document.getElementById('detailPageBannerImage');
            const placeholder = document.getElementById('detailPageBannerPlaceholder');
            
            if (bannerElement && imageElement) {
                // Set banner image
                imageElement.src = content.detailPageBanner.imageData;
                imageElement.style.display = 'block';
                
                // Hide placeholder
                if (placeholder) placeholder.style.display = 'none';
                
                console.log('Detail page banner loaded with image');
            }
        } else {
            showDetailPageBannerPlaceholder();
        }
    } catch (error) {
        console.error('Error loading detail page banner content:', error);
        showDetailPageBannerPlaceholder();
    }
}

function showDetailPageBannerPlaceholder() {
    const imageElement = document.getElementById('detailPageBannerImage');
    const placeholder = document.getElementById('detailPageBannerPlaceholder');
    
    if (imageElement) imageElement.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
}

// Track visitor function
function trackVisitor() {
    const today = new Date().toISOString().split('T')[0];
    const visitors = JSON.parse(localStorage.getItem('dailyVisitors') || '{}');
    
    // Check if this is a new visit for today
    const lastVisit = localStorage.getItem('lastVisitDate');
    if (lastVisit !== today) {
        // New visit for today
        visitors[today] = (visitors[today] || 0) + 1;
        localStorage.setItem('dailyVisitors', JSON.stringify(visitors));
        localStorage.setItem('lastVisitDate', today);
        
        // Clean up old visitor data (keep only last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        Object.keys(visitors).forEach(date => {
            if (new Date(date) < thirtyDaysAgo) {
                delete visitors[date];
            }
        });
        
        localStorage.setItem('dailyVisitors', JSON.stringify(visitors));
        console.log('New visitor tracked for', today);
    }
}

// Make functions globally accessible
window.nextStep = nextStep;

// Simple debug function
function debugCheck() {
    console.log('nextStep function:', typeof nextStep);
    console.log('Current step:', currentStep);
}

// Setup additional click handlers as fallback
function setupClickHandlers() {
    console.log('Setting up additional click handlers');
    
    // CTA button click handler - but don't interfere with onclick
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        console.log('Found CTA button');
        // Don't add duplicate event listener since onclick="nextStep()" already exists
    } else {
        console.log('CTA button not found');
    }
}

// Anti-fraud protection functions
function trackUserInteraction(type, element) {
    antiSpam.userInteractions.push({
        type: type,
        element: element,
        timestamp: Date.now(),
        timeFromStart: Date.now() - antiSpam.startTime
    });
    
    // Keep only last 50 interactions
    if (antiSpam.userInteractions.length > 50) {
        antiSpam.userInteractions = antiSpam.userInteractions.slice(-50);
    }
}

function detectSpamClicks() {
    const now = Date.now();
    const timeDiff = now - antiSpam.lastClickTime;
    
    // Reset click count if more than 2 seconds passed
    if (timeDiff > 2000) {
        antiSpam.clickCount = 0;
    }
    
    antiSpam.clickCount++;
    antiSpam.lastClickTime = now;
    
    // If more than 5 clicks in 2 seconds, it's suspicious
    if (antiSpam.clickCount > 5 && timeDiff < 2000) {
        console.warn('Suspicious clicking detected');
        return true;
    }
    
    return false;
}

function validateFormIntegrity() {
    // Check if form was filled too quickly (less than 10 seconds is suspicious)
    const fillTime = Date.now() - antiSpam.startTime;
    if (fillTime < 10000) {
        console.warn('Form filled too quickly');
        return false;
    }
    
    // Check if user actually interacted with form elements
    const hasInteractions = antiSpam.userInteractions.length > 0;
    if (!hasInteractions) {
        console.warn('No user interactions detected');
        return false;
    }
    
    // Check for reasonable interaction pattern
    const interactionTypes = [...new Set(antiSpam.userInteractions.map(i => i.type))];
    if (interactionTypes.length < 2) {
        console.warn('Limited interaction types');
        return false;
    }
    
    return true;
}

function preventDoubleSubmit() {
    const now = Date.now();
    const timeSinceLastSubmit = now - antiSpam.lastSubmitTime;
    
    // Prevent submit if already submitting or if less than 3 seconds since last submit
    if (antiSpam.isSubmitting || timeSinceLastSubmit < 3000) {
        return false;
    }
    
    antiSpam.isSubmitting = true;
    antiSpam.lastSubmitTime = now;
    return true;
}

function resetAntiSpam() {
    antiSpam.isSubmitting = false;
}

// Add user interaction tracking to form elements
function addInteractionTracking() {
    // Track input interactions
    document.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('focus', () => trackUserInteraction('focus', element.name || element.id));
        element.addEventListener('change', () => trackUserInteraction('change', element.name || element.id));
        element.addEventListener('input', () => trackUserInteraction('input', element.name || element.id));
    });
    
    // Track button clicks
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (detectSpamClicks()) {
                e.preventDefault();
                showAntiSpamMessage();
                return false;
            }
            trackUserInteraction('click', button.id || button.className);
        });
    });
}

function showAntiSpamMessage() {
    const message = document.createElement('div');
    message.className = 'anti-spam-message';
    message.innerHTML = '⚠️ 너무 빠른 클릭이 감지되었습니다. 잠시 후 다시 시도해주세요.';
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 3000);
}

// IP-based daily limit functions
async function getUserIP() {
    try {
        // Try to get IP from multiple free services
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://api.ip.sb/jsonip'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                const data = await response.json();
                return data.ip || data.query;
            } catch (error) {
                console.warn(`Failed to get IP from ${service}:`, error);
                continue;
            }
        }
        
        // Fallback: generate a unique browser fingerprint
        return generateBrowserFingerprint();
        
    } catch (error) {
        console.warn('Failed to get IP, using browser fingerprint:', error);
        return generateBrowserFingerprint();
    }
}

function generateBrowserFingerprint() {
    // Create a unique identifier based on browser characteristics
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = btoa(JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${screen.width}x${screen.height}`,
        canvas: canvas.toDataURL(),
        timestamp: new Date().toDateString() // Include date for daily reset
    }));
    
    return fingerprint.substring(0, 20); // Use first 20 chars as identifier
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getStorageKey(identifier) {
    return `submit_count_${identifier}_${getTodayKey()}`;
}

function getTodaySubmitCount(identifier) {
    const storageKey = getStorageKey(identifier);
    const count = localStorage.getItem(storageKey);
    return count ? parseInt(count, 10) : 0;
}

function incrementSubmitCount(identifier) {
    const storageKey = getStorageKey(identifier);
    const currentCount = getTodaySubmitCount(identifier);
    const newCount = currentCount + 1;
    localStorage.setItem(storageKey, newCount.toString());
    return newCount;
}

function cleanOldSubmitCounts() {
    // Clean up old localStorage entries (keep only today's)
    const today = getTodayKey();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('submit_count_') && !key.includes(today)) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

async function checkDailyLimit() {
    try {
        // Get user identifier (IP or browser fingerprint)
        if (!antiSpam.userIP) {
            antiSpam.userIP = await getUserIP();
        }
        
        const identifier = antiSpam.userIP;
        const todayCount = getTodaySubmitCount(identifier);
        
        console.log(`Today's submit count for ${identifier.substring(0, 8)}...: ${todayCount}/${antiSpam.dailyLimit}`);
        
        if (todayCount >= antiSpam.dailyLimit) {
            return {
                allowed: false,
                count: todayCount,
                limit: antiSpam.dailyLimit
            };
        }
        
        return {
            allowed: true,
            count: todayCount,
            limit: antiSpam.dailyLimit
        };
    } catch (error) {
        console.error('Error checking daily limit:', error);
        // If there's an error, allow submission but log it
        return { allowed: true, count: 0, limit: antiSpam.dailyLimit };
    }
}

function recordSuccessfulSubmit() {
    if (antiSpam.userIP) {
        const newCount = incrementSubmitCount(antiSpam.userIP);
        console.log(`Recorded successful submit. New count: ${newCount}/${antiSpam.dailyLimit}`);
    }
}

function showDailyLimitMessage(count, limit) {
    const message = document.createElement('div');
    message.className = 'daily-limit-message';
    message.innerHTML = `
        <div class="limit-icon">🚫</div>
        <div class="limit-text">
            <h3>일일 신청 한도 초과</h3>
            <p>하루에 최대 ${limit}회까지만 신청 가능합니다.</p>
            <p>현재 ${count}회 신청하셨습니다.</p>
            <p class="limit-reset">자정 이후 다시 신청하실 수 있습니다.</p>
        </div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 5000);
}

// Telecom Button Functionality
function initializeTelecomButtons() {
    // Initialize telecom provider buttons (radio behavior) 
    // Target provider section specifically by finding the section with "신청 통신사" text
    const providerSections = Array.from(document.querySelectorAll('.service-category')).filter(section => 
        section.textContent.includes('신청 통신사')
    );
    
    if (providerSections.length > 0) {
        const providerSection = providerSections[0];
        const telecomProviderBtns = providerSection.querySelectorAll('.telecom-btn');
        const providerGrid = providerSection.querySelector('.telecom-grid');
        
        telecomProviderBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove selected class from all provider buttons
                telecomProviderBtns.forEach(b => b.classList.remove('selected'));
                // Add selected class to clicked button
                this.classList.add('selected');
                
                // Add/remove has-selection class for dimming effect
                if (providerGrid) {
                    providerGrid.classList.add('has-selection');
                }
                
                // Update form data
                formData.provider = this.textContent.trim();
                validateForm();
                console.log('Provider selected:', formData.provider);
            });
        });
    }
    
    // Initialize service buttons (checkbox behavior) - both main and additional services
    // Target all service buttons except provider buttons
    const serviceSection = document.querySelector('.service-selection');
    if (serviceSection) {
        const serviceButtons = serviceSection.querySelectorAll('.telecom-btn:not(.telecom-grid:first-of-type .telecom-btn)');
        
        // Get all service buttons (main services + additional services)
        const allServiceButtons = Array.from(serviceSection.querySelectorAll('.telecom-grid .telecom-btn'))
            .filter(btn => !btn.closest('.service-category').textContent.includes('신청 통신사'));
        
        // Get all telecom grids for services
        const serviceGrids = Array.from(serviceSection.querySelectorAll('.telecom-grid'))
            .filter(grid => !grid.closest('.service-category').textContent.includes('신청 통신사'));
        
        allServiceButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const buttonText = this.textContent.trim();
                const currentGrid = this.closest('.telecom-grid');
                const isMainService = this.closest('.service-category').querySelector('.category-title').textContent.includes('주요 서비스');
                
                if (isMainService) {
                    // 주요 서비스 섹션에서
                    if (buttonText.includes('IPTV추가')) {
                        // IPTV추가는 독립적으로 토글 가능
                        this.classList.toggle('selected');
                    } else {
                        // 인터넷+IPTV, 단품 인터넷은 라디오 버튼 방식
                        Array.from(currentGrid.querySelectorAll('.telecom-btn')).forEach(b => {
                            if (!b.textContent.trim().includes('IPTV추가')) {
                                b.classList.remove('selected');
                            }
                        });
                        this.classList.add('selected');
                    }
                } else {
                    // 기타 서비스는 토글
                    this.classList.toggle('selected');
                }
                
                // Check if any button in this grid is selected
                const hasSelection = Array.from(currentGrid.querySelectorAll('.telecom-btn'))
                    .some(b => b.classList.contains('selected'));
                
                // Add/remove has-selection class for dimming effect
                if (hasSelection) {
                    currentGrid.classList.add('has-selection');
                } else {
                    currentGrid.classList.remove('has-selection');
                }
                
                // Update form data for services
                const selectedServices = Array.from(allServiceButtons)
                    .filter(b => b.classList.contains('selected'))
                    .map(b => {
                        const text = b.textContent.trim();
                        // Remove icon (everything before the last space)
                        return text.includes(' ') ? text.split(' ').pop() : text;
                    })
                    .join(',');
                
                formData.service = selectedServices;
                validateForm();
                console.log('Services selected:', formData.service);
            });
        });
    }
    
    // Fallback: initialize all telecom buttons if specific sections not found
    if (providerSections.length === 0 && !serviceSection) {
        const allTelecomBtns = document.querySelectorAll('.telecom-btn');
        allTelecomBtns.forEach((btn, index) => {
            btn.addEventListener('click', function() {
                this.classList.toggle('selected');
                console.log('Button clicked:', this.textContent.trim());
            });
        });
    }
}

// Privacy Modal Functions
function showPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function agreePrivacy() {
    const checkbox = document.getElementById('privacyAgree');
    if (checkbox) {
        checkbox.checked = true;
        
        // Trigger change event to update form validation
        const event = new Event('change');
        checkbox.dispatchEvent(event);
    }
    closePrivacyModal();
}

// Close modal when clicking outside of content
document.addEventListener('click', function(e) {
    const modal = document.getElementById('privacyModal');
    if (modal && e.target === modal) {
        closePrivacyModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePrivacyModal();
        closeFraudWarning();
    }
});

// 부정클릭 방지 기능
function showFraudWarning() {
    const modal = document.getElementById('fraudWarningModal');
    const warningText = document.getElementById('fraudWarningText');
    
    // localStorage에서 관리자가 설정한 경고문 가져오기
    const adminContent = JSON.parse(localStorage.getItem('adminContent') || '{}');
    if (adminContent.fraudWarningMessage) {
        warningText.textContent = adminContent.fraudWarningMessage;
    }
    
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeFraudWarning() {
    const modal = document.getElementById('fraudWarningModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 부정클릭 경고 모달 외부 클릭시 닫기
document.addEventListener('click', function(e) {
    const fraudModal = document.getElementById('fraudWarningModal');
    if (fraudModal && e.target === fraudModal) {
        closeFraudWarning();
    }
});


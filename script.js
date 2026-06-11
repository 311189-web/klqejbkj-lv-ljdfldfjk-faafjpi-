document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const cityInput = document.getElementById('cityInput');
    const locationInput = document.getElementById('locationInput');
    const temperatureInput = document.getElementById('temperatureInput');
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const noteInput = document.getElementById('noteInput');
    const autoFillBtn = document.getElementById('autoFillBtn');
    const submitBtn = document.getElementById('submitBtn');
    const statusBadge = document.getElementById('statusBadge');
    const feedback = document.getElementById('feedback');
    const signOutBtn = document.getElementById('signOutBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    const GAS_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
    const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
    const googleClientId = new URLSearchParams(window.location.search).get('client_id') || 'YOUR_GOOGLE_CLIENT_ID';
    let currentUser = null;

    function setStatus(text, state = 'idle') {
        statusBadge.textContent = text;
        statusBadge.className = '';
        if (state === 'success') {
            statusBadge.classList.add('success');
        } else if (state === 'error') {
            statusBadge.classList.add('error');
        } else if (state === 'loading') {
            statusBadge.classList.add('loading');
        }
    }

    function setFeedback(text, state = 'info') {
        feedback.textContent = text;
        feedback.className = 'feedback';
        if (state === 'success') {
            feedback.classList.add('success');
        } else if (state === 'error') {
            feedback.classList.add('error');
        } else if (state === 'warning') {
            feedback.classList.add('warning');
        }
    }

    function updateLoginUi() {
        signOutBtn.classList.toggle('hidden', !currentUser);
        if (currentUser) {
            nameInput.value = currentUser.name || nameInput.value;
            emailInput.value = currentUser.email || emailInput.value;
        }
    }

    function decodeJwtPayload(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(atob(base64).split('').map((char) => {
            return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));
    }

    function handleCredentialResponse(response) {
        const payload = decodeJwtPayload(response.credential);
        currentUser = {
            name: payload.name || payload.given_name || '',
            email: payload.email || '',
            picture: payload.picture || ''
        };
        updateLoginUi();
        setStatus('已登入', 'success');
        setFeedback(`歡迎 ${currentUser.name || currentUser.email}，你已成功以 Google 帳號登入。`, 'success');
    }

    function initializeGoogleAuth() {
        if (!googleClientId || googleClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
            setFeedback('請先在 script.js 中填入你的 Google OAuth Client ID，才能啟用 Google 登入。', 'warning');
            return;
        }

        if (!window.google?.accounts?.id) {
            setTimeout(initializeGoogleAuth, 200);
            return;
        }

        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse
        });
        window.google.accounts.id.renderButton(googleLoginBtn, { theme: 'outline', size: 'large' });
        googleLoginBtn.classList.remove('hidden');
    }

    async function autoFillWeather() {
        const city = cityInput.value.trim();
        if (!city) {
            setFeedback('請先輸入城市名稱。', 'warning');
            return;
        }

        setStatus('讀取中...', 'loading');
        setFeedback('正在查詢天氣資料，請稍候...', 'info');

        try {
            const geoResponse = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`);
            const geoData = await geoResponse.json();
            const result = geoData.results?.[0];

            if (!result) {
                throw new Error('找不到對應城市。');
            }

            const weatherResponse = await fetch(`${WEATHER_URL}?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m&timezone=auto`);
            const weatherData = await weatherResponse.json();
            const currentTemp = weatherData.current?.temperature_2m;

            if (currentTemp === undefined) {
                throw new Error('無法取得溫度資訊。');
            }

            locationInput.value = `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? `, ${result.country}` : ''}`;
            temperatureInput.value = currentTemp.toFixed(1);
            setStatus('已取得資料', 'success');
            setFeedback(`已自動填入 ${result.name} 的溫度：${currentTemp.toFixed(1)}°C`, 'success');
        } catch (error) {
            setStatus('取得失敗', 'error');
            setFeedback(`查詢失敗：${error.message}`, 'error');
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentUser) {
            setFeedback('請先使用 Google 登入後再提交資料。', 'warning');
            return;
        }

        const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            city: cityInput.value.trim(),
            location: locationInput.value.trim(),
            temperature: temperatureInput.value.trim(),
            note: noteInput.value.trim(),
            googleName: currentUser.name,
            googleEmail: currentUser.email,
            submittedAt: new Date().toISOString()
        };

        if (!payload.city || !payload.temperature || !payload.name || !payload.email) {
            setFeedback('請填寫完整資料後再送出。', 'warning');
            return;
        }

        submitBtn.disabled = true;
        setStatus('送出中...', 'loading');
        setFeedback('正在提交資料，請稍候...', 'info');

        try {
            if (!GAS_URL || GAS_URL.includes('YOUR_APPS_SCRIPT')) {
                localStorage.setItem('temperatureReports', JSON.stringify([payload, ...(JSON.parse(localStorage.getItem('temperatureReports') || '[]'))]));
                setStatus('已暫存', 'success');
                setFeedback('資料已暫存於本機。請將 Apps Script 網址填入 script.js 後即可寫入 Google Sheets。', 'warning');
            } else {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error('送出失敗。');
                }

                setStatus('已送出', 'success');
                setFeedback('資料已成功提交至 Google Apps Script。', 'success');
            }

            form.reset();
        } catch (error) {
            setStatus('送出失敗', 'error');
            setFeedback(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    signOutBtn.addEventListener('click', () => {
        currentUser = null;
        updateLoginUi();
        setStatus('已登出', 'warning');
        setFeedback('你已登出 Google 帳號。', 'warning');
    });

    autoFillBtn.addEventListener('click', autoFillWeather);
    cityInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            autoFillWeather();
        }
    });

    initializeGoogleAuth();
});

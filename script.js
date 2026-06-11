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

    const GAS_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
    const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

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

        const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            city: cityInput.value.trim(),
            location: locationInput.value.trim(),
            temperature: temperatureInput.value.trim(),
            note: noteInput.value.trim(),
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

    autoFillBtn.addEventListener('click', autoFillWeather);
    cityInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            autoFillWeather();
        }
    });
});

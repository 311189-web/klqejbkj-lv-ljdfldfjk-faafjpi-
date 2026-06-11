# 溫度資料回報系統

這是一個可部署於 GitHub Pages 的前端範例，功能包含：

- 前端頁面效果：現代化卡片式介面
- API 自動填入：輸入城市後，自動呼叫 Open-Meteo 天氣 API 取得氣溫與地點
- Google Apps Script 整合：提交資料後可寫入 Google Sheets

## 目錄
- index.html：頁面結構
- styles.css：畫面樣式
- script.js：API 呼叫與表單提交
- appscript.gs：Google Apps Script 後端範例

## GitHub Pages
部署後網址格式如下：
https://311189-web.github.io/klqejbkj-lv-ljdfldfjk-faafjpi-/

## Google Apps Script 設定步驟
1. 開啟 Google Apps Script。
2. 建立新專案，貼上 appscript.gs 的內容。
3. 部署為網頁應用程式，權限設為「任何人都能使用」。
4. 複製執行網址，貼到 script.js 的 GAS_URL 常數中。
5. 重新整理頁面即可提交資料。

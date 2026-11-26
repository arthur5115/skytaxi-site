# Skytaxi 公司網站

雲天新能源科技股份有限公司（Skytaxi）網站原始檔。推送到 `main` 分支後，Cloudflare Pages 會自動部署。

## 結構

| 資料夾 | 網址 | Cloudflare Pages 專案 | 說明 |
|---|---|---|---|
| `www/` | https://www.skytaxi.com.tw 、 https://skytaxi.com.tw | 建置輸出目錄 `www` | 公司首頁、虎頭埤纜車網站、營運動態模擬 |
| `review/` | https://review.skytaxi.com.tw | 建置輸出目錄 `review` | 虎頭埤纜車 BOT 審查資料區 |

兩個站目前都受 Cloudflare Access 保護（Email 驗證碼登入），名單在 Cloudflare Zero Trust → Access controls → Applications。

## 新增頁面

1. 在對應資料夾下建立新目錄，例如 `www/新頁面/index.html`（單一 HTML 檔，圖片放同目錄下）。
2. 在入口頁加上連結：公開區改 `www/index.html` 的「互動展示」卡片；審查區改 `review/index.html` 的對應分組。
3. 提交並推送到 `main`，Cloudflare 會在數分鐘內自動上線。

## Cloudflare 專案

- `skytaxi-site`（輸出 `www`）→ skytaxi.com.tw、www.skytaxi.com.tw
- `skytaxi-site-review`（輸出 `review`）→ review.skytaxi.com.tw
- 舊的手動上傳專案 `skytaxi-www`、`skytaxi-review` 已不再使用。

## 注意

- `review/_headers` 與 `review/robots.txt` 讓審查區不被搜尋引擎收錄，請保留。
- 單一檔案上限 25 MB（Cloudflare Pages 限制）。

## 審查資料區目錄（2026-11-27 改版）
- `review/index.html` 為唯一目錄，由 `tools/build_index.py` 產生（四類現行版 16 項＋最終資料總覽、歷史版本、原始檔下載）。
- 縮圖在 `review/thumbs/`，以 `thumbs.py` 擷取。
- `review/m/index.html` 只做轉址到 `../`。
- 新增項目：在 build_index.py 的 SECTIONS 或 ARCHIVE 加一列後重新產生。

# 虎頭埤全案互動模型 V1.0

本套件包含獨立互動網站，以及可交由模型軟體開啟的 GLB / IFC 模型。

## 開啟互動網站

1. **先完整解壓縮 ZIP**，不要直接在壓縮檔內開啟。
2. 雙擊根目錄的 **index.html**，使用近期版本 Chrome、Edge 或 Safari。
3. 首次開啟需要解壓縮並準備完整模型，請等候載入完成。

網站的程式、樣式與顯示用模型已全部內嵌，不需要連線下載外部程式庫或模型；網頁不使用外部檔案載入，因此一般支援所需功能的瀏覽器可直接開啟。**本套件已驗證的啟動方式為下方的本機 HTTP；本次未實測各瀏覽器的雙擊開啟行為。** 若雙擊後無法正常顯示，請使用附帶啟動腳本。瀏覽器若無可用的 WebGL，頁面會使用相容預覽；此模式的幾何細節、顯示預算與選取精度較有限。完整 3D 顯示仍需瀏覽器及裝置提供可用的 WebGL。

頁面可切換全案與四站、樓層及類別，並提供旋轉、俯視、分層拆解、還原與中英切換。模型不是施工圖，既有設計推估仍沿模型內的標記保留。

## 備用：以本機 HTTP 開啟

若瀏覽器或電腦管理政策限制本機檔案，使用附帶的啟動方式：

- **Windows**：雙擊 `launch_windows.bat`。
- **macOS / Linux**：在本資料夾開啟終端機，執行 `python3 start_server.py`。
- **其他已安裝 Python 3 的電腦**：執行 `python start_server.py`。

此啟動方式需要 Python 3，但不需安裝額外套件。程式只監聽 **127.0.0.1**，優先使用連接埠 8000；若已被占用，會尋找後續可用連接埠並自動開啟瀏覽器。請以終端機顯示的完整網址為準。

使用期間保留命令視窗；按 **Ctrl+C** 停止本機服務。這不是對外發布網站，不會自動上傳模型。

## 模型檔案

| 檔案 | 用途 |
|---|---|
| `models/Hutoupi_All_Project_V1.0.glb` | 完整 GLB 2.0 模型，可匯入支援 GLB 的 3D 軟體。 |
| `models/Hutoupi_All_Project_V1.0.ifc` | IFC 模型，可匯入支援 IFC 的 BIM 軟體。 |

網站直接顯示內嵌的同版 GLB。`models` 資料夾提供另外儲存、下載或匯入軟體使用的原模型檔，網站啟動時不會再從這個資料夾重複載入模型。GLB 與 IFC 不是瀏覽器內的編輯器；如需編修，請使用支援相應格式的模型軟體。

## English quick start

Extract the entire ZIP, then open **index.html** in a recent Chrome, Edge or Safari browser. The viewer, libraries and display model are embedded; no external downloads are required. Allow time for the initial model decompression. A compatibility preview is available when WebGL cannot be created, with reduced visual detail and selection precision.

For a local HTTP fallback, run **launch_windows.bat** on Windows or **python3 start_server.py** on macOS/Linux. Python 3 is required only for this optional server. It binds exclusively to **127.0.0.1**, chooses port 8000 or the next available port, and opens the browser. Keep the terminal open and press **Ctrl+C** to stop. Editable exchange files are included in the **models** folder.

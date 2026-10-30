# CodyMaster Working Memory — GoFile Pro
Last Updated: 2026-10-30T19:50:00+07:00
Current Phase: completed / released
Current Iteration: v2.4.1 (Ready for Next Milestone)
Project: GoFile Pro (Multiplatform Android APK & Windows Standalone)
Repository: https://github.com/DidiRoyadi123/Gofile-pro.git

## Active Goal
GoFile Pro v2.4.1 successfully released and synchronized across GitHub. All code, security features, admin auth gates, and release binaries are verified and stable. Working memory is checkpointed so development can be seamlessly resumed from any environment.

## Current Release Status
- **Current Version**: `v2.4.1`
- **Latest Commit**: `67047de` (`fix(ui): restore missing closing div in active-download-strip and make SecurityGuard checks safe against BadTokenException`)
- **Branches**:
  - `main`: User App (`com.gofile.downloader`), clean working tree, up to date with `origin/main`.
  - `admin`: Admin App (`com.gofile.downloader.admin`), clean working tree, up to date with `origin/admin`.
- **GitHub Release Tag**: `v2.4.1`
  - Release Assets:
    1. `GoFile-Pro-v2.4.1.apk` (4.33 MB) — Regular User Application.
    2. `GoFile-Pro-Admin-v2.4.1.apk` (4.33 MB) — Admin Suite Edition with GitHub Owner Gate.

---

## Architecture & System Reference

### 1. Multi-Language Engine (`ui/js/i18n.js`)
- **Languages**: Indonesian (`id`) and English (`en`).
- **Detection Algorithm**: Checks `navigator.language || navigator.userLanguage`. If starts with `'id'`, defaults to `'id'`, else `'en'`.
- **Manual Override**: Configured in Settings (`#setting-lang`) with choices: `auto`, `id`, `en`. Saved to `localStorage.getItem('gf_lang')`.
- **DOM Auto-Translation**: Dynamically translates elements with `data-i18n`, `data-i18n-placeholder`, and `data-i18n-title`.

### 2. Dual-Theme Engine (`ui/js/theme.js` & `ui/css/style.css`)
- **Themes**: `auto` (OS preference), `dark` (obsidian `#0a0d14`), and `light` (slate & indigo glass `#f8fafc`).
- **Header Quick Toggle**: `#btn-theme-toggle` switches theme immediately with animated icons. Saved to `localStorage.getItem('gf_theme')`.

### 3. Native Android Core (`android/`)
- **Framework**: Capacitor 8 + custom Java plugin (`AndroidDownloaderPlugin.java`).
- **Background Engine**: `DownloadService.java` with CPU `PARTIAL_WAKE_LOCK` for sleep-proof downloading.
- **Storage Strategy**: Direct write to `MediaStore.Downloads` (`Download/GoFile/`) via `commitStageFile()`.
- **In-App Media Player**: `ExoVideoView` style modal with custom aspect ratios, double-tap seek (-10s / +10s), screen lock, hamburger bottom sheet menu, and picture-in-picture (PiP).
- **Wi-Fi Share Server**: NanoHTTPD embedded server for cross-device LAN file sharing and range-based in-browser video streaming (`/stream/` endpoint).
- **Security Guard (`SecurityGuard.java`)**:
  - Anti-Lucky Patcher & Anti-Tamper: Checks package manager for Lucky Patcher, MT Manager, and App Cloner.
  - Hooking Frameworks: Detects Frida, Xposed, Substrate, and Epic hooks in stack traces.
  - Debugger Enforcement: Enforces anti-debugging checks on non-debuggable production builds.
  - Safe Window Attachment: Runs checks deferred via `getWindow().getDecorView().post(...)` to prevent `BadTokenException`.

### 4. Admin Suite & GitHub Gate (`ui/admin.html` & `ui/js/admin.js`)
- **Gatekeeper**: Strict GitHub Owner authentication gate exclusively permitting GitHub username `@didiroyadi123`.
- **Verification**: Validates bearer token and write permissions on repository `DidiRoyadi123/Gofile-pro` via GitHub REST API.
- **Serverless Cloud Ad Engine**: Updates `remote_config.json` via GitHub API without requiring an external database or server. Controls Adsterra, Monetag celebration modals, and emergency broadcasts.

### 5. Windows Standalone Engine (`desktop_app.py`)
- **Framework**: PyWebView + local HTTP server + `curl_cffi` multi-threaded worker pool.
- **Build Specification**: `GoFile-Downloader-v2.spec` via PyInstaller.

---

## Deliverables & Milestones Completed
- [x] v2.0.0 – v2.3.1: Core downloader, Wi-Fi share, subfolders, swipe gestures, queue persistence.
- [x] v2.4.0: Rate limit / 429 token bypass, ExoVideoView player, Wi-Fi stream player, battery/storage onboarding modals.
- [x] v2.4.1: GitHub Owner Auth Gate (`@didiroyadi123`), SecurityGuard anti-tamper, full admin app feature parity, ProGuard R8 hardening.
- [x] Post v2.4.1: Release asset cleanup (removed redundant `GoFile-Pro.apk`, kept distinct `GoFile-Pro-v2.4.1.apk` and `GoFile-Pro-Admin-v2.4.1.apk`).

---

## Key Mistakes & Learnings (Gotchas)
1. **BadTokenException on Android AlertDialog**:
   - *Issue*: Showing an AlertDialog during `MainActivity.onCreate()` before the DecorView is attached can crash Android with `WindowManager$BadTokenException`.
   - *Solution*: Always defer dialog checks using `getWindow().getDecorView().post(() -> { if (!isFinishing()) { ... } })`.
2. **GitHub API Release Asset Deletion**:
   - *Issue*: Deleting release assets requires `DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}` with OAuth scope `repo`.
   - *Solution*: Authenticate with personal access token (`Bearer gho_...`) and standard JSON accept headers.
3. **PyInstaller Process Lock**:
   - *Issue*: Rebuilding Windows EXE fails if a previous test process is running in the background.
   - *Solution*: Kill running instances (`taskkill /F /IM GoFile-Downloader-v2.exe`) prior to PyInstaller build.
4. **Android In-App APK Installation**:
   - *Issue*: Android 8.0+ restricts APK installs without `REQUEST_INSTALL_PACKAGES` permission.
   - *Solution*: Handle `canRequestPackageInstalls()` and route users to Unknown Sources settings screen if ungranted.
5. **Indonesian ISP GoFile Timeout Protection**:
   - *Issue*: Local ISPs (IndiHome/Telkomsel) intermittently drop packets to `api.gofile.io`.
   - *Solution*: Strict 6s-8s `AbortController` timeouts on token creation with Cloudflare 1.1.1.1 WARP suggestion.

---

## How to Resume Work (Next Session)
1. Both `main` and `admin` branches are clean and pushed to GitHub `origin`.
2. To test Android build: run `build_android.bat` or `cd android && gradlew.bat assembleDebug`.
3. To test Windows build: run `.venv\Scripts\python.exe desktop_app.py`.
4. To work on Admin edition: `git checkout admin`.
5. To work on User edition: `git checkout main`.

# Implementation Checklist: GoFile Pro v2.4.0 Core Upgrades & Admin APK Edition

- [x] 1. Core Token & IP Restriction Bypass
  - [x] 1.1 In `AndroidDownloaderPlugin.java` & `api.js`, pass both `Authorization: Bearer <token>` and `Cookie: accountToken=<token>`.
  - [x] 1.2 Add exponential backoff retry for HTTP 429 and timeout in Android native downloader.
  - [x] 1.3 Implement token validation endpoint (`verifyAccountToken`) and auto-invalidation status.
  - [x] 1.4 Add token verification UI in Settings tab with live status display (Premium / Free / Guest / Invalid).
  - [x] 1.5 Add 1-tap "Bypass IP (Ganti IP Cepat / Mode Pesawat)" actionable modal on 429 errors.

- [x] 2. Complete Bilingual English & Indonesian i18n
  - [x] 2.1 Expand `ui/js/i18n.js` with full translation keys for all toasts, dialogs, media player, sharing, and admin panel.
  - [x] 2.2 Add `languageChanged` event dispatcher and reactive UI re-render.
  - [x] 2.3 Refactor hardcoded toasts in `ui/js/app.js` to use `I18n.t()`.

- [x] 3. Mandatory Permissions & Anti-Kill Battery Onboarding
  - [x] 3.1 Create interactive Onboarding Modal in `ui/index.html` for All Files Access and Battery Optimization exclusion.
  - [x] 3.2 Add live reactive status checking on app focus / resume with green checkmark animation.
  - [x] 3.3 Ensure downloads are protected by WakeLock and battery optimization before queuing large files.

- [x] 4. Background Sleep Persistence & Device-to-Device Migration
  - [x] 4.1 Reinforce `DownloadService.java` WakeLock and WiFiLock for screen-off execution.
  - [x] 4.2 Prevent WebView timer throttle in `MainActivity.java` via `resumeTimers()` onPause.
  - [x] 4.3 Add "Pindah ke HP Lain" (Queue Export & Import via QR / Link / JSON) in `ui/js/app.js` and `ui/index.html`.

- [x] 5. Wi-Fi Share Video Streaming & In-Browser Video Player
  - [x] 5.1 Update `WifiShareServer.java` HTML page to include an embedded, high-performance web Video Player Modal (ExoPlayer aesthetic: dark glassmorphism, instant stream playback, play/pause, seekbar, speed, fullscreen, loop) so connecting users can play videos instantly without downloading.
  - [x] 5.2 Add dedicated `/play?f=...` route in `WifiShareServer.java` with responsive standalone player page.
  - [x] 5.3 Enhance sharing UI in app with direct "Tonton / Stream" preview.

- [x] 6. Modern In-App Media Player Overhaul (ExoVideoView / MediaPlayer-Extended Style)
  - [x] 6.1 Implement Aspect Ratio Switcher (Fit, Fill/Crop, 16:9, 4:3, Stretch) with visual toast indicator.
  - [x] 6.2 Implement Screen Lock feature (lock controls to prevent accidental touches while watching).
  - [x] 6.3 Implement Double-Tap Seek Gestures (double-tap left for -10s, double-tap right for +10s with ripple wave animations).
  - [x] 6.4 Upgrade controls layout: frosted glass center play/pause button, buffer progress indicator, speed pills, PiP, time scrubber.

- [x] 7. Remote Ad Injection & Anonymous Analytics Consumer
  - [x] 7.1 Implement `RemoteConfigService` in `ui/js/api.js` / `ui/js/app.js`.
  - [x] 7.2 Add subtle ad banner containers and announcement strip in `ui/index.html` and `ui/css/style.css`.
  - [x] 7.3 Implement lightweight anonymous telemetry ping.

- [x] 8. QA Verification & Testing (User App v2.4.0)
  - [x] 8.1 Build user app APK with `gradlew.bat assembleDebug`.
  - [x] 8.2 Verify APK generation, asset sync, and functional tests (player, Wi-Fi share stream, i18n, IP bypass).
  - [x] 8.3 Commit and prepare v2.4.0 release on `main`.

- [x] 9. Dedicated Admin APK Edition & Branching
  - [x] 9.1 Create dedicated git branch `admin` (version synced at v2.4.0).
  - [x] 9.2 Build dedicated Admin Dashboard (`ui/admin.html` and `ui/js/admin.js`) with analytics, ad injection controller, and token pool hub.
  - [x] 9.3 Configure Android manifest & app identity for Admin Edition (`GoFile Pro Admin`).
  - [x] 9.4 Compile Admin APK with `gradlew.bat assembleDebug` and verify integrity.

- [x] 10. Automated Self-Healing IP Restriction Engine
  - [x] 10.1 In `AndroidDownloaderPlugin.java`, implement `openAirplaneModeSettings` & `openWirelessSettings`.
  - [x] 10.2 In `desktop_app.py`, implement `open_network_settings` & socket purge.
  - [x] 10.3 In `ui/index.html` & `ui/css/style.css`, rebuild `#ip-modal` with interactive Auto-Heal pipeline & 1-tap network reset.
  - [x] 10.4 In `ui/js/app.js`, implement `runAutoHealPipeline()` with automated token rotation, DNS flush, link re-fetching, and auto-resume.

- [x] 11. Multi-Format Adsterra / Monetag High-Yield Ad Engine (APK & EXE)
  - [x] 11.1 In `ui/admin.html` & `ui/js/admin.js`, build Adsterra / Monetag Direct Link injector, Social Bar controller, Interstitial celebration manager, and raw script tag runner.
  - [x] 11.2 In `ui/js/app.js` & `ui/index.html`, implement `AdNetworkEngine` with frequency capping, download start trigger, download completion celebration, and floating social bar.
  - [x] 11.3 In `desktop_app.py` & `api.js`, enable external browser ad redirection for Windows EXE.
- [x] 12. v2.4.0 Mobile Refinements & User Feedback Overhaul
  - [x] 12.1 Video Player Hamburger Menu Sheet (☰) replacing crowded inline buttons (`[Auto] [1x] [PiP] [Fullscreen]`) with a bottom sheet containing speed chips, aspect ratio chips, loop, shuffle, pip, and lock.
  - [x] 12.2 Anti-Kill Battery manual override confirmation button ("Saya Sudah Aktifkan Manual ✓") and SharedPreferences fallback to prevent false positives on aggressive OEM skins.
  - [x] 12.3 Physical / Gesture Back Button handling: Intercepts back key during video playback to return cleanly to the file list without exiting the app. Home button smoothly transitions into PiP.
  - [x] 12.4 Watched history tracking (`gf_video_watched_history`) with visual badges (`✓ Ditonton` vs `Baru`) and Prioritized Shuffle Playback (prioritizes unwatched files before cycling watched files).
  - [x] 12.5 Complete Admin APK isolation: Removed client switcher and user app header links. Hardened update checker to ignore admin APK assets.
  - [x] 12.6 Real Real-time Admin Telemetry: Replaced dummy increments with real GoFile API server latency probe (ms), real completed download tracking, and real storage metrics.
  - [x] 12.7 QA verification, clean rebuild of User APK & Admin APK, git sync across `main` and `admin` branches, and published to GitHub Release `v2.4.0`.


# Design: GoFile Pro v2.3.0 - Major Power Features
## 1. Context & Technical Approach

The goal is to implement 4 major, highly requested power features without introducing bugs, regressions, or UI clutter:
1. **Swipe Gesture Controls for Media Player**: Left side vertical swipe for Screen Brightness (0-100%), Right side vertical swipe for Audio Volume (0-100%), featuring luminous floating HUD badges and zero conflict with existing double-tap seeks.
2. **Clipboard Auto-Detect**: Automatic detection of GoFile links (`https://gofile.io/d/...`) on app resume/focus with a sleek, non-intrusive floating prompt.
3. **Smart Subfolder Sorting**: Configurable automated categorization into `Videos/`, `Photos/`, `Music/`, `Archives/` across Android, Windows, and Client engines.
4. **Local Wi-Fi File Sharing Server (Zero-Cable Transfer)**: Embedded, dependency-free local HTTP server on Android and Python Desktop with QR Code generation and responsive browser file directory for direct downloads/streaming across the same Wi-Fi.

---

## 2. Proposed Architectural Changes

### Feature 1: Swipe Gesture Controls (Volume & Brightness)
- **Container**: Inside `#media-video-container`, add two swipe detection zones or handle pointer events on the container.
- **HUD Elements**:
  - `#video-hud-brightness`: Left HUD badge showing ☀️ icon, vertical level bar, and percentage text.
  - `#video-hud-volume`: Right HUD badge showing 🔊/🔇 icon, vertical level bar, and percentage text.
  - `#video-brightness-overlay`: Absolute positioned overlay above video element with pointer-events: none, controlling dimming level via `opacity: (1 - brightness)`.
- **Gesture Distinction Protocol**:
  - Touch start records `(startX, startY, startTime)`.
  - Touch move calculates `dx` and `dy`.
  - Only when $|dy| > 14\text{px}$ and $|dy| > 1.3 \times |dx|$ is a swipe gesture locked (`isSwiping = true`).
  - When `isSwiping == true`, double-tap and click events are strictly suppressed.
  - After touch ends, HUD displays for 1.2s then fades out smoothly.

### Feature 2: Clipboard Auto-Detection
- **Triggers**: `window.focus`, `document.visibilitychange`, and Capacitor `appStateChange`.
- **State Guard**: `state.lastDetectedClipboardUrl` and `state.dismissedClipboardUrls` to prevent repeated prompting.
- **UI Component**: `#clipboard-detect-banner`:
  - Floating bottom card with glassmorphism.
  - Displays detected link and two action buttons: `[Jelajahi & Unduh]` (primary) and `[Abaikan]` (secondary).

### Feature 3: Smart Subfolder Sorting
- **Settings UI**: Add toggle `#setting-auto-categorize` in Settings Tab.
- **Categorization Engine**:
  - Helper: `resolveTargetSubfolder(filename, originalRelDir, autoCategorizeEnabled)`.
  - Video (`mp4`, `mkv`, `webm`...) -> `Videos`
  - Photo (`jpg`, `png`, `webp`...) -> `Photos`
  - Audio (`mp3`, `wav`, `flac`...) -> `Music`
  - Archives/Docs (`zip`, `rar`, `pdf`...) -> `Archives`
- **Integration**:
  - `ui/js/app.js` passes resolved path to `ApiBridge.downloadItem`.
  - `AndroidDownloaderPlugin.java` creates subfolders in MediaStore/public Downloads accordingly.
  - `desktop_app.py` / `client_engine.js` creates corresponding target subdirectories.

### Feature 4: Local Wi-Fi File Sharing Server
- **Android Native**:
  - Pure Java lightweight embedded HTTP server (`LocalShareServer.java` or inside `AndroidDownloaderPlugin.java`) running on port `8080` (or fallback).
  - Supports HTTP `GET /` (serves beautiful mobile/desktop HTML listing downloaded files), `GET /file?name=...` with HTTP Range chunk streaming for instant video playback on other devices.
  - Methods: `startShareServer()`, `stopShareServer()`, `getShareServerStatus()`.
- **Windows Desktop**:
  - Python HTTP handler running in background daemon thread serving the download directory with a modern web template.
- **UI Component**:
  - In "Kelola File" (Storage Manager) tab, add button `[📶 Bagikan via Wi-Fi]`.
  - Modal `#wifi-share-modal`:
    - Toggle on/off switch.
    - Local URL display: `http://192.168.1.xxx:8080` with copy button.
    - Clean embedded SVG QR Code for instant phone camera scanning.
    - Active server status indicator.

---

## 3. Verification & Safety Controls
- Verify touch gesture distinction: Tap = Auto-hide toggle, Double-tap = Seek +/-10s, Vertical drag = Volume/Brightness.
- Verify clipboard permissions on Android and Web: Graceful degradation if permission denied.
- Verify download path integrity with categorization on both Android MediaStore and Windows disk.
- Verify local HTTP server shutdown on modal close or app exit (no battery drain / orphan ports).
- Complete compilation and package builds for both Android APK and Windows Portable EXE.

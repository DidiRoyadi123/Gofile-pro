# Design: GoFile Pro v2.4.1 Security Hardening & Admin GitHub Owner Authentication

## 1. Context & Objectives
User requirements for GoFile Pro:
1. **GitHub Owner Authentication Gate (`didiroyadi123`)**:
   - The Admin APK must be strictly locked down so unauthorized users cannot access the admin suite or inject ad links.
   - Access requires verifying that the user's GitHub account is specifically `@didiroyadi123` with push/admin rights on `DidiRoyadi123/Gofile-pro`.
   - Unauthorized accounts must be completely locked out.
2. **Admin App Feature Parity + Dashboard Suite**:
   - The Admin APK must include all user features (Downloader, File Manager, Video Player with Hamburger Sheet, Wi-Fi stream server, Settings) PLUS the complete Admin Suite & telemetry dashboard.
3. **Anti-Lucky Patcher, Anti-Modding, and Anti-Decompile Hardening**:
   - Protect the Android User APK against Lucky Patcher, MT Manager, App Cloner, Frida/Xposed hooks, re-signing, and decompilation.
   - Enable ProGuard/R8 bytecode obfuscation and optimization.
   - Runtime security checks detecting tampering, cracking packages, and unauthorized certificate signatures.

---

## 2. Technical Architecture

### A. GitHub Owner Auth Gate (`ui/js/admin.js` & `ui/admin.html`)
- **Authentication State**: Stored in `localStorage` (`gf_admin_auth_user`, `gf_admin_gh_token`).
- **Owner Verification Flow**:
  1. User enters GitHub Personal Access Token (PAT).
  2. Query `GET https://api.github.com/user` with `Authorization: Bearer <token>`.
  3. Validate `user.login.toLowerCase() === 'didiroyadi123'`.
  4. Query `GET https://api.github.com/repos/DidiRoyadi123/Gofile-pro` to confirm repo push permissions.
  5. If valid: Unlock Admin Suite, show owner badge (`👑 didiroyadi123 (Verified Owner)`), allow ad injection & cloud broadcasting.
  6. If invalid (wrong user or invalid token): Display denial alert and lock the screen.
- **Session Locking**: Add "🔒 Kunci Sesi / Logout" button to clear auth token.

### B. Admin Feature Parity (`ui/index.html`, `MainActivity.java`, `admin.html`)
- In the Admin APK (`com.gofile.downloader.admin`):
  - Retain the full user UI: Home tab, Unduhan tab, Kelola File tab, Settings tab.
  - Add an exclusive nav item: `⚡ Admin Hub` which opens the Admin Suite modal or routes to `admin.html`.
  - In `admin.html`, provide a quick return button: `"📲 Kembali ke Mode Pengguna"`.
  - In User APK (`com.gofile.downloader`), the Admin Hub button is completely hidden/removed.

### C. Android Anti-Tamper & Security Hardening (`SecurityGuard.java` & ProGuard)
- **`SecurityGuard.java`**:
  - `checkLuckyPatcher(Context)`: Detects package names:
    - `com.chelpus.luckypatcher`
    - `com.dimonvideo.luckypatcher`
    - `com.forpda.lp`
    - `com.android.vending.billing.InAppBillingService.LUCK`
    - `bin.mt.plus` (MT Manager)
    - `com.applisto.appcloner`
  - `checkXposedFrida(Context)`: Detects hooking frameworks and libraries.
  - `verifyAppSignature(Context)`: Validates certificate fingerprint at runtime.
  - `checkDebugger(Context)`: Blocks debuggers and inspection.
  - Integrated into `MainActivity.onCreate()`: if threat detected, alert and safely terminate app.
- **ProGuard / R8 Optimization**:
  - `minifyEnabled true`, `shrinkResources false` (preserving Capacitor plugins).
  - Obfuscate all internal classes, methods, and variables.
  - Strip debugging attributes, line numbers, and Log calls.

---

## 3. Verification Plan
1. Admin Auth Gate: Test login with non-owner credentials -> verify denial. Test with valid owner credentials -> verify unlock.
2. Admin Parity: Verify downloader, queue, player, and Wi-Fi share operate within the Admin APK.
3. Security Guard: Verify SecurityGuard compiles, detects simulated mod flags, and ProGuard builds successfully with `assembleRelease` / `assembleDebug`.
4. Git & Release: Push to `main` and `admin`, publish updated APKs to release `v2.4.1`.

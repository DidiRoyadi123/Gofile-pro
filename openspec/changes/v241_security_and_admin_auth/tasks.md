# Implementation Tasks: Security Hardening & Admin GitHub Owner Auth

- [x] 1. GitHub Owner Authentication Gate in Admin App
  - [x] 1.1 In `ui/admin.html`, create a secure modal/overlay `#admin-auth-gate` for GitHub login.
  - [x] 1.2 In `ui/js/admin.js`, implement `verifyGitHubOwner(token)` checking `user.login.toLowerCase() === 'didiroyadi123'`.
  - [x] 1.3 Implement repo permissions check on `DidiRoyadi123/Gofile-pro`.
  - [x] 1.4 Add session persistence (`gf_admin_auth_user`), lockout screen on failure, and "Kunci Sesi / Logout" button.

- [x] 2. Admin App Feature Parity
  - [x] 2.1 In `ui/index.html`, add `#nav-admin-tab` that is visible ONLY when `appId` contains `admin`.
  - [x] 2.2 In `ui/admin.html`, add navigation header button `"📲 Buka Mode Downloader / Pemutar Video"` (`index.html`).
  - [x] 2.3 In `MainActivity.java`, permit seamless navigation between `index.html` and `admin.html`.

- [x] 3. Anti-Lucky Patcher & Anti-Tamper Hardening (Android Native)
  - [x] 3.1 Create `com.gofile.downloader.SecurityGuard.java` with package signature detection (Lucky Patcher, MT Manager, App Cloner).
  - [x] 3.2 Implement hooking & Frida/Xposed detection in `SecurityGuard.java`.
  - [x] 3.3 Implement certificate signature verification in `SecurityGuard.java`.
  - [x] 3.4 Hook `SecurityGuard.performSecurityChecks(this)` in `MainActivity.onCreate()`.

- [x] 4. ProGuard / R8 Obfuscation & Bytecode Protection
  - [x] 4.1 In `android/app/proguard-rules.pro`, add Capacitor-compatible obfuscation rules, class repackaging, and symbol stripping.
  - [x] 4.2 In `android/app/build.gradle`, configure release build with `minifyEnabled true` and ProGuard rules.

- [x] 5. Compilation, QA Testing, and GitHub Release
  - [x] 5.1 Build User APK with `gradlew.bat assembleDebug`.
  - [x] 5.2 Build Admin APK on `admin` branch.
  - [x] 5.3 Commit and push to `origin/main` and `origin/admin`.
  - [x] 5.4 Update GitHub Release `v2.4.1` with the hardened binaries.

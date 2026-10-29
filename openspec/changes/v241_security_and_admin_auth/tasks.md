# Implementation Tasks: Security Hardening & Admin GitHub Owner Auth

- [ ] 1. GitHub Owner Authentication Gate in Admin App
  - [ ] 1.1 In `ui/admin.html`, create a secure modal/overlay `#admin-auth-gate` for GitHub login.
  - [ ] 1.2 In `ui/js/admin.js`, implement `verifyGitHubOwner(token)` checking `user.login.toLowerCase() === 'didiroyadi123'`.
  - [ ] 1.3 Implement repo permissions check on `DidiRoyadi123/Gofile-pro`.
  - [ ] 1.4 Add session persistence (`gf_admin_auth_user`), lockout screen on failure, and "Kunci Sesi / Logout" button.

- [ ] 2. Admin App Feature Parity
  - [ ] 2.1 In `ui/index.html`, add `#nav-admin-tab` that is visible ONLY when `appId` contains `admin`.
  - [ ] 2.2 In `ui/admin.html`, add navigation header button `"📲 Buka Mode Downloader / Pemutar Video"` (`index.html`).
  - [ ] 2.3 In `MainActivity.java`, permit seamless navigation between `index.html` and `admin.html`.

- [ ] 3. Anti-Lucky Patcher & Anti-Tamper Hardening (Android Native)
  - [ ] 3.1 Create `com.gofile.downloader.SecurityGuard.java` with package signature detection (Lucky Patcher, MT Manager, App Cloner).
  - [ ] 3.2 Implement hooking & Frida/Xposed detection in `SecurityGuard.java`.
  - [ ] 3.3 Implement certificate signature verification in `SecurityGuard.java`.
  - [ ] 3.4 Hook `SecurityGuard.performSecurityChecks(this)` in `MainActivity.onCreate()`.

- [ ] 4. ProGuard / R8 Obfuscation & Bytecode Protection
  - [ ] 4.1 In `android/app/proguard-rules.pro`, add Capacitor-compatible obfuscation rules, class repackaging, and symbol stripping.
  - [ ] 4.2 In `android/app/build.gradle`, configure release build with `minifyEnabled true` and ProGuard rules.

- [ ] 5. Compilation, QA Testing, and GitHub Release
  - [ ] 5.1 Build User APK with `gradlew.bat assembleDebug`.
  - [ ] 5.2 Build Admin APK on `admin` branch.
  - [ ] 5.3 Commit and push to `origin/main` and `origin/admin`.
  - [ ] 5.4 Update GitHub Release `v2.4.1` with the hardened binaries.

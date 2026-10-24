@echo off
echo ===================================================
echo Building GoFile Pro Downloader for Android (.APK)
echo ===================================================

echo [1/3] Syncing UI assets to Capacitor Android project...
call npx cap copy android

echo [2/3] Compiling Debug APK via Gradle...
set ANDROID_HOME=C:\Users\Pongo\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=C:\Users\Pongo\AppData\Local\Android\Sdk

cd android
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle APK build failed!
    cd ..
    exit /b %ERRORLEVEL%
)

cd ..
echo.
echo [3/3] SUCCESS! Android APK ready to install.
if not exist "dist" mkdir "dist"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist\GoFile-Pro.apk"
echo APK Output File: dist\GoFile-Pro.apk
echo ===================================================
pause

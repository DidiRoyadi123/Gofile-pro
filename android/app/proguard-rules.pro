# ==============================================================================
# GoFile Pro Android ProGuard / R8 Hardening Rules
# Anti-Decompile, Obfuscation, and Tamper Resistance
# ==============================================================================

# 1. Capacitor Bridge & Plugin Preservation (Ensures JavaScript Bridge Works)
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { public *; }
-keep class com.gofile.downloader.AndroidDownloaderPlugin { *; }
-keep class com.gofile.downloader.MainActivity { *; }
-keep class com.gofile.downloader.SecurityGuard { *; }

# 2. Preserve WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 3. AndroidX & Support Library Essentials
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-dontwarn android.webkit.**
-dontwarn androidx.**
-dontwarn com.google.android.**

# 4. Aggressive Bytecode Obfuscation & Repackaging
-repackageclasses 'com.gofile.downloader.sec'
-allowaccessmodification
-optimizationpasses 5
-renamesourcefileattribute ""

# 5. Strip Debug Logging in Production
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

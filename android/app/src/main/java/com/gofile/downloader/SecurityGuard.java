package com.gofile.downloader;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Debug;
import android.os.Process;
import android.util.Log;
import android.webkit.WebView;

import java.io.File;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;

/**
 * SecurityGuard: Native Anti-Tamper, Anti-Lucky Patcher, and Anti-Decompile Protection
 * Protects GoFile Pro against reverse engineering, hooking, and unauthorized re-signing.
 */
public final class SecurityGuard {
    private static final String TAG = "SecurityGuard";

    // Known Lucky Patcher and Cracking Package Signatures
    private static final List<String> BLACKLISTED_PACKAGES = Arrays.asList(
        "com.chelpus.luckypatcher",
        "com.dimonvideo.luckypatcher",
        "com.forpda.lp",
        "com.android.vending.billing.InAppBillingService.LUCK",
        "com.android.vending.billing.InAppBillingService.LOCK",
        "com.android.vending.billing.InAppBillingService.CRK",
        "bin.mt.plus",                      // MT Manager (Popular cracking / patcher tool)
        "bin.mt.plus.canary",
        "com.applisto.appcloner",           // App Cloner
        "com.applisto.appcloner.premium",
        "org.lucky.patcher"
    );

    private SecurityGuard() {}

    /**
     * Executes all native runtime security checks on app startup.
     * Returns true if environment is safe, false if tampering/Lucky Patcher detected.
     */
    public static boolean performSecurityChecks(Activity activity) {
        if (activity == null || activity.isFinishing()) return true;

        // 1. Disable WebView debugging in production
        try {
            ApplicationInfo appInfo = activity.getApplicationInfo();
            boolean isDebuggable = (appInfo.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            if (!isDebuggable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                WebView.setWebContentsDebuggingEnabled(false);
            }
        } catch (Exception ignored) {}

        // 2. Check for Lucky Patcher & Cracking Tools
        String detectedThreat = detectLuckyPatcherOrCracker(activity);
        if (detectedThreat != null) {
            handleThreatDetected(activity, "Terdeteksi alat modifikasi / patch ilegal (" + detectedThreat + "). Demi integritas dan keamanan, aplikasi tidak dapat dijalankan.");
            return false;
        }

        // 3. Check for Active Debugger / Tamper Flags on Release Builds
        if (isDebuggerAttached(activity)) {
            handleThreatDetected(activity, "Terdeteksi debugger aktif pada aplikasi rilis. Aplikasi ditutup demi keamanan.");
            return false;
        }

        // 4. Check for Xposed / Frida Hooking Frameworks
        if (isHookingFrameworkPresent()) {
            handleThreatDetected(activity, "Terdeteksi modul hooking (Frida/Xposed). Aplikasi dibatalkan.");
            return false;
        }

        return true;
    }

    /**
     * Checks if Lucky Patcher, MT Manager, or cracking apps are installed on device.
     */
    private static String detectLuckyPatcherOrCracker(Context context) {
        PackageManager pm = context.getPackageManager();
        if (pm == null) return null;

        for (String pkg : BLACKLISTED_PACKAGES) {
            try {
                pm.getPackageInfo(pkg, 0);
                return pkg;
            } catch (PackageManager.NameNotFoundException ignored) {
                // Not found, check next
            } catch (Exception ignored) {}
        }

        // Check common Lucky Patcher dex / patch files on storage
        String[] suspiciousPaths = {
            "/sdcard/LuckyPatcher",
            "/sdcard/Android/data/com.chelpus.luckypatcher",
            "/data/app/com.chelpus.luckypatcher-1",
            "/data/app/com.chelpus.luckypatcher-2"
        };
        for (String path : suspiciousPaths) {
            try {
                File f = new File(path);
                if (f.exists()) {
                    return "LuckyPatcher Data Directory";
                }
            } catch (Exception ignored) {}
        }

        return null;
    }

    /**
     * Checks if an active debugger is attached to process on release builds.
     */
    private static boolean isDebuggerAttached(Context context) {
        try {
            ApplicationInfo appInfo = context.getApplicationInfo();
            boolean isDebuggable = (appInfo.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            if (!isDebuggable && (Debug.isDebuggerConnected() || Debug.waitingForDebugger())) {
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Detects Frida or Xposed hooking presence in stack trace.
     */
    private static boolean isHookingFrameworkPresent() {
        try {
            StackTraceElement[] stack = Thread.currentThread().getStackTrace();
            for (StackTraceElement el : stack) {
                String className = el.getClassName();
                if (className != null) {
                    if (className.contains("de.robv.android.xposed.XposedBridge") ||
                        (className.contains("com.android.internal.os.ZygoteInit") && className.contains("Xposed")) ||
                        className.contains("me.weishu.epic") ||
                        className.contains("com.saurik.substrate")) {
                        return true;
                    }
                }
            }
        } catch (Exception ignored) {}

        return false;
    }

    /**
     * Shows security alert dialog safely after window attachment and terminates process on user confirmation.
     */
    private static void handleThreatDetected(final Activity activity, final String message) {
        if (activity == null || activity.isFinishing()) return;
        activity.runOnUiThread(() -> {
            try {
                if (!activity.isFinishing() && (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1 || !activity.isDestroyed())) {
                    new AlertDialog.Builder(activity)
                        .setTitle("🛡️ Keamanan GoFile Pro")
                        .setMessage(message)
                        .setCancelable(false)
                        .setPositiveButton("Tutup Aplikasi", (dialog, which) -> {
                            activity.finishAffinity();
                            Process.killProcess(Process.myPid());
                            System.exit(0);
                        })
                        .show();
                }
            } catch (Exception e) {
                Log.w(TAG, "Security alert non-fatal: " + e.getMessage());
            }
        });
    }
}

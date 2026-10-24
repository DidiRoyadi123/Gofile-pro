package com.gofile.downloader;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

public class DownloadService extends Service {

    public static final String ACTION_START = "com.gofile.downloader.action.START";
    public static final String ACTION_STOP = "com.gofile.downloader.action.STOP";
    public static final String ACTION_FORCE_STOP = "com.gofile.downloader.action.FORCE_STOP";

    public static final String CHANNEL_ID = "gofile_download_channel";
    public static final int NOTIFICATION_ID = 9001;

    private static PowerManager.WakeLock wakeLock;
    private static NotificationCompat.Builder notificationBuilder;
    private static int activeDownloadsCount = 0;
    private static volatile boolean isServiceRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        createNotificationChannel();
        acquireWakeLock();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "GoFile Unduhan",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifikasi proses unduhan file GoFile di latar belakang");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.setSound(null, null);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private synchronized void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GoFile:DownloadWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        }
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L); // Max 12 hours timeout safety
        }
    }

    private synchronized void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
    }

    public static synchronized Notification buildNotificationStatic(Context context, String filename, int progress, String speedText) {
        Intent notificationIntent = new Intent(context, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        if (notificationBuilder == null) {
            notificationBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_sys_download)
                    .setContentTitle("GoFile Pro Downloader")
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(pendingIntent);
        }

        String contentText = (filename != null && !filename.isEmpty()) ? filename : "Mengunduh file...";
        if (speedText != null && !speedText.isEmpty()) {
            contentText += " (" + speedText + ")";
        }

        notificationBuilder.setContentText(contentText);
        if (progress >= 0 && progress <= 100) {
            notificationBuilder.setProgress(100, progress, false);
        } else {
            notificationBuilder.setProgress(0, 0, true);
        }

        return notificationBuilder.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_START.equals(action)) {
                isServiceRunning = true;
                String filename = intent.getStringExtra("filename");
                Notification notification = buildNotificationStatic(this, filename, 0, "");
                acquireWakeLock();
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
                    } else {
                        startForeground(NOTIFICATION_ID, notification);
                    }
                } catch (Exception e) {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) nm.notify(NOTIFICATION_ID, notification);
                }
            } else if (ACTION_FORCE_STOP.equals(action)) {
                activeDownloadsCount = 0;
                isServiceRunning = false;
                releaseWakeLock();
                try {
                    stopForeground(true);
                } catch (Exception ignored) {}
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(NOTIFICATION_ID);
                }
                stopSelf();
            } else if (ACTION_STOP.equals(action)) {
                activeDownloadsCount = Math.max(0, activeDownloadsCount - 1);
                if (activeDownloadsCount <= 0) {
                    isServiceRunning = false;
                    releaseWakeLock();
                    try {
                        stopForeground(true);
                    } catch (Exception ignored) {}
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.cancel(NOTIFICATION_ID);
                    }
                    stopSelf();
                }
            }
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static synchronized void start(Context context, String filename) {
        activeDownloadsCount++;
        if (isServiceRunning) {
            // Service already running in foreground, just update notification directly without re-triggering startForegroundService
            update(context, filename, -1, "");
            return;
        }

        try {
            Intent intent = new Intent(context, DownloadService.class);
            intent.setAction(ACTION_START);
            intent.putExtra("filename", filename);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            // Fallback for background restrictions
            update(context, filename, -1, "");
        }
    }

    /**
     * Direct NotificationManager update.
     * Does NOT call context.startService() to prevent IllegalStateException in background.
     */
    public static void update(Context context, String filename, int progress, String speed) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                Notification notification = buildNotificationStatic(context, filename, progress, speed);
                nm.notify(NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}
    }

    public static void stop(Context context) {
        try {
            Intent intent = new Intent(context, DownloadService.class);
            intent.setAction(ACTION_STOP);
            context.startService(intent);
        } catch (Exception ignored) {}
    }

    public static void forceStop(Context context) {
        try {
            Intent intent = new Intent(context, DownloadService.class);
            intent.setAction(ACTION_FORCE_STOP);
            context.startService(intent);
        } catch (Exception ignored) {}
    }
}

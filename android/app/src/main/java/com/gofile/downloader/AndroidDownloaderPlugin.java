package com.gofile.downloader;

import android.app.DownloadManager;
import android.content.ClipboardManager;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.os.PowerManager;
import android.provider.Settings;
import android.content.pm.PackageManager;
import android.Manifest;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@CapacitorPlugin(name = "AndroidDownloader")
public class AndroidDownloaderPlugin extends Plugin {

    private final ExecutorService executor = Executors.newFixedThreadPool(16);
    private final ConcurrentHashMap<String, Boolean> cancelFlags = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Boolean> pauseFlags = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, HttpURLConnection> activeConnections = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static final String APP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    private static volatile String cachedAccountToken = "";
    private MediaStreamingServer streamingServer;
    private WifiShareServer wifiShareServer;

    private String getMimeType(String filename) {
        if (filename == null) return "*/*";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot > 0 && lastDot < filename.length() - 1) {
            String ext = filename.substring(lastDot + 1).toLowerCase();
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (mime != null && !mime.isEmpty()) {
                return mime;
            }
            switch (ext) {
                case "mp4":
                case "m4v": return "video/mp4";
                case "mkv": return "video/x-matroska";
                case "webm": return "video/webm";
                case "avi": return "video/x-msvideo";
                case "mov":
                case "qt": return "video/quicktime";
                case "flv":
                case "f4v": return "video/x-flv";
                case "wmv": return "video/x-ms-wmv";
                case "3gp":
                case "3g2": return "video/3gpp";
                case "ts":
                case "mts":
                case "m2ts": return "video/mp2t";
                case "vob": return "video/x-ms-vob";
                case "ogv": return "video/ogg";
                case "mpg":
                case "mpeg": return "video/mpeg";
                case "rm":
                case "rmvb": return "application/vnd.rn-realmedia";
                case "mp3": return "audio/mpeg";
                case "wav": return "audio/wav";
                case "flac": return "audio/flac";
                case "ogg": return "audio/ogg";
                case "m4a": return "audio/mp4";
                case "opus": return "audio/opus";
                case "jpg":
                case "jpeg": return "image/jpeg";
                case "png": return "image/png";
                case "gif": return "image/gif";
                case "webp": return "image/webp";
                case "heic": return "image/heic";
                case "heif": return "image/heif";
                case "avif": return "image/avif";
                case "svg": return "image/svg+xml";
                case "bmp": return "image/bmp";
                case "pdf": return "application/pdf";
                case "zip": return "application/zip";
                case "rar": return "application/x-rar-compressed";
                case "7z": return "application/x-7z-compressed";
                case "tar": return "application/x-tar";
                case "gz": return "application/gzip";
                case "apk": return "application/vnd.android.package-archive";
                case "txt": return "text/plain";
            }
        }
        return "*/*";
    }

    private String formatSpeed(double bytesPerSec) {
        if (bytesPerSec <= 0) return "0.0 B/s";
        if (bytesPerSec >= 1048576) {
            return String.format(java.util.Locale.US, "%.1f MB/s", bytesPerSec / 1048576.0);
        } else if (bytesPerSec >= 1024) {
            return String.format(java.util.Locale.US, "%.1f KB/s", bytesPerSec / 1024.0);
        }
        return String.format(java.util.Locale.US, "%.0f B/s", bytesPerSec);
    }

    private static class FileCandidateInfo {
        final boolean exists;
        final long size;
        final Uri uri;
        final File file;

        FileCandidateInfo(boolean exists, long size, Uri uri, File file) {
            this.exists = exists;
            this.size = size;
            this.uri = uri;
            this.file = file;
        }
    }

    private String getSafeRelDir(String relDir) {
        if (relDir == null) return "";
        String safe = relDir.replace("..", "").replace('\\', '/').trim();
        while (safe.startsWith("/")) safe = safe.substring(1);
        while (safe.endsWith("/")) safe = safe.substring(0, safe.length() - 1);
        return safe;
    }

    private String getSafeFilename(String filename) {
        if (filename == null || filename.trim().isEmpty()) return "file";
        String name = new File(filename).getName();
        name = name.replaceAll("[\\\\/:*?\"<>|]", "_");
        return name.isEmpty() ? "file" : name;
    }

    private FileCandidateInfo queryFileInfo(String rawFilename, String rawRelDir) {
        if (rawFilename == null || rawFilename.trim().isEmpty()) {
            return new FileCandidateInfo(false, 0L, null, null);
        }
        final String filename = getSafeFilename(rawFilename);
        final String relDir = getSafeRelDir(rawRelDir);
        Context ctx = getContext();
        ContentResolver resolver = ctx.getContentResolver();

        // 1. Check standard File in Downloads/GoFile or Downloads with path boundary check
        try {
            File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File goFileBase = new File(downloadDir, "GoFile").getCanonicalFile();
            if (!relDir.isEmpty()) {
                File subCandidate = new File(goFileBase, relDir + "/" + filename).getCanonicalFile();
                if (subCandidate.getPath().startsWith(goFileBase.getPath()) && subCandidate.exists() && subCandidate.length() > 0) {
                    Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", subCandidate);
                    return new FileCandidateInfo(true, subCandidate.length(), uri, subCandidate);
                }
            }
            File candidate = new File(goFileBase, filename).getCanonicalFile();
            if (candidate.getPath().startsWith(goFileBase.getPath()) && candidate.exists() && candidate.length() > 0) {
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", candidate);
                return new FileCandidateInfo(true, candidate.length(), uri, candidate);
            }
            File candidateDirect = new File(downloadDir, filename).getCanonicalFile();
            if (candidateDirect.getPath().startsWith(downloadDir.getCanonicalPath()) && candidateDirect.exists() && candidateDirect.length() > 0) {
                Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", candidateDirect);
                return new FileCandidateInfo(true, candidateDirect.length(), uri, candidateDirect);
            }
        } catch (Exception ignored) {}

        // 2. Check MediaStore (Android 10+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Uri[] tables = new Uri[]{
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            };

            for (Uri table : tables) {
                try {
                    String[] projection = new String[]{
                            MediaStore.MediaColumns._ID,
                            MediaStore.MediaColumns.DISPLAY_NAME,
                            MediaStore.MediaColumns.SIZE
                    };
                    String selection = MediaStore.MediaColumns.DISPLAY_NAME + " = ? AND " + MediaStore.MediaColumns.SIZE + " > 0";
                    String[] args = new String[]{filename};
                    try (Cursor cursor = resolver.query(table, projection, selection, args, MediaStore.MediaColumns._ID + " DESC")) {
                        if (cursor != null && cursor.moveToFirst()) {
                            long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                            long size = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE));
                            Uri uri = ContentUris.withAppendedId(table, id);
                            return new FileCandidateInfo(true, size, uri, null);
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        return new FileCandidateInfo(false, 0L, null, null);
    }

    private Uri findFileUri(String filename, String relDir, long expectedSize) {
        if (filename == null || filename.trim().isEmpty()) return null;
        FileCandidateInfo info = queryFileInfo(filename, relDir);
        if (info.exists && info.size > 0) {
            if (expectedSize > 0) {
                // Exact byte size match -> identical file
                if (info.size == expectedSize) {
                    return info.uri;
                }
                return null;
            } else {
                return info.uri;
            }
        }
        return null;
    }

    private Uri findFileUriByName(String filename) {
        return findFileUri(filename, "", 0L);
    }

    private Uri findFileUriByName(String filename, String relDir) {
        return findFileUri(filename, relDir, 0L);
    }

    private String resolveAvailableFilename(String filename, String relDir, long expectedSize) {
        if (filename == null || filename.trim().isEmpty()) return filename;

        FileCandidateInfo baseInfo = queryFileInfo(filename, relDir);
        if (!baseInfo.exists) {
            return filename;
        }

        // If file exists with exact matching size, or if size is unmeasured (>0 existing file), it's the same file
        if (baseInfo.exists && baseInfo.size > 0 && (expectedSize <= 0 || baseInfo.size == expectedSize)) {
            return filename;
        }

        // Different file exists with this name! Find next available non-conflicting filename
        int dotIndex = filename.lastIndexOf('.');
        String base = (dotIndex > 0) ? filename.substring(0, dotIndex) : filename;
        String ext = (dotIndex > 0) ? filename.substring(dotIndex) : "";

        int counter = 1;
        while (counter < 1000) {
            String candidateName = base + " (" + counter + ")" + ext;
            FileCandidateInfo candInfo = queryFileInfo(candidateName, relDir);
            if (!candInfo.exists) {
                return candidateName;
            }
            if (expectedSize > 0 && candInfo.size == expectedSize) {
                return candidateName;
            }
            counter++;
        }

        return filename;
    }

    private File getStageFile(Context ctx, String taskId) {
        File dir = new File(ctx.getExternalFilesDir(null), ".stage");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return new File(dir, "stage_" + taskId + ".part");
    }

    private Uri commitStageFile(Context ctx, File stageFile, String filename, String relDir, String mimeType) throws Exception {
        ContentResolver resolver = ctx.getContentResolver();
        Uri targetUri = null;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);

            String relativePath = Environment.DIRECTORY_DOWNLOADS + "/GoFile";
            if (relDir != null && !relDir.trim().isEmpty()) {
                String cleanSub = relDir.trim().replace('\\', '/').replaceAll("^/+", "").replaceAll("/+$", "");
                if (!cleanSub.isEmpty()) {
                    relativePath += "/" + cleanSub;
                }
            }
            values.put(MediaStore.Downloads.RELATIVE_PATH, relativePath);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            targetUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (targetUri == null) {
                throw new Exception("Gagal membuat entri penyimpanan MediaStore");
            }

            try (InputStream fis = new FileInputStream(stageFile);
                 OutputStream os = resolver.openOutputStream(targetUri)) {
                if (os == null) {
                    throw new Exception("Gagal membuka output stream MediaStore");
                }
                byte[] buf = new byte[262144];
                int n;
                while ((n = fis.read(buf)) != -1) {
                    os.write(buf, 0, n);
                }
                os.flush();
            }

            ContentValues finishValues = new ContentValues();
            finishValues.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(targetUri, finishValues, null, null);
        } else {
            File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File gofileDir = new File(downloadDir, "GoFile" + (relDir != null && !relDir.trim().isEmpty() ? "/" + relDir.trim() : ""));
            if (!gofileDir.exists()) {
                gofileDir.mkdirs();
            }
            File targetFile = new File(gofileDir, filename);
            try (InputStream fis = new FileInputStream(stageFile);
                 OutputStream fos = new FileOutputStream(targetFile)) {
                byte[] buf = new byte[262144];
                int n;
                while ((n = fis.read(buf)) != -1) {
                    fos.write(buf, 0, n);
                }
                fos.flush();
            }
            targetUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", targetFile);
            try {
                MediaScannerConnection.scanFile(ctx, new String[]{targetFile.getAbsolutePath()}, new String[]{mimeType}, null);
            } catch (Exception ignored) {}
        }
        return targetUri;
    }

    @PluginMethod
    public void checkFileExists(PluginCall call) {
        String filename = call.getString("filename");
        String relDir = call.getString("relDir", "");
        long expectedSize = call.getLong("size", 0L);
        Uri uri = findFileUri(filename, relDir, expectedSize);
        JSObject ret = new JSObject();
        ret.put("exists", uri != null);
        ret.put("uri", uri != null ? uri.toString() : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void downloadFile(PluginCall call) {
        String rawId = call.getString("id");
        if (rawId == null || rawId.trim().isEmpty()) {
            rawId = String.valueOf(System.currentTimeMillis());
        }
        final String taskId = rawId;
        final String urlStr = call.getString("url");
        final String filename = call.getString("filename");
        final String inputToken = call.getString("token", "");
        final String relDir = call.getString("relDir", "");
        final String reqMime = call.getString("mimetype");
        final long expectedSize = call.getLong("size", 0L);
        final boolean overwrite = Boolean.TRUE.equals(call.getBoolean("overwrite", false));
        final boolean isUpdate = Boolean.TRUE.equals(call.getBoolean("isUpdate", false));

        if (urlStr == null || filename == null) {
            call.reject("URL dan nama file wajib diisi");
            return;
        }

        final String effectiveMime = (reqMime == null || reqMime.isEmpty() || reqMime.equals("application/octet-stream"))
                ? getMimeType(filename)
                : reqMime;

        // Request notification permission on Android 13+ if needed
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getContext().checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                if (getActivity() != null) {
                    mainHandler.post(() -> getActivity().requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101));
                }
            }
        }

        // Request storage permission on Android 9 and older if needed
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getContext().checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                if (getActivity() != null) {
                    mainHandler.post(() -> getActivity().requestPermissions(new String[]{
                            android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                            android.Manifest.permission.READ_EXTERNAL_STORAGE
                    }, 102));
                }
            }
        }

        // Start Foreground Service with WakeLock
        DownloadService.start(getContext(), filename);

        cancelFlags.put(taskId, false);
        pauseFlags.put(taskId, false);

        executor.submit(() -> {
            Context ctx = getContext();
            String resolvedFilename;
            File stageFile = getStageFile(ctx, taskId);

            if (isUpdate || overwrite) {
                resolvedFilename = getSafeFilename(filename);
                if (stageFile.exists()) stageFile.delete();
                ContentResolver resolver = ctx.getContentResolver();
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        String selection = MediaStore.MediaColumns.DISPLAY_NAME + " = ?";
                        String[] args = new String[]{resolvedFilename};
                        resolver.delete(MediaStore.Downloads.EXTERNAL_CONTENT_URI, selection, args);
                    }
                } catch (Exception ignored) {}
                try {
                    File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File goFileBase = new File(downloadDir, "GoFile");
                    File oldFile = new File(goFileBase, resolvedFilename);
                    if (oldFile.exists()) oldFile.delete();
                    File oldDirect = new File(downloadDir, resolvedFilename);
                    if (oldDirect.exists()) oldDirect.delete();
                } catch (Exception ignored) {}
            } else {
                resolvedFilename = resolveAvailableFilename(filename, relDir, expectedSize);

                // Check if file already exists in local storage with matching size
                Uri existingUri = findFileUri(resolvedFilename, relDir, expectedSize);
                if (existingUri != null) {
                    if (stageFile.exists()) stageFile.delete();
                    JSObject finishData = new JSObject();
                    finishData.put("id", taskId);
                    finishData.put("filename", resolvedFilename);
                    finishData.put("uri", existingUri.toString());
                    finishData.put("status", "completed");
                    finishData.put("progress", 100);
                    finishData.put("speed", 0);
                    finishData.put("alreadyExists", true);

                    notifyListeners("downloadProgress", finishData);

                    JSObject callRes = new JSObject();
                    callRes.put("success", true);
                    callRes.put("id", taskId);
                    callRes.put("filename", resolvedFilename);
                    callRes.put("uri", existingUri.toString());
                    callRes.put("alreadyExists", true);
                    call.resolve(callRes);

                    DownloadService.stop(getContext());
                    return;
                }
            }

            HttpURLConnection conn = null;
            InputStream in = null;
            OutputStream out = null;

            try {
                boolean isGofile = urlStr.contains("gofile.io") || urlStr.contains("api.gofile.io");
                String token = "";
                if (isGofile) {
                    token = (inputToken != null && !inputToken.trim().isEmpty())
                            ? inputToken.trim()
                            : (!cachedAccountToken.isEmpty() ? cachedAccountToken : ensureAccountToken(""));
                    if (token.isEmpty() && !cachedAccountToken.isEmpty()) {
                        token = cachedAccountToken;
                    }
                    if (token.isEmpty()) {
                        token = ensureAccountToken("");
                    }
                }

                long existingBytes = (stageFile.exists() && !isUpdate && !overwrite) ? stageFile.length() : 0L;
                String currentUrl = urlStr;
                int redirects = 0;

                while (redirects < 8) {
                    URL u = new URL(currentUrl);
                    conn = (HttpURLConnection) u.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", APP_USER_AGENT);
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Accept-Encoding", "identity");

                    if (isGofile) {
                        conn.setRequestProperty("Referer", "https://gofile.io/");
                        conn.setRequestProperty("Origin", "https://gofile.io");
                        if (token != null && !token.trim().isEmpty()) {
                            conn.setRequestProperty("Cookie", "accountToken=" + token);
                        }
                    }

                    if (existingBytes > 0) {
                        conn.setRequestProperty("Range", "bytes=" + existingBytes + "-");
                    }

                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(35000);
                    conn.connect();
                    activeConnections.put(taskId, conn);

                    int status = conn.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                        status == HttpURLConnection.HTTP_MOVED_PERM ||
                        status == 307 || status == 308) {
                        String loc = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (loc != null && !loc.isEmpty()) {
                            currentUrl = loc;
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                int statusCode = conn.getResponseCode();
                if (statusCode < 200 || statusCode >= 300) {
                    throw new Exception("HTTP error " + statusCode + " dari server unduhan");
                }

                String contentType = conn.getContentType();
                if (isGofile && contentType != null && contentType.toLowerCase().contains("text/html")) {
                    throw new Exception("Autentikasi gagal: server GoFile mengembalikan respons HTML. Pastikan token akun valid.");
                }

                long downloadedBytes = 0;
                long totalBytes = 0;
                boolean isResuming = false;

                if (statusCode == 206 && existingBytes > 0) {
                    // Resuming existing stage file via HTTP Range
                    isResuming = true;
                    downloadedBytes = existingBytes;
                    long serverLen = conn.getContentLengthLong();
                    totalBytes = (serverLen > 0) ? (existingBytes + serverLen) : (expectedSize > 0 ? expectedSize : 0);
                    out = new FileOutputStream(stageFile, true);
                } else {
                    // Fresh download from 0
                    isResuming = false;
                    downloadedBytes = 0;
                    totalBytes = conn.getContentLengthLong() > 0 ? conn.getContentLengthLong() : (expectedSize > 0 ? expectedSize : 0);
                    if (stageFile.exists()) {
                        stageFile.delete();
                    }
                    out = new FileOutputStream(stageFile, false);
                }

                in = conn.getInputStream();
                byte[] buffer = new byte[262144]; // 256 KB buffer
                int bytesRead;
                long startTime = System.currentTimeMillis();
                long lastNotifyTime = 0;
                boolean isPaused = false;
                boolean isCancelled = false;

                while ((bytesRead = in.read(buffer)) != -1) {
                    if (Boolean.TRUE.equals(pauseFlags.get(taskId))) {
                        isPaused = true;
                        break;
                    }
                    if (Boolean.TRUE.equals(cancelFlags.get(taskId))) {
                        isCancelled = true;
                        break;
                    }

                    out.write(buffer, 0, bytesRead);
                    downloadedBytes += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastNotifyTime > 200) {
                        double elapsedSec = Math.max(0.1, (now - startTime) / 1000.0);
                        long sessionBytes = downloadedBytes - (isResuming ? existingBytes : 0);
                        double speed = sessionBytes / elapsedSec;
                        double pct = (totalBytes > 0) ? ((double) downloadedBytes / totalBytes) * 100.0 : 0.0;

                        JSObject prog = new JSObject();
                        prog.put("id", taskId);
                        prog.put("filename", resolvedFilename);
                        prog.put("status", "downloading");
                        prog.put("progress", Math.min(100.0, Math.round(pct * 10.0) / 10.0));
                        prog.put("downloaded", downloadedBytes);
                        prog.put("total", totalBytes > 0 ? totalBytes : downloadedBytes);
                        prog.put("speed", speed);

                        notifyListeners("downloadProgress", prog);
                        DownloadService.update(ctx, resolvedFilename, (int) Math.round(pct), formatSpeed(speed));
                        lastNotifyTime = now;
                    }
                }

                try { if (out != null) { out.flush(); out.close(); out = null; } } catch (Exception ignored) {}
                try { if (in != null) { in.close(); in = null; } } catch (Exception ignored) {}

                if (isPaused) {
                    double pct = (totalBytes > 0) ? ((double) downloadedBytes / totalBytes) * 100.0 : 0.0;
                    JSObject pauseData = new JSObject();
                    pauseData.put("id", taskId);
                    pauseData.put("filename", resolvedFilename);
                    pauseData.put("status", "paused");
                    pauseData.put("progress", Math.min(100.0, Math.round(pct * 10.0) / 10.0));
                    pauseData.put("downloaded", downloadedBytes);
                    pauseData.put("total", totalBytes > 0 ? totalBytes : downloadedBytes);
                    pauseData.put("speed", 0);
                    notifyListeners("downloadProgress", pauseData);

                    JSObject callRes = new JSObject();
                    callRes.put("success", false);
                    callRes.put("paused", true);
                    callRes.put("id", taskId);
                    callRes.put("filename", resolvedFilename);
                    callRes.put("downloaded", downloadedBytes);
                    callRes.put("total", totalBytes > 0 ? totalBytes : downloadedBytes);
                    call.resolve(callRes);
                    return;
                }

                if (isCancelled) {
                    if (stageFile.exists()) stageFile.delete();
                    JSObject cancelData = new JSObject();
                    cancelData.put("id", taskId);
                    cancelData.put("filename", resolvedFilename);
                    cancelData.put("status", "cancelled");
                    cancelData.put("progress", 0);
                    cancelData.put("downloaded", 0);
                    cancelData.put("total", totalBytes > 0 ? totalBytes : 0);
                    cancelData.put("speed", 0);
                    notifyListeners("downloadProgress", cancelData);

                    JSObject callRes = new JSObject();
                    callRes.put("success", false);
                    callRes.put("cancelled", true);
                    callRes.put("id", taskId);
                    call.resolve(callRes);
                    return;
                }

                if (downloadedBytes == 0) {
                    throw new Exception("File kosong (0 bytes diterima dari server)");
                }
                if (totalBytes > 0 && downloadedBytes < totalBytes) {
                    throw new Exception("Unduhan tidak lengkap (hanya terunduh " + downloadedBytes + " dari " + totalBytes + " bytes)");
                }

                // Commit stage file into destination MediaStore or Download directory
                Uri targetUri = commitStageFile(ctx, stageFile, resolvedFilename, relDir, effectiveMime);
                if (stageFile.exists()) {
                    stageFile.delete();
                }

                try {
                    if (targetUri != null) {
                        ctx.sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, targetUri));
                    }
                } catch (Exception ignored) {}

                JSObject finishData = new JSObject();
                finishData.put("id", taskId);
                finishData.put("filename", resolvedFilename);
                finishData.put("uri", targetUri != null ? targetUri.toString() : "");
                finishData.put("status", "completed");
                finishData.put("progress", 100);
                finishData.put("downloaded", downloadedBytes);
                finishData.put("total", totalBytes > 0 ? totalBytes : downloadedBytes);
                finishData.put("speed", 0);

                notifyListeners("downloadProgress", finishData);

                JSObject callRes = new JSObject();
                callRes.put("success", true);
                callRes.put("id", taskId);
                callRes.put("filename", resolvedFilename);
                callRes.put("uri", targetUri != null ? targetUri.toString() : "");
                callRes.put("total", downloadedBytes);

                call.resolve(callRes);

            } catch (Exception e) {
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                try { if (in != null) in.close(); } catch (Exception ignored) {}

                // NOTE: We do NOT delete stageFile on error so the user can resume without restarting!
                JSObject failData = new JSObject();
                failData.put("id", taskId);
                failData.put("filename", filename);
                failData.put("status", "failed");
                failData.put("message", e.getMessage());
                notifyListeners("downloadProgress", failData);

                call.reject("Gagal mengunduh: " + e.getMessage());
            } finally {
                DownloadService.stop(getContext());
                cancelFlags.remove(taskId);
                pauseFlags.remove(taskId);
                activeConnections.remove(taskId);
                if (activeConnections.isEmpty()) {
                    DownloadService.forceStop(getContext());
                }
                try {
                    if (in != null) in.close();
                } catch (Exception ignored) {}
                if (conn != null) conn.disconnect();
            }
        });
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        String uriStr = call.getString("uri");
        String filename = call.getString("filename");
        String reqMime = call.getString("mimetype");

        Uri fileUri = null;
        if (uriStr != null && !uriStr.trim().isEmpty()) {
            fileUri = Uri.parse(uriStr);
        }

        if (fileUri == null && filename != null) {
            fileUri = findFileUriByName(filename);
        }

        if (fileUri == null) {
            call.reject("File tidak ditemukan di memori perangkat: " + (filename != null ? filename : ""));
            return;
        }

        final String mimeType = (reqMime == null || reqMime.isEmpty() || reqMime.equals("application/octet-stream"))
                ? getMimeType(filename != null ? filename : fileUri.getLastPathSegment())
                : reqMime;

        if (fileUri != null && "file".equalsIgnoreCase(fileUri.getScheme())) {
            try {
                File f = new File(fileUri.getPath());
                fileUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            } catch (Exception ignored) {}
        }

        final Uri finalUri = fileUri;

        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(finalUri, mimeType);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                Intent chooser = Intent.createChooser(intent, "Buka " + (filename != null ? filename : "file") + " dengan");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(chooser);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Gagal membuka file: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void openFolder(PluginCall call) {
        mainHandler.post(() -> {
            Context ctx = getContext();
            try {
                Intent intent = new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Membuka folder Unduhan");
                call.resolve(ret);
            } catch (Exception e) {
                try {
                    Intent fileIntent = new Intent(Intent.ACTION_VIEW);
                    Uri uri = Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload");
                    fileIntent.setDataAndType(uri, "vnd.android.document/directory");
                    fileIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(fileIntent);

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception ex) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("message", "File tersimpan di Penyimpanan Internal/Download/GoFile");
                    call.resolve(ret);
                }
            }
        });
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String urlStr = call.getString("url");
        if (urlStr == null || urlStr.trim().isEmpty()) {
            call.reject("URL wajib diisi");
            return;
        }
        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(urlStr.trim()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Gagal membuka URL: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void pauseDownload(PluginCall call) {
        String id = call.getString("id");
        if (id != null) {
            pauseFlags.put(id, true);
            HttpURLConnection c = activeConnections.remove(id);
            if (c != null) {
                try { c.disconnect(); } catch (Exception ignored) {}
            }
        }
        if (activeConnections.isEmpty()) {
            DownloadService.stop(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("id", id);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String id = call.getString("id");
        if (id != null) {
            cancelFlags.put(id, true);
            HttpURLConnection c = activeConnections.remove(id);
            if (c != null) {
                try { c.disconnect(); } catch (Exception ignored) {}
            }
            try {
                File sf = getStageFile(getContext(), id);
                if (sf.exists()) sf.delete();
            } catch (Exception ignored) {}
        }
        if (activeConnections.isEmpty()) {
            DownloadService.forceStop(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void stopAll(PluginCall call) {
        for (String id : activeConnections.keySet()) {
            pauseFlags.put(id, true);
        }
        for (HttpURLConnection c : activeConnections.values()) {
            try { c.disconnect(); } catch (Exception ignored) {}
        }
        activeConnections.clear();
        DownloadService.forceStop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String uriStr = call.getString("uri");
        String filename = call.getString("filename");
        String relDir = call.getString("relDir", "");

        boolean deleted = false;
        Context ctx = getContext();
        ContentResolver resolver = ctx.getContentResolver();

        // 1. Delete standard file from GoFile directory if exists with Path Traversal Protection
        try {
            File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File goFileBase = new File(downloadDir, "GoFile").getCanonicalFile();
            String safeFilename = new File(filename != null ? filename : "").getName();
            String safeRel = (relDir != null ? relDir.replace("..", "").replace("\\", "/") : "").trim();
            File candidate = new File(goFileBase, (safeRel.isEmpty() ? "" : safeRel + "/") + safeFilename).getCanonicalFile();

            if (candidate.getPath().startsWith(goFileBase.getPath()) && candidate.exists() && candidate.isFile()) {
                deleted = candidate.delete() || deleted;
            }
        } catch (Exception ignored) {}

        // 2. Delete via URI if provided
        if (uriStr != null && !uriStr.trim().isEmpty()) {
            try {
                Uri u = Uri.parse(uriStr);
                int count = resolver.delete(u, null, null);
                if (count > 0) deleted = true;
            } catch (Exception ignored) {}
        }

        // 3. Delete from MediaStore if Android 10+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && filename != null) {
            try {
                String selection = MediaStore.Downloads.DISPLAY_NAME + " = ?";
                String[] args = new String[]{filename};
                int count = resolver.delete(MediaStore.Downloads.EXTERNAL_CONTENT_URI, selection, args);
                if (count > 0) deleted = true;
            } catch (Exception ignored) {}
        }

        JSObject ret = new JSObject();
        ret.put("success", deleted);
        call.resolve(ret);
    }

    @PluginMethod
    public void readClipboard(PluginCall call) {
        mainHandler.post(() -> {
            try {
                ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                String text = "";
                if (clipboard != null && clipboard.hasPrimaryClip() && clipboard.getPrimaryClip().getItemCount() > 0) {
                    CharSequence cs = clipboard.getPrimaryClip().getItemAt(0).getText();
                    if (cs != null) {
                        text = cs.toString();
                    }
                }
                JSObject ret = new JSObject();
                ret.put("text", text);
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("text", "");
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void getMediaStreamUrl(PluginCall call) {
        String path = call.getString("path", "");
        String uriStr = call.getString("uri", "");
        String filename = call.getString("filename", "");

        if (streamingServer == null) {
            streamingServer = new MediaStreamingServer(getContext());
            streamingServer.start();
        }

        if ((path == null || path.isEmpty()) && filename != null && !filename.isEmpty()) {
            FileCandidateInfo info = queryFileInfo(filename, "");
            if (info.exists) {
                if (info.file != null) {
                    path = info.file.getAbsolutePath();
                } else if (info.uri != null) {
                    uriStr = info.uri.toString();
                }
            }
        }

        String streamUrl = streamingServer.getStreamUrl(path, uriStr);
        JSObject ret = new JSObject();
        ret.put("url", streamUrl);
        call.resolve(ret);
    }

    @PluginMethod
    public void setVideoPlaybackState(PluginCall call) {
        Boolean playingObj = call.getBoolean("playing");
        if (playingObj == null) {
            playingObj = call.getBoolean("isPlaying", false);
        }
        boolean playing = playingObj != null && playingObj;
        int width = call.getInt("width", 16);
        int height = call.getInt("height", 9);
        MainActivity.setVideoPlaybackState(playing, width, height);
        call.resolve();
    }

    @PluginMethod
    public void enterPip(PluginCall call) {
        if (getActivity() != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            mainHandler.post(() -> {
                try {
                    int width = call.getInt("width", 16);
                    int height = call.getInt("height", 9);
                    MainActivity.setVideoPlaybackState(true, width, height);
                    boolean success = false;
                    if (getActivity() instanceof MainActivity) {
                        MainActivity act = (MainActivity) getActivity();
                        success = act.enterPictureInPictureMode(act.buildPipParams());
                    } else {
                        getActivity().enterPictureInPictureMode();
                        success = true;
                    }
                    JSObject ret = new JSObject();
                    ret.put("success", success);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Gagal masuk mode PiP: " + e.getMessage());
                }
            });
        } else {
            call.reject("Picture-in-Picture membutuhkan Android 8.0+");
        }
    }



    private boolean downloadSimultaneousSegments(
            String fileUrl, boolean isGofile, String token, long totalBytes,
            String taskId, String resolvedFilename, File stageFile, Context ctx
    ) {
        if (totalBytes <= 0) return false;

        // Dynamic worker count: 4 parallel connections for >= 10MB, 6 for >= 100MB
        int workers = (totalBytes >= 100L * 1024 * 1024) ? 6 : 4;
        final int NUM_WORKERS = workers;
        final long segmentSize = (totalBytes + NUM_WORKERS - 1) / NUM_WORKERS;

        try (RandomAccessFile rafInit = new RandomAccessFile(stageFile, "rw")) {
            rafInit.setLength(totalBytes);
        } catch (Exception e) {
            return false;
        }

        final CountDownLatch latch = new CountDownLatch(NUM_WORKERS);
        final AtomicBoolean failed = new AtomicBoolean(false);
        final AtomicLong totalDownloaded = new AtomicLong(0);
        final long startTime = System.currentTimeMillis();
        final AtomicLong lastNotifyTime = new AtomicLong(0);

        for (int i = 0; i < NUM_WORKERS; i++) {
            final long segStart = i * segmentSize;
            final long segEnd = Math.min((i + 1) * segmentSize - 1, totalBytes - 1);

            executor.submit(() -> {
                long segWritten = 0;
                long expectedSegBytes = (segEnd - segStart + 1);
                int retryCount = 0;

                try {
                    if (segStart > segEnd) return;

                    while (segWritten < expectedSegBytes && retryCount < 3 && !failed.get() && !Boolean.TRUE.equals(cancelFlags.get(taskId))) {
                        HttpURLConnection segConn = null;
                        InputStream segIn = null;
                        RandomAccessFile segRaf = null;

                        try {
                            long currentStart = segStart + segWritten;
                            URL u = new URL(fileUrl);
                            segConn = (HttpURLConnection) u.openConnection();
                            segConn.setInstanceFollowRedirects(false);
                            segConn.setRequestProperty("User-Agent", APP_USER_AGENT);
                            segConn.setRequestProperty("Accept", "*/*");
                            segConn.setRequestProperty("Range", "bytes=" + currentStart + "-" + segEnd);

                            if (isGofile) {
                                segConn.setRequestProperty("Referer", "https://gofile.io/");
                                segConn.setRequestProperty("Origin", "https://gofile.io");
                                if (token != null && !token.trim().isEmpty()) {
                                    segConn.setRequestProperty("Cookie", "accountToken=" + token);
                                }
                            }

                            segConn.setConnectTimeout(20000);
                            segConn.setReadTimeout(30000);
                            segConn.connect();

                            int code = segConn.getResponseCode();
                            // Strict requirement: must return 206 Partial Content
                            if (code != 206) {
                                retryCount++;
                                Thread.sleep(500);
                                continue;
                            }

                            segIn = segConn.getInputStream();
                            segRaf = new RandomAccessFile(stageFile, "rw");
                            segRaf.seek(currentStart);

                            byte[] segBuf = new byte[262144];
                            int r;

                            while ((r = segIn.read(segBuf)) != -1) {
                                if (Boolean.TRUE.equals(cancelFlags.get(taskId)) || failed.get()) {
                                    failed.set(true);
                                    return;
                                }

                                if (segWritten + r > expectedSegBytes) {
                                    r = (int) (expectedSegBytes - segWritten);
                                }
                                if (r <= 0) break;

                                segRaf.write(segBuf, 0, r);
                                segWritten += r;
                                long currentGlobal = totalDownloaded.addAndGet(r);

                                long now = System.currentTimeMillis();
                                if (now - lastNotifyTime.get() > 200) {
                                    lastNotifyTime.set(now);
                                    double elapsedSec = Math.max(0.1, (now - startTime) / 1000.0);
                                    double speed = currentGlobal / elapsedSec;
                                    double pct = Math.min(100.0, ((double) currentGlobal / totalBytes) * 100.0);

                                    JSObject prog = new JSObject();
                                    prog.put("id", taskId);
                                    prog.put("filename", resolvedFilename);
                                    prog.put("status", "downloading");
                                    prog.put("progress", Math.round(pct * 10.0) / 10.0);
                                    prog.put("downloaded", currentGlobal);
                                    prog.put("total", totalBytes);
                                    prog.put("speed", speed);

                                    notifyListeners("downloadProgress", prog);
                                    DownloadService.update(ctx, resolvedFilename, (int) Math.round(pct), formatSpeed(speed));
                                }

                                if (segWritten >= expectedSegBytes) break;
                            }
                        } catch (Exception ex) {
                            retryCount++;
                            try { Thread.sleep(500); } catch (Exception ignored) {}
                        } finally {
                            try { if (segRaf != null) segRaf.close(); } catch (Exception ignored) {}
                            try { if (segIn != null) segIn.close(); } catch (Exception ignored) {}
                            if (segConn != null) segConn.disconnect();
                        }
                    }

                    if (segWritten < expectedSegBytes) {
                        failed.set(true);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        try {
            latch.await();
        } catch (InterruptedException e) {
            return false;
        }

        return !failed.get() && totalDownloaded.get() >= totalBytes;
    }

    private boolean isStoragePermissionGranted() {
        Context ctx = getContext();
        if (ctx == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return ctx.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean isBatteryOptimizationIgnored() {
        Context ctx = getContext();
        if (ctx == null) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        return true;
    }

    @PluginMethod
    public void checkStoragePermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isStoragePermissionGranted());
        ret.put("isAndroid11Plus", Build.VERSION.SDK_INT >= Build.VERSION_CODES.R);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestStoragePermissions(PluginCall call) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent intent;
                try {
                    intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                } catch (Exception e) {
                    intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            } else if (getActivity() != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    getActivity().requestPermissions(new String[]{
                            Manifest.permission.READ_MEDIA_IMAGES,
                            Manifest.permission.READ_MEDIA_VIDEO,
                            Manifest.permission.READ_MEDIA_AUDIO,
                            Manifest.permission.POST_NOTIFICATIONS
                    }, 105);
                } else {
                    getActivity().requestPermissions(new String[]{
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.WRITE_EXTERNAL_STORAGE
                    }, 105);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membuka pengaturan izin penyimpanan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ignoring", isBatteryOptimizationIgnored());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent;
                try {
                    intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                } catch (Exception e) {
                    intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal membuka pengaturan optimasi baterai: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listDownloadedFiles(PluginCall call) {
        executor.execute(() -> {
            JSArray arr = new JSArray();
            java.util.HashSet<String> seenKeys = new java.util.HashSet<>();
            Context ctx = getContext();
            ContentResolver resolver = ctx.getContentResolver();

            // 1. Direct Physical File directories scan (recovers files across uninstalls and updates)
            try {
                java.util.List<File> candidateDirs = new java.util.ArrayList<>();
                File primaryDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "GoFile");
                candidateDirs.add(primaryDir);
                candidateDirs.add(new File("/storage/emulated/0/Download/GoFile"));
                candidateDirs.add(new File(Environment.getExternalStorageDirectory(), "Download/GoFile"));
                File extFiles = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (extFiles != null) {
                    candidateDirs.add(new File(extFiles, "GoFile"));
                }

                for (File gofileDir : candidateDirs) {
                    if (gofileDir != null && gofileDir.exists() && gofileDir.isDirectory()) {
                        scanFilesRecursive(gofileDir, gofileDir, arr, seenKeys);
                    }
                }
            } catch (Exception ignored) {}

            // 2. Query MediaStore tables (Downloads, Files, Video, Audio, Images)
            try {
                java.util.List<Uri> tables = new java.util.ArrayList<>();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tables.add(MediaStore.Downloads.EXTERNAL_CONTENT_URI);
                }
                try {
                    tables.add(MediaStore.Files.getContentUri("external"));
                } catch (Exception ignored) {}
                tables.add(MediaStore.Video.Media.EXTERNAL_CONTENT_URI);
                tables.add(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI);
                tables.add(MediaStore.Images.Media.EXTERNAL_CONTENT_URI);

                for (Uri table : tables) {
                    try {
                        String[] projection = new String[]{
                                MediaStore.MediaColumns._ID,
                                MediaStore.MediaColumns.DISPLAY_NAME,
                                MediaStore.MediaColumns.SIZE,
                                MediaStore.MediaColumns.DATE_MODIFIED,
                                MediaStore.MediaColumns.MIME_TYPE,
                                MediaStore.MediaColumns.DATA
                        };

                        String selection = MediaStore.MediaColumns.SIZE + " > 0";
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            selection += " AND (" + MediaStore.MediaColumns.RELATIVE_PATH + " LIKE '%GoFile%' OR " + MediaStore.MediaColumns.DATA + " LIKE '%GoFile%')";
                        } else {
                            selection += " AND " + MediaStore.MediaColumns.DATA + " LIKE '%GoFile%'";
                        }

                        try (Cursor cursor = resolver.query(table, projection, selection, null, MediaStore.MediaColumns.DATE_MODIFIED + " DESC")) {
                            if (cursor != null) {
                                int idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID);
                                int nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
                                int sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE);
                                int modCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
                                int mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
                                int relCol = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ? cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH) : -1;
                                int dataCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATA);

                                while (cursor.moveToNext()) {
                                    String name = (nameCol != -1) ? cursor.getString(nameCol) : null;
                                    String dataPath = (dataCol != -1) ? cursor.getString(dataCol) : null;
                                    if (name == null && dataPath != null) {
                                        name = new File(dataPath).getName();
                                    }
                                    if (name == null || name.endsWith(".part") || name.startsWith(".")) continue;

                                    long id = (idCol != -1) ? cursor.getLong(idCol) : 0;
                                    long size = (sizeCol != -1) ? cursor.getLong(sizeCol) : 0;
                                    long mod = (modCol != -1) ? cursor.getLong(modCol) * 1000L : System.currentTimeMillis();
                                    String mime = (mimeCol != -1) ? cursor.getString(mimeCol) : null;
                                    String relPath = (relCol != -1) ? cursor.getString(relCol) : null;

                                    String relDir = "";
                                    if (relPath != null && !relPath.isEmpty()) {
                                        String cleanRel = relPath.replace('\\', '/').trim();
                                        if (cleanRel.startsWith("Download/GoFile")) {
                                            cleanRel = cleanRel.substring("Download/GoFile".length());
                                        } else if (cleanRel.startsWith("GoFile")) {
                                            cleanRel = cleanRel.substring("GoFile".length());
                                        }
                                        while (cleanRel.startsWith("/")) cleanRel = cleanRel.substring(1);
                                        while (cleanRel.endsWith("/")) cleanRel = cleanRel.substring(0, cleanRel.length() - 1);
                                        relDir = cleanRel;
                                    } else if (dataPath != null && dataPath.contains("/GoFile/")) {
                                        String after = dataPath.substring(dataPath.indexOf("/GoFile/") + "/GoFile/".length());
                                        if (after.contains("/")) {
                                            relDir = after.substring(0, after.lastIndexOf("/"));
                                        }
                                    }

                                    String dedupeKey = (relDir.isEmpty() ? "" : relDir + "/") + name;
                                    if (seenKeys.contains(dedupeKey)) continue;
                                    seenKeys.add(dedupeKey);

                                    Uri fileUri = ContentUris.withAppendedId(table, id);
                                    JSObject item = new JSObject();
                                    item.put("name", name);
                                    item.put("size", size);
                                    item.put("modified", mod);
                                    item.put("relDir", relDir);
                                    item.put("uri", fileUri.toString());
                                    item.put("mimetype", (mime != null && !mime.isEmpty()) ? mime : getMimeType(name));
                                    arr.put(item);
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("files", arr);
            ret.put("needsStoragePermission", !isStoragePermissionGranted());
            ret.put("isAndroid11Plus", Build.VERSION.SDK_INT >= Build.VERSION_CODES.R);
            ret.put("ignoringBatteryOptimizations", isBatteryOptimizationIgnored());
            call.resolve(ret);
        });
    }

    private void scanFilesRecursive(File rootDir, File currentDir, JSArray out, java.util.HashSet<String> seenKeys) {
        File[] files = currentDir.listFiles();
        if (files == null) return;
        Context ctx = getContext();
        for (File f : files) {
            if (f.isDirectory()) {
                scanFilesRecursive(rootDir, f, out, seenKeys);
            } else if (f.isFile() && !f.getName().endsWith(".part") && !f.getName().startsWith(".")) {
                try {
                    String rel = "";
                    if (!rootDir.equals(currentDir)) {
                        rel = rootDir.toURI().relativize(f.getParentFile().toURI()).getPath();
                        if (rel.endsWith("/")) rel = rel.substring(0, rel.length() - 1);
                    }
                    String dedupeKey = (rel.isEmpty() ? "" : rel + "/") + f.getName();
                    if (seenKeys.contains(dedupeKey)) continue;
                    seenKeys.add(dedupeKey);

                    JSObject item = new JSObject();
                    item.put("name", f.getName());
                    item.put("size", f.length());
                    item.put("modified", f.lastModified());
                    item.put("relDir", rel);
                    Uri uri = null;
                    try {
                        uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
                    } catch (Exception ignored) {}
                    item.put("uri", uri != null ? uri.toString() : "");
                    item.put("mimetype", getMimeType(f.getName()));
                    out.put(item);

                    // Scan file with Android MediaScanner to index into system
                    try {
                        MediaScannerConnection.scanFile(ctx, new String[]{f.getAbsolutePath()}, null, null);
                    } catch (Exception ignored) {}
                } catch (Exception ignored) {}
            }
        }
    }

    private String sha256(String input) {
        if (input == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String generateWebsiteToken(String userAgent, String accountToken) {
        return generateWebsiteToken(userAgent, accountToken, 0);
    }

    private String generateWebsiteToken(String userAgent, String accountToken, long windowOffset) {
        long timeSlot = ((System.currentTimeMillis() / 1000L) / 14400L) + windowOffset;
        String ua = (userAgent != null && !userAgent.isEmpty()) ? userAgent : APP_USER_AGENT;
        String raw = ua + "::en-US::" + (accountToken != null ? accountToken : "") + "::" + timeSlot + "::12af056dacea0b";
        return sha256(raw);
    }

    private String loadTokenFromPrefs() {
        try {
            Context ctx = getContext();
            if (ctx != null) {
                android.content.SharedPreferences sp = ctx.getSharedPreferences("gofile_prefs", Context.MODE_PRIVATE);
                return sp.getString("account_token", "");
            }
        } catch (Exception ignored) {}
        return "";
    }

    private void saveTokenToPrefs(String token) {
        if (token == null || token.trim().isEmpty()) return;
        try {
            Context ctx = getContext();
            if (ctx != null) {
                android.content.SharedPreferences sp = ctx.getSharedPreferences("gofile_prefs", Context.MODE_PRIVATE);
                sp.edit().putString("account_token", token.trim()).apply();
            }
        } catch (Exception ignored) {}
    }

    private String ensureAccountToken(String existingToken) {
        if (existingToken != null && !existingToken.trim().isEmpty()) {
            cachedAccountToken = existingToken.trim();
            saveTokenToPrefs(cachedAccountToken);
            return cachedAccountToken;
        }
        if (!cachedAccountToken.isEmpty()) {
            return cachedAccountToken;
        }
        String prefToken = loadTokenFromPrefs();
        if (!prefToken.isEmpty()) {
            cachedAccountToken = prefToken;
            return cachedAccountToken;
        }
        long[] offsets = new long[]{0, -1, 1};
        for (long offset : offsets) {
            try {
                String wt = generateWebsiteToken(APP_USER_AGENT, "", offset);
                URL url = new URL("https://api.gofile.io/accounts");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setRequestProperty("User-Agent", APP_USER_AGENT);
                conn.setRequestProperty("X-Website-Token", wt);
                conn.setRequestProperty("X-BL", "en-US");
                conn.setRequestProperty("Accept", "*/*");
                conn.setRequestProperty("Origin", "https://gofile.io");
                conn.setRequestProperty("Referer", "https://gofile.io/");
                conn.setFixedLengthStreamingMode(0);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                // Write empty output stream to properly send POST request on Android OkHttp stack
                try (OutputStream os = conn.getOutputStream()) {
                    os.flush();
                }

                int code = conn.getResponseCode();
                if (code == 200) {
                    try (InputStream is = conn.getInputStream();
                         BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) sb.append(line);
                        JSONObject obj = new JSONObject(sb.toString());
                        if ("ok".equals(obj.optString("status"))) {
                            JSONObject data = obj.optJSONObject("data");
                            if (data != null && data.has("token")) {
                                cachedAccountToken = data.getString("token");
                                saveTokenToPrefs(cachedAccountToken);
                                return cachedAccountToken;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return "";
    }

    private JSONObject getContentFromWebFallback(String cid) {
        try {
            URL url = new URL("https://gofile.io/d/" + cid);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("User-Agent", APP_USER_AGENT);
            conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            conn.setRequestProperty("Referer", "https://gofile.io/");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int code = conn.getResponseCode();
            if (code == 200) {
                StringBuilder sb = new StringBuilder();
                try (InputStream is = conn.getInputStream();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line).append("\n");
                }
                String html = sb.toString();
                String[] regexes = new String[]{
                    "contentData\\s*=\\s*(\\{.*?\\});",
                    "var\\s+content\\s*=\\s*(\\{.*?\\});",
                    "window\\.contentData\\s*=\\s*(\\{.*?\\});",
                    "const\\s+contentData\\s*=\\s*(\\{.*?\\});"
                };
                for (String regex : regexes) {
                    java.util.regex.Pattern p = java.util.regex.Pattern.compile(regex, java.util.regex.Pattern.DOTALL);
                    java.util.regex.Matcher m = p.matcher(html);
                    if (m.find()) {
                        try {
                            JSONObject parsed = new JSONObject(m.group(1));
                            JSONObject wrap = new JSONObject();
                            wrap.put("status", "ok");
                            wrap.put("data", parsed);
                            return wrap;
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void traverseFolder(String parentDir, String cid, String token, String hashedPassword,
                                JSArray filesArr, long[] totalSizeHolder) throws Exception {
        String activeToken = (token != null && !token.trim().isEmpty()) ? token.trim() : ensureAccountToken("");
        String urlStr = "https://api.gofile.io/contents/" + cid + "?contentFilter=&page=1&pageSize=1000&sortField=createTime&sortDirection=-1";
        if (hashedPassword != null && !hashedPassword.isEmpty()) {
            urlStr += "&password=" + hashedPassword;
        }

        long[] offsets = new long[]{0, -1, 1};
        JSONObject obj = null;
        String lastError = "";

        for (long offset : offsets) {
            String wt = generateWebsiteToken(APP_USER_AGENT, activeToken, offset);
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", APP_USER_AGENT);
            if (activeToken != null && !activeToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + activeToken);
                conn.setRequestProperty("Cookie", "accountToken=" + activeToken);
            }
            conn.setRequestProperty("X-Website-Token", wt);
            conn.setRequestProperty("X-BL", "en-US");
            conn.setRequestProperty("Accept", "*/*");
            conn.setRequestProperty("Origin", "https://gofile.io");
            conn.setRequestProperty("Referer", "https://gofile.io/");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            int code = conn.getResponseCode();
            if (code == 200) {
                StringBuilder sb = new StringBuilder();
                try (InputStream is = conn.getInputStream();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                }
                JSONObject parsed = new JSONObject(sb.toString());
                String status = parsed.optString("status");
                if ("ok".equals(status)) {
                    obj = parsed;
                    break;
                } else if ("error-notPremium".equals(status)) {
                    lastError = status;
                    continue;
                } else {
                    throw new Exception(status);
                }
            } else if (code == 401) {
                // If 401 received, token was invalid or expired. Refresh token and retry.
                activeToken = ensureAccountToken("");
                lastError = "HTTP 401";
            } else if (code == 429) {
                lastError = "HTTP 429 (Rate Limit)";
                break;
            } else {
                lastError = "HTTP " + code;
            }
        }

        // Web fallback if API was blocked or 401
        if (obj == null) {
            obj = getContentFromWebFallback(cid);
        }

        if (obj == null) {
            throw new Exception(lastError.isEmpty() ? "Gagal menghubungi GoFile" : lastError);
        }

        JSONObject data = obj.optJSONObject("data");
        if (data == null) return;

        if (data.has("password") && !"passwordOk".equals(data.optString("passwordStatus"))) {
            throw new Exception("PASSWORD_REQUIRED");
        }

        String type = data.optString("type");
        if (!"folder".equals(type)) {
            JSObject fileObj = new JSObject();
            fileObj.put("id", data.optString("id", cid));
            fileObj.put("name", data.optString("name", "file_" + cid));
            fileObj.put("relDir", parentDir);
            long sz = data.optLong("size", 0L);
            fileObj.put("size", sz);
            fileObj.put("link", data.optString("link", ""));
            fileObj.put("mimetype", data.optString("mimetype", getMimeType(data.optString("name", ""))));
            fileObj.put("md5", data.optString("md5", ""));
            totalSizeHolder[0] += sz;
            filesArr.put(fileObj);
            return;
        }

        String folderName = data.optString("name", cid);
        String currentDir = (parentDir == null || parentDir.isEmpty()) ? folderName : parentDir + "/" + folderName;

        JSONObject children = data.optJSONObject("children");
        if (children != null) {
            java.util.Iterator<String> keys = children.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                JSONObject child = children.optJSONObject(key);
                if (child == null) continue;

                if ("folder".equals(child.optString("type"))) {
                    traverseFolder(currentDir, child.optString("id"), token, hashedPassword, filesArr, totalSizeHolder);
                } else {
                    JSObject fileObj = new JSObject();
                    fileObj.put("id", child.optString("id"));
                    fileObj.put("name", child.optString("name"));
                    fileObj.put("relDir", currentDir);
                    long sz = child.optLong("size", 0L);
                    fileObj.put("size", sz);
                    fileObj.put("link", child.optString("link", ""));
                    fileObj.put("mimetype", child.optString("mimetype", getMimeType(child.optString("name", ""))));
                    fileObj.put("md5", child.optString("md5", ""));
                    totalSizeHolder[0] += sz;
                    filesArr.put(fileObj);
                }
            }
        }
    }

    @PluginMethod
    public void inspectContent(PluginCall call) {
        String urlOrId = call.getString("url");
        String password = call.getString("password", "");
        String token = call.getString("token", "");

        if (urlOrId == null || urlOrId.trim().isEmpty()) {
            call.reject("URL atau ID wajib diisi");
            return;
        }

        executor.execute(() -> {
            try {
                String clean = urlOrId.trim().split("#")[0].split("\\?")[0].replaceAll("/+$", "");
                String[] parts = clean.split("/");
                String cid = parts[parts.length - 1];

                String hashedPw = (password != null && !password.isEmpty()) ? sha256(password) : "";
                String effectiveToken = ensureAccountToken(token);
                cachedAccountToken = effectiveToken;

                JSArray filesArr = new JSArray();
                long[] totalSizeHolder = new long[]{0L};

                traverseFolder("", cid, effectiveToken, hashedPw, filesArr, totalSizeHolder);

                JSObject ret = new JSObject();
                ret.put("contentId", cid);
                ret.put("totalFiles", filesArr.length());
                ret.put("totalSize", totalSizeHolder[0]);
                ret.put("files", filesArr);
                ret.put("token", effectiveToken);

                call.resolve(ret);
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "Gagal memeriksa folder";
                if (msg.contains("429") || msg.contains("error-rateLimit") || msg.contains("Rate Limit")) {
                    msg = "IP Anda dibatasi sementara oleh GoFile (HTTP 429 Rate Limit).\n\nSolusi instan:\n• Di HP: Aktifkan Mode Pesawat (Airplane Mode) selama 3 detik lalu matikan lagi untuk mendapatkan IP baru dari operator seluler.\n• Di PC/Wi-Fi: Sambungkan atau ubah server VPN/1.1.1.1 WARP.";
                } else if (e instanceof java.net.SocketTimeoutException || msg.toLowerCase().contains("timeout") || msg.toLowerCase().contains("timed out")) {
                    msg = "Koneksi ke server GoFile timeout. Di Indonesia, GoFile sering diblokir provider internet (IndiHome/Telkomsel). Silakan aktifkan VPN atau 1.1.1.1 (WARP).";
                }
                call.reject(msg);
            }
        });
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            ret.put("canInstall", canInstall);
        } else {
            ret.put("canInstall", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Gagal membuka pengaturan perizinan instalasi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        String uriStr = call.getString("uri");

        Context ctx = getContext();
        File tempApkFile = null;

        try {
            // 1. If physical file exists at filePath, use it
            if (filePath != null && !filePath.isEmpty()) {
                File file = new File(filePath);
                if (file.exists() && file.isFile() && file.length() > 0) {
                    tempApkFile = file;
                }
            }

            // 2. If content uri provided (e.g. MediaStore URI or FileProvider URI)
            if (tempApkFile == null && uriStr != null && !uriStr.isEmpty()) {
                Uri parsedUri = Uri.parse(uriStr);
                if ("content".equalsIgnoreCase(parsedUri.getScheme())) {
                    // Copy to app's cache directory so FileProvider can grant permission directly to system package installer
                    File cacheDir = ctx.getExternalCacheDir() != null ? ctx.getExternalCacheDir() : ctx.getCacheDir();
                    File copiedApk = new File(cacheDir, "update_installer.apk");
                    try (InputStream inStream = ctx.getContentResolver().openInputStream(parsedUri);
                         FileOutputStream outStream = new FileOutputStream(copiedApk)) {
                        if (inStream != null) {
                            byte[] buffer = new byte[65536];
                            int read;
                            while ((read = inStream.read(buffer)) != -1) {
                                outStream.write(buffer, 0, read);
                            }
                            outStream.flush();
                            if (copiedApk.length() > 0) {
                                tempApkFile = copiedApk;
                            }
                        }
                    } catch (Exception ignored) {}
                } else if ("file".equalsIgnoreCase(parsedUri.getScheme())) {
                    File file = new File(parsedUri.getPath());
                    if (file.exists() && file.isFile() && file.length() > 0) {
                        tempApkFile = file;
                    }
                }
            }

            // 3. Fallback: check Download/GoFile/GoFile-Pro.apk or Download/GoFile-Pro.apk
            if (tempApkFile == null) {
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File candidate = new File(downloadDir, "GoFile/GoFile-Pro.apk");
                if (!candidate.exists() || !candidate.isFile()) {
                    candidate = new File(downloadDir, "GoFile-Pro.apk");
                }
                if (candidate.exists() && candidate.isFile() && candidate.length() > 0) {
                    tempApkFile = candidate;
                }
            }

            if (tempApkFile == null || !tempApkFile.exists() || tempApkFile.length() == 0) {
                call.reject("Berkas APK pembaruan tidak ditemukan");
                return;
            }

            Uri contentUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", tempApkFile);

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(installIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal memulai pemasang aplikasi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startWifiShareServer(PluginCall call) {
        int port = call.getInt("port", 8080);
        if (wifiShareServer == null) {
            wifiShareServer = new WifiShareServer(getContext());
        }
        boolean ok = wifiShareServer.start(port);
        JSObject ret = new JSObject();
        ret.put("success", ok);
        ret.put("isRunning", wifiShareServer.isRunning());
        ret.put("port", wifiShareServer.getPort());
        ret.put("ip", wifiShareServer.getHostIp());
        ret.put("url", wifiShareServer.getShareUrl());
        call.resolve(ret);
    }

    @PluginMethod
    public void stopWifiShareServer(PluginCall call) {
        if (wifiShareServer != null) {
            wifiShareServer.stop();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("isRunning", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWifiShareStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean running = wifiShareServer != null && wifiShareServer.isRunning();
        ret.put("isRunning", running);
        String ip = wifiShareServer != null ? wifiShareServer.refreshIp() : WifiShareServer.resolveLocalIp(getContext());
        int port = wifiShareServer != null ? wifiShareServer.getPort() : 8080;
        ret.put("port", port);
        ret.put("ip", ip);
        ret.put("url", "http://" + ip + ":" + port);
        boolean isLocal = !ip.equals("127.0.0.1") && !ip.startsWith("127.");
        ret.put("isLocalNetwork", isLocal);
        call.resolve(ret);
    }

    @PluginMethod
    public void refreshWifiShareIp(PluginCall call) {
        if (wifiShareServer != null) {
            wifiShareServer.refreshIp();
        }
        getWifiShareStatus(call);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (wifiShareServer != null) {
            wifiShareServer.stop();
        }
        if (streamingServer != null) {
            streamingServer.stop();
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        if (getActivity() != null) {
            mainHandler.post(() -> getActivity().finishAffinity());
        }
        call.resolve();
    }
}

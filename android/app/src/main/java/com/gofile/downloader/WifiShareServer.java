package com.gofile.downloader;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.format.Formatter;
import android.webkit.MimeTypeMap;
import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Embedded Lightweight Wi-Fi File Sharing HTTP Server (Pure Java, zero third-party deps).
 * Enables lightning-fast wireless file transfer and browser streaming from Android to PC/Mac/iOS/Android.
 */
public class WifiShareServer {
    private final Context context;
    private ServerSocket serverSocket;
    private ExecutorService threadPool;
    private int port = 8080;
    private volatile boolean isRunning = false;
    private String activeHostIp = "";

    public static class ShareItem {
        public String name;
        public long size;
        public long modified;
        public String relDir;
        public String mimeType;
        public File localFile;
        public String streamPath;
    }

    public WifiShareServer(Context context) {
        this.context = context.getApplicationContext();
    }

    public synchronized boolean start(int preferredPort) {
        if (isRunning) return true;
        this.port = preferredPort > 0 ? preferredPort : 8080;

        for (int attempt = 0; attempt < 10; attempt++) {
            try {
                serverSocket = new ServerSocket(this.port, 50, InetAddress.getByName("0.0.0.0"));
                break;
            } catch (Exception e) {
                this.port++;
            }
        }

        if (serverSocket == null || !serverSocket.isBound()) {
            return false;
        }

        activeHostIp = resolveLocalIp(context);
        threadPool = Executors.newCachedThreadPool();
        isRunning = true;
        threadPool.submit(this::listenLoop);
        return true;
    }

    public synchronized void stop() {
        isRunning = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}
        if (threadPool != null) {
            threadPool.shutdownNow();
        }
    }

    public boolean isRunning() {
        return isRunning;
    }

    public int getPort() {
        return port;
    }

    public String getHostIp() {
        if (activeHostIp == null || activeHostIp.isEmpty() || activeHostIp.equals("127.0.0.1")) {
            activeHostIp = resolveLocalIp(context);
        }
        return activeHostIp;
    }

    public String getShareUrl() {
        return "http://" + getHostIp() + ":" + port;
    }

    public static String resolveLocalIp(Context ctx) {
        try {
            WifiManager wm = (WifiManager) ctx.getSystemService(Context.WIFI_SERVICE);
            if (wm != null && wm.isWifiEnabled()) {
                int ipInt = wm.getConnectionInfo().getIpAddress();
                if (ipInt != 0) {
                    return Formatter.formatIpAddress(ipInt);
                }
            }
        } catch (Exception ignored) {}

        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                if (intf.isLoopback() || !intf.isUp()) continue;
                String name = intf.getName().toLowerCase();
                // Prioritize wlan, ap, or eth interfaces
                if (!name.contains("wlan") && !name.contains("ap") && !name.contains("eth") && !name.contains("rndis")) {
                    continue;
                }
                for (InetAddress addr : Collections.list(intf.getInetAddresses())) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        String ip = addr.getHostAddress();
                        if (ip != null && !ip.startsWith("127.")) {
                            return ip;
                        }
                    }
                }
            }

            // Fallback: any non-loopback IPv4
            for (NetworkInterface intf : interfaces) {
                if (intf.isLoopback() || !intf.isUp()) continue;
                for (InetAddress addr : Collections.list(intf.getInetAddresses())) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        String ip = addr.getHostAddress();
                        if (ip != null && !ip.startsWith("127.")) {
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        return "127.0.0.1";
    }

    private void listenLoop() {
        while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket clientSocket = serverSocket.accept();
                clientSocket.setSoTimeout(30000);
                threadPool.submit(() -> handleClient(clientSocket));
            } catch (Exception e) {
                if (!isRunning) break;
            }
        }
    }

    private void handleClient(Socket socket) {
        try (InputStream in = socket.getInputStream();
             OutputStream out = socket.getOutputStream()) {

            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String uri = parts[1];

            Map<String, String> headers = new HashMap<>();
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    headers.put(line.substring(0, colon).trim().toLowerCase(Locale.ROOT), line.substring(colon + 1).trim());
                }
            }

            if (!method.equalsIgnoreCase("GET") && !method.equalsIgnoreCase("HEAD")) {
                sendResponse(out, "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n".getBytes());
                return;
            }

            String path = uri;
            String query = "";
            int qIdx = uri.indexOf('?');
            if (qIdx >= 0) {
                path = uri.substring(0, qIdx);
                query = uri.substring(qIdx + 1);
            }

            Map<String, String> queryParams = parseQueryParams(query);

            if (path.equals("/") || path.equals("/index.html")) {
                serveIndexPage(out);
            } else if (path.equals("/api/files")) {
                serveApiFiles(out);
            } else if (path.equals("/file") || path.equals("/download") || path.equals("/stream")) {
                boolean isAttachment = path.equals("/download") || "1".equals(queryParams.get("dl"));
                serveFileStream(out, queryParams.get("f"), headers.get("range"), isAttachment, method.equalsIgnoreCase("HEAD"));
            } else {
                sendResponse(out, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n".getBytes());
            }
        } catch (Exception ignored) {
        } finally {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    private Map<String, String> parseQueryParams(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            try {
                if (idx > 0) {
                    map.put(URLDecoder.decode(pair.substring(0, idx), "UTF-8"), URLDecoder.decode(pair.substring(idx + 1), "UTF-8"));
                } else if (!pair.isEmpty()) {
                    map.put(URLDecoder.decode(pair, "UTF-8"), "");
                }
            } catch (Exception ignored) {}
        }
        return map;
    }

    private List<ShareItem> scanSharedFiles() {
        List<ShareItem> list = new ArrayList<>();
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File gofileDir = new File(downloadDir, "GoFile");
        if (gofileDir.exists() && gofileDir.isDirectory()) {
            scanDirectoryRecursive(gofileDir, gofileDir, list);
        }
        // Also scan direct downloads folder if GoFile folder is empty
        if (list.isEmpty() && downloadDir.exists() && downloadDir.isDirectory()) {
            File[] files = downloadDir.listFiles();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile() && !f.getName().startsWith(".")) {
                        ShareItem it = new ShareItem();
                        it.name = f.getName();
                        it.size = f.length();
                        it.modified = f.lastModified();
                        it.relDir = "";
                        it.mimeType = getMimeType(f.getName());
                        it.localFile = f;
                        it.streamPath = f.getName();
                        list.add(it);
                    }
                }
            }
        }
        return list;
    }

    private void scanDirectoryRecursive(File baseDir, File currentDir, List<ShareItem> list) {
        File[] files = currentDir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) {
                scanDirectoryRecursive(baseDir, f, list);
            } else if (f.isFile() && !f.getName().startsWith(".")) {
                ShareItem it = new ShareItem();
                it.name = f.getName();
                it.size = f.length();
                it.modified = f.lastModified();
                String rel = "";
                if (!currentDir.equals(baseDir)) {
                    rel = currentDir.getAbsolutePath().substring(baseDir.getAbsolutePath().length());
                    if (rel.startsWith(File.separator)) rel = rel.substring(1);
                }
                it.relDir = rel.replace('\\', '/');
                it.mimeType = getMimeType(f.getName());
                it.localFile = f;
                it.streamPath = it.relDir.isEmpty() ? f.getName() : it.relDir + "/" + f.getName();
                list.add(it);
            }
        }
    }

    private void serveIndexPage(OutputStream out) throws IOException {
        List<ShareItem> files = scanSharedFiles();
        long totalSize = 0;
        for (ShareItem it : files) totalSize += it.size;

        StringBuilder rows = new StringBuilder();
        SimpleDateFormat sdf = new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault());

        for (ShareItem it : files) {
            String encPath = "";
            try { encPath = URLEncoder.encode(it.streamPath, "UTF-8"); } catch (Exception ignored) {}
            String sizeStr = formatBytes(it.size);
            String dateStr = sdf.format(new Date(it.modified));
            String isPlayable = (it.mimeType.startsWith("video/") || it.mimeType.startsWith("audio/")) ? "true" : "false";
            String isImage = it.mimeType.startsWith("image/") ? "true" : "false";

            String iconSvg;
            if (it.mimeType.startsWith("video/")) {
                iconSvg = "<svg class=\"f-icon\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"2.18\" ry=\"2.18\" fill=\"none\" stroke=\"#818cf8\" stroke-width=\"2\"/><polygon points=\"10 8 16 12 10 16 10 8\" fill=\"#818cf8\"/></svg>";
            } else if (it.mimeType.startsWith("audio/")) {
                iconSvg = "<svg class=\"f-icon\" viewBox=\"0 0 24 24\"><path d=\"M9 18V5l12-2v13\" fill=\"none\" stroke=\"#a78bfa\" stroke-width=\"2\"/><circle cx=\"6\" cy=\"18\" r=\"3\" fill=\"#a78bfa\"/><circle cx=\"18\" cy=\"16\" r=\"3\" fill=\"#a78bfa\"/></svg>";
            } else if (it.mimeType.startsWith("image/")) {
                iconSvg = "<svg class=\"f-icon\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" fill=\"none\" stroke=\"#38bdf8\" stroke-width=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\" fill=\"#38bdf8\"/><polyline points=\"21 15 16 10 5 21\" fill=\"none\" stroke=\"#38bdf8\" stroke-width=\"2\"/></svg>";
            } else {
                iconSvg = "<svg class=\"f-icon\" viewBox=\"0 0 24 24\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2\"/><polyline points=\"14 2 14 8 20 8\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2\"/></svg>";
            }

            rows.append("<div class=\"file-card\" data-name=\"").append(escapeHtml(it.name.toLowerCase())).append("\">")
                .append("<div class=\"file-header\">")
                .append(iconSvg)
                .append("<div class=\"file-info\">")
                .append("<div class=\"file-title\" title=\"").append(escapeHtml(it.name)).append("\">").append(escapeHtml(it.name)).append("</div>")
                .append("<div class=\"file-meta\">").append(sizeStr).append(" • ").append(dateStr);
            if (!it.relDir.isEmpty()) {
                rows.append(" • <span class=\"folder-tag\">/").append(escapeHtml(it.relDir)).append("</span>");
            }
            rows.append("</div></div></div>")
                .append("<div class=\"file-actions\">")
                .append("<a href=\"/download?f=").append(encPath).append("&dl=1\" class=\"btn btn-primary\" download>Unduh</a>");

            if ("true".equals(isPlayable)) {
                rows.append("<a href=\"/stream?f=").append(encPath).append("\" target=\"_blank\" class=\"btn btn-secondary\">Putar</a>");
            } else if ("true".equals(isImage)) {
                rows.append("<a href=\"/file?f=").append(encPath).append("\" target=\"_blank\" class=\"btn btn-secondary\">Lihat</a>");
            }

            rows.append("</div></div>");
        }

        String html = "<!DOCTYPE html><html lang=\"id\"><head><meta charset=\"UTF-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>GoFile Pro - Berbagi Berkas Wi-Fi</title>"
            + "<style>"
            + ":root{--bg:#0b0f19;--card:rgba(18,24,38,0.85);--border:rgba(255,255,255,0.08);--text:#f8fafc;--muted:#94a3b8;--primary:#6366f1;--primary-hover:#4f46e5;}"
            + "* {box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;}"
            + "body{background:var(--bg);color:var(--text);padding:1.5rem 1rem;min-height:100vh;}"
            + ".container{max-width:860px;margin:0 auto;}"
            + ".header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);}"
            + ".brand{display:flex;align-items:center;gap:0.75rem;}"
            + ".logo-badge{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:1.2rem;box-shadow:0 4px 14px rgba(99,102,241,0.4);}"
            + ".stats{display:flex;gap:1rem;font-size:0.85rem;color:var(--muted);}"
            + ".stat-pill{background:rgba(255,255,255,0.05);padding:0.35rem 0.75rem;border-radius:8px;border:1px solid var(--border);}"
            + ".search-bar{width:100%;margin-bottom:1.2rem;}"
            + ".search-input{width:100%;padding:0.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:10px;color:#fff;font-size:0.95rem;outline:none;}"
            + ".search-input:focus{border-color:var(--primary);box-shadow:0 0 0 2px rgba(99,102,241,0.25);}"
            + ".file-list{display:flex;flex-direction:column;gap:0.75rem;}"
            + ".file-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:0.85rem 1.1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;backdrop-filter:blur(10px);transition:transform 0.15s,border-color 0.15s;}"
            + ".file-card:hover{border-color:rgba(99,102,241,0.4);transform:translateY(-1px);}"
            + ".file-header{display:flex;align-items:center;gap:0.85rem;min-width:0;flex:1;}"
            + ".f-icon{width:28px;height:28px;flex-shrink:0;}"
            + ".file-info{min-width:0;flex:1;}"
            + ".file-title{font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}"
            + ".file-meta{font-size:0.75rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
            + ".folder-tag{color:#818cf8;}"
            + ".file-actions{display:flex;gap:0.5rem;flex-shrink:0;}"
            + ".btn{text-decoration:none;font-size:0.8rem;font-weight:600;padding:0.45rem 0.85rem;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s;}"
            + ".btn-primary{background:var(--primary);color:#fff;}"
            + ".btn-primary:hover{background:var(--primary-hover);}"
            + ".btn-secondary{background:rgba(255,255,255,0.08);color:var(--text);border:1px solid var(--border);}"
            + ".btn-secondary:hover{background:rgba(255,255,255,0.14);}"
            + "@media(max-width:640px){.file-card{flex-direction:column;align-items:flex-start;}.file-actions{width:100%;justify-content:flex-end;margin-top:0.4rem;}}"
            + "</style></head><body>"
            + "<div class=\"container\">"
            + "<div class=\"header\"><div class=\"brand\"><div class=\"logo-badge\">G</div><div><h2>GoFile Pro Share</h2><div style=\"font-size:0.8rem;color:var(--muted);\">Server Berbagi Berkas Wi-Fi Lokal</div></div></div>"
            + "<div class=\"stats\"><div class=\"stat-pill\">" + files.size() + " Berkas</div><div class=\"stat-pill\">" + formatBytes(totalSize) + "</div></div></div>"
            + "<div class=\"search-bar\"><input type=\"text\" class=\"search-input\" id=\"filter\" placeholder=\"Cari berkas...\" oninput=\"filterFiles()\"></div>"
            + "<div class=\"file-list\" id=\"fileList\">" + rows.toString() + "</div>"
            + "</div>"
            + "<script>function filterFiles(){const q=document.getElementById('filter').value.toLowerCase();document.querySelectorAll('.file-card').forEach(el=>{el.style.display=el.getAttribute('data-name').includes(q)?'flex':'none';});}</script>"
            + "</body></html>";

        byte[] body = html.getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 200 OK\r\n"
            + "Content-Type: text/html; charset=UTF-8\r\n"
            + "Content-Length: " + body.length + "\r\n"
            + "Connection: close\r\n\r\n";
        sendResponse(out, header.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }

    private void serveApiFiles(OutputStream out) throws IOException {
        List<ShareItem> files = scanSharedFiles();
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < files.size(); i++) {
            ShareItem it = files.get(i);
            if (i > 0) json.append(",");
            json.append("{")
                .append("\"name\":").append(quoteJson(it.name)).append(",")
                .append("\"size\":").append(it.size).append(",")
                .append("\"modified\":").append(it.modified).append(",")
                .append("\"relDir\":").append(quoteJson(it.relDir)).append(",")
                .append("\"mimeType\":").append(quoteJson(it.mimeType)).append(",")
                .append("\"streamPath\":").append(quoteJson(it.streamPath))
                .append("}");
        }
        json.append("]");
        byte[] body = json.toString().getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 200 OK\r\n"
            + "Content-Type: application/json; charset=UTF-8\r\n"
            + "Content-Length: " + body.length + "\r\n"
            + "Access-Control-Allow-Origin: *\r\n"
            + "Connection: close\r\n\r\n";
        sendResponse(out, header.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }

    private void serveFileStream(OutputStream out, String targetRel, String rangeHeader, boolean isAttachment, boolean headOnly) throws IOException {
        if (targetRel == null || targetRel.isEmpty()) {
            sendResponse(out, "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n".getBytes());
            return;
        }

        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File gofileDir = new File(downloadDir, "GoFile");
        File target = new File(gofileDir, targetRel);

        // Security check: ensure path is within gofileDir or downloadDir
        String canonicalTarget = target.getCanonicalPath();
        String canonicalBase = gofileDir.getCanonicalPath();
        String canonicalDownloads = downloadDir.getCanonicalPath();
        if (!canonicalTarget.startsWith(canonicalBase) && !canonicalTarget.startsWith(canonicalDownloads)) {
            sendResponse(out, "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n".getBytes());
            return;
        }

        if (!target.exists() || !target.isFile()) {
            // Check direct downloads folder fallback
            File alt = new File(downloadDir, targetRel);
            if (alt.exists() && alt.isFile()) {
                target = alt;
            } else {
                sendResponse(out, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n".getBytes());
                return;
            }
        }

        long fileLength = target.length();
        long start = 0;
        long end = fileLength - 1;
        boolean isPartial = false;

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String r = rangeHeader.substring(6).trim();
            int dash = r.indexOf('-');
            if (dash >= 0) {
                String sStart = r.substring(0, dash).trim();
                String sEnd = r.substring(dash + 1).trim();
                try {
                    if (!sStart.isEmpty()) {
                        start = Long.parseLong(sStart);
                    }
                    if (!sEnd.isEmpty()) {
                        end = Long.parseLong(sEnd);
                    }
                    if (start <= end && start < fileLength) {
                        end = Math.min(end, fileLength - 1);
                        isPartial = true;
                    }
                } catch (Exception ignored) {}
            }
        }

        long contentLength = end - start + 1;
        String mime = getMimeType(target.getName());

        StringBuilder resHeader = new StringBuilder();
        if (isPartial) {
            resHeader.append("HTTP/1.1 206 Partial Content\r\n");
            resHeader.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(fileLength).append("\r\n");
        } else {
            resHeader.append("HTTP/1.1 200 OK\r\n");
        }

        resHeader.append("Content-Type: ").append(mime).append("\r\n");
        resHeader.append("Content-Length: ").append(contentLength).append("\r\n");
        resHeader.append("Accept-Ranges: bytes\r\n");
        resHeader.append("Access-Control-Allow-Origin: *\r\n");

        if (isAttachment) {
            String safeName = target.getName().replace("\"", "");
            resHeader.append("Content-Disposition: attachment; filename=\"").append(safeName).append("\"\r\n");
        }

        resHeader.append("Connection: keep-alive\r\n\r\n");
        sendResponse(out, resHeader.toString().getBytes(StandardCharsets.UTF_8));

        if (headOnly) return;

        try (FileInputStream fis = new FileInputStream(target)) {
            if (start > 0) {
                long skipped = fis.skip(start);
                while (skipped < start) {
                    long more = fis.skip(start - skipped);
                    if (more <= 0) break;
                    skipped += more;
                }
            }

            byte[] buffer = new byte[65536];
            long remaining = contentLength;
            while (remaining > 0) {
                int toRead = (int) Math.min(buffer.length, remaining);
                int bytesRead = fis.read(buffer, 0, toRead);
                if (bytesRead <= 0) break;
                out.write(buffer, 0, bytesRead);
                remaining -= bytesRead;
            }
            out.flush();
        }
    }

    private void sendResponse(OutputStream out, byte[] data) throws IOException {
        out.write(data);
        out.flush();
    }

    public static String getMimeType(String filename) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(filename);
        if (ext == null || ext.isEmpty()) {
            int lastDot = filename.lastIndexOf('.');
            if (lastDot >= 0 && lastDot < filename.length() - 1) {
                ext = filename.substring(lastDot + 1);
            }
        }
        if (ext != null) {
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.ROOT));
            if (mime != null) return mime;
        }
        return "application/octet-stream";
    }

    public static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int i = (int) (Math.log(bytes) / Math.log(1024));
        if (i >= units.length) i = units.length - 1;
        double val = bytes / Math.pow(1024, i);
        return String.format(Locale.US, "%.1f %s", val, units[i]);
    }

    private static String quoteJson(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + "\"";
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}

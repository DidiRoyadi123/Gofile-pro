package com.gofile.downloader;

import android.content.ContentResolver;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.webkit.MimeTypeMap;
import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MediaStreamingServer {
    private final Context context;
    private ServerSocket serverSocket;
    private ExecutorService threadPool;
    private int port = 0;
    private volatile boolean isRunning = false;

    public MediaStreamingServer(Context context) {
        this.context = context.getApplicationContext();
    }

    public synchronized void start() {
        if (isRunning) return;
        try {
            // Bind to loopback interface on auto-assigned port for high security
            serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
            port = serverSocket.getLocalPort();
            threadPool = Executors.newCachedThreadPool();
            isRunning = true;

            threadPool.submit(this::listenLoop);
        } catch (Exception e) {
            e.printStackTrace();
        }
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

    public int getPort() {
        return port;
    }

    public String getStreamUrl(String path, String uriStr) {
        if (!isRunning || port == 0) {
            start();
        }
        try {
            String pEnc = path != null ? java.net.URLEncoder.encode(path, "UTF-8") : "";
            String uEnc = uriStr != null ? java.net.URLEncoder.encode(uriStr, "UTF-8") : "";
            return "http://127.0.0.1:" + port + "/stream?p=" + pEnc + "&u=" + uEnc;
        } catch (Exception e) {
            return "";
        }
    }

    private void listenLoop() {
        while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
            try {
                Socket clientSocket = serverSocket.accept();
                threadPool.submit(() -> handleClient(clientSocket));
            } catch (Exception e) {
                if (!isRunning) break;
            }
        }
    }

    private void handleClient(Socket socket) {
        try (InputStream in = socket.getInputStream();
             OutputStream out = socket.getOutputStream()) {

            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String fullPath = parts[1];

            // Read HTTP headers
            Map<String, String> headers = new HashMap<>();
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    headers.put(line.substring(0, colon).trim().toLowerCase(), line.substring(colon + 1).trim());
                }
            }

            // Parse Query parameters (?p=...&u=...)
            int qIdx = fullPath.indexOf('?');
            String query = (qIdx >= 0 && qIdx < fullPath.length() - 1) ? fullPath.substring(qIdx + 1) : "";
            Map<String, String> params = new HashMap<>();
            for (String pair : query.split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0) {
                    params.put(URLDecoder.decode(pair.substring(0, eq), "UTF-8"),
                               URLDecoder.decode(pair.substring(eq + 1), "UTF-8"));
                }
            }

            String filePath = params.get("p");
            String uriStr = params.get("u");

            // Resolve File Source and Size
            File file = (filePath != null && !filePath.isEmpty()) ? new File(filePath) : null;
            long fileLength = 0;
            String mimeType = "application/octet-stream";
            Uri contentUri = (uriStr != null && !uriStr.isEmpty()) ? Uri.parse(uriStr) : null;

            ContentResolver resolver = context.getContentResolver();

            if (file != null && file.exists() && file.isFile()) {
                fileLength = file.length();
                String ext = MimeTypeMap.getFileExtensionFromUrl(file.getName());
                if (ext != null && !ext.isEmpty()) {
                    String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase());
                    if (m != null) mimeType = m;
                }
                if (mimeType.equals("application/octet-stream")) {
                    mimeType = guessMimeType(file.getName());
                }
            } else if (contentUri != null) {
                try (AssetFileDescriptor afd = resolver.openAssetFileDescriptor(contentUri, "r")) {
                    if (afd != null) {
                        fileLength = afd.getLength();
                    }
                } catch (Exception ignored) {}
                String cm = resolver.getType(contentUri);
                if (cm != null) mimeType = cm;
            }

            if (fileLength <= 0 && file != null && file.exists()) {
                fileLength = file.length();
            }

            if (fileLength <= 0) {
                String notFound = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
                out.write(notFound.getBytes());
                out.flush();
                return;
            }

            // Handle HTTP Range Request (bytes=start-end)
            String rangeHeader = headers.get("range");
            long start = 0;
            long end = fileLength - 1;

            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                String[] rParts = rangeHeader.substring(6).split("-");
                try {
                    if (!rParts[0].isEmpty()) {
                        start = Long.parseLong(rParts[0]);
                    }
                    if (rParts.length > 1 && !rParts[1].isEmpty()) {
                        end = Long.parseLong(rParts[1]);
                    }
                } catch (NumberFormatException ignored) {}
            }

            if (start > end || start >= fileLength) {
                String errRange = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */" + fileLength + "\r\n\r\n";
                out.write(errRange.getBytes());
                out.flush();
                return;
            }

            end = Math.min(end, fileLength - 1);
            long contentLength = (end - start) + 1;
            boolean isPartial = (rangeHeader != null);

            StringBuilder resHeader = new StringBuilder();
            resHeader.append(isPartial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
            resHeader.append("Content-Type: ").append(mimeType).append("\r\n");
            resHeader.append("Accept-Ranges: bytes\r\n");
            resHeader.append("Content-Length: ").append(contentLength).append("\r\n");
            if (isPartial) {
                resHeader.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(fileLength).append("\r\n");
            }
            resHeader.append("Access-Control-Allow-Origin: *\r\n");
            resHeader.append("Connection: close\r\n\r\n");

            out.write(resHeader.toString().getBytes("UTF-8"));

            if ("HEAD".equalsIgnoreCase(method)) {
                out.flush();
                return;
            }

            // Stream Bytes
            try (InputStream stream = openSeekableStream(file, contentUri, resolver, start)) {
                if (stream != null) {
                    byte[] buf = new byte[65536];
                    long remaining = contentLength;
                    while (remaining > 0) {
                        int toRead = (int) Math.min(buf.length, remaining);
                        int read = stream.read(buf, 0, toRead);
                        if (read <= 0) break;
                        out.write(buf, 0, read);
                        remaining -= read;
                    }
                }
            }
            out.flush();

        } catch (Exception ignored) {
        } finally {
            try {
                socket.close();
            } catch (Exception ignored) {}
        }
    }

    private InputStream openSeekableStream(File file, Uri uri, ContentResolver resolver, long start) throws IOException {
        if (file != null && file.exists()) {
            FileInputStream fis = new FileInputStream(file);
            if (start > 0) {
                long skipped = fis.skip(start);
                // Extra ensure
                while (skipped < start) {
                    long s = fis.skip(start - skipped);
                    if (s <= 0) break;
                    skipped += s;
                }
            }
            return new BufferedInputStream(fis);
        } else if (uri != null) {
            InputStream is = resolver.openInputStream(uri);
            if (is != null && start > 0) {
                is.skip(start);
            }
            return is != null ? new BufferedInputStream(is) : null;
        }
        return null;
    }

    private String guessMimeType(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".avi")) return "video/x-msvideo";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
}

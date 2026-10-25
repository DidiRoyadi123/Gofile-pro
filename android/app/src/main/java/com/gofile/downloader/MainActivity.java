package com.gofile.downloader;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.view.ViewTreeObserver;
import android.webkit.ValueCallback;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static MainActivity instance;
    private static boolean isVideoPlaying = false;
    private static int videoWidth = 16;
    private static int videoHeight = 9;

    public static void setVideoPlaybackState(boolean playing, int width, int height) {
        isVideoPlaying = playing;
        if (width > 0 && height > 0) {
            videoWidth = width;
            videoHeight = height;
        }
        if (instance != null) {
            instance.runOnUiThread(() -> instance.updatePipParams(playing));
        }
    }

    public static boolean isVideoPlaying() {
        return isVideoPlaying;
    }

    public void updatePipParams(boolean isPlaying) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                int w = videoWidth > 0 ? videoWidth : 16;
                int h = videoHeight > 0 ? videoHeight : 9;
                double ratio = (double) w / (double) h;
                if (ratio < 0.42) {
                    builder.setAspectRatio(new Rational(42, 100));
                } else if (ratio > 2.38) {
                    builder.setAspectRatio(new Rational(238, 100));
                } else {
                    builder.setAspectRatio(new Rational(w, h));
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Only allow OS to auto-enter PiP if video is actively playing!
                    builder.setAutoEnterEnabled(isPlaying);
                }
                setPictureInPictureParams(builder.build());
            } catch (Exception ignored) {}
        }
    }

    public PictureInPictureParams buildPipParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
            int w = videoWidth > 0 ? videoWidth : 16;
            int h = videoHeight > 0 ? videoHeight : 9;
            double ratio = (double) w / (double) h;
            if (ratio < 0.42) {
                builder.setAspectRatio(new Rational(42, 100));
            } else if (ratio > 2.38) {
                builder.setAspectRatio(new Rational(238, 100));
            } else {
                builder.setAspectRatio(new Rational(w, h));
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(isVideoPlaying);
            }
            return builder.build();
        }
        return null;
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // NEVER enter PiP mode if video is not actively playing!
        if (!isVideoPlaying) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams params = buildPipParams();
                if (params != null) {
                    enterPictureInPictureMode(params);
                } else {
                    enterPictureInPictureMode();
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "window.onPipModeChanged && window.onPipModeChanged(" + isInPictureInPictureMode + ");",
                    null
                );
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        updatePipParams(isVideoPlaying);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            if (!isInPictureInPictureMode() && isVideoPlaying) {
                setVideoPlaybackState(false, videoWidth, videoHeight);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        instance = this;
        registerPlugin(AndroidDownloaderPlugin.class);
        super.onCreate(savedInstanceState);
        updatePipParams(false);

        // Prevent Android OS crash if Chromium WebView renderer terminates
        if (getBridge() != null) {
            getBridge().addWebViewListener(new com.getcapacitor.WebViewListener() {
                @Override
                public boolean onRenderProcessGone(android.webkit.WebView webView, android.webkit.RenderProcessGoneDetail detail) {
                    android.util.Log.e("GoFilePro", "WebView render process exited: " + detail);
                    return true;
                }
            });
        }

        // Hardware Back Button Controller
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { return !!(window.handleHardwareBack && window.handleHardwareBack()); })()",
                        new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                if (!"true".equalsIgnoreCase(value)) {
                                    setEnabled(false);
                                    getOnBackPressedDispatcher().onBackPressed();
                                    setEnabled(true);
                                }
                            }
                        }
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });

        // Virtual Keyboard Visibility Detection (Window Insets + Layout Observer)
        final View decorView = getWindow().getDecorView();
        final View contentView = decorView.findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
                boolean isImeVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
                notifyKeyboardState(isImeVisible);
                return ViewCompat.onApplyWindowInsets(v, insets);
            });

            contentView.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
                private boolean lastVisible = false;
                @Override
                public void onGlobalLayout() {
                    Rect r = new Rect();
                    contentView.getWindowVisibleDisplayFrame(r);
                    int screenHeight = contentView.getRootView().getHeight();
                    int keypadHeight = screenHeight - r.bottom;
                    boolean isVisible = keypadHeight > screenHeight * 0.15;
                    if (isVisible != lastVisible) {
                        lastVisible = isVisible;
                        notifyKeyboardState(isVisible);
                    }
                }
            });
        }
    }

    private void notifyKeyboardState(boolean isOpen) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "window.onNativeKeyboardVisible && window.onNativeKeyboardVisible(" + isOpen + ");",
                    null
                );
            });
        }
    }
}

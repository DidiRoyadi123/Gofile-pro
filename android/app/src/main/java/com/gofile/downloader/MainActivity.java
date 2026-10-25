package com.gofile.downloader;

import android.graphics.Rect;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.webkit.ValueCallback;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidDownloaderPlugin.class);
        super.onCreate(savedInstanceState);

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

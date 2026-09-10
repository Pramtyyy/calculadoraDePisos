package br.com.calculadordepisos;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.util.TypedValue;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(0xFFFFFFFF);
        window.setNavigationBarColor(0xFFFFFFFF);
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.setFitsSystemWindows(true);
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            int extraTopSpace = (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                24,
                view.getResources().getDisplayMetrics()
            );
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                android.graphics.Insets systemBars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(systemBars.left, systemBars.top + extraTopSpace, systemBars.right, systemBars.bottom);
            } else {
                view.setPadding(
                    insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop() + extraTopSpace,
                    insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom()
                );
            }
            return insets;
        });
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

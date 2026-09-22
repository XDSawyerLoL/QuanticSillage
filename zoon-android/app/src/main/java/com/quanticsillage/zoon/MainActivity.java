package com.quanticsillage.zoon;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private static final String ZOON_URL =
            "https://xdsawyerlol.github.io/QuanticSillage/zoon.html?android=1.1.2";
    private static final int FILE_CHOOSER_REQUEST = 4001;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(6, 24, 39));
        getWindow().setNavigationBarColor(Color.rgb(6, 24, 39));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(6, 24, 39));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 24, 39));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleLarge);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(72, 72);
        progressParams.gravity = android.view.Gravity.CENTER;
        root.addView(progressBar, progressParams);

        setContentView(root);
        configureWebView();

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadZoon();
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ZOONAndroid/1.1.2");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }

                fileChooserCallback = callback;

                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileChooserCallback = null;
                    Toast.makeText(
                            MainActivity.this,
                            "Aucune application ne peut ouvrir ce fichier.",
                            Toast.LENGTH_SHORT
                    ).show();
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return routeUri(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeUri(Uri.parse(url));
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    showOfflinePage();
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (ActivityNotFoundException error) {
                Toast.makeText(this, "Téléchargement indisponible.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private boolean routeUri(Uri uri) {
        if ("zoon".equalsIgnoreCase(uri.getScheme()) && "open".equalsIgnoreCase(uri.getHost())) {
            loadZoon();
            return true;
        }

        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
            }
            return true;
        }

        String host = uri.getHost();
        if (host != null && host.equalsIgnoreCase("xdsawyerlol.github.io")) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
        }
        return true;
    }

    private void loadZoon() {
        webView.loadUrl(ZOON_URL);
    }

    private void showOfflinePage() {
        progressBar.setVisibility(View.GONE);

        String html =
                "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<style>body{margin:0;background:#061827;color:#fff;font-family:system-ui;display:grid;" +
                "place-items:center;min-height:100vh;text-align:center}.c{max-width:360px;padding:32px}" +
                ".name{font-size:32px;font-weight:800;letter-spacing:.08em;color:#ffd447}" +
                "p{color:#b8c7d4;line-height:1.55}a{display:inline-block;margin-top:16px;padding:13px 20px;" +
                "border-radius:999px;background:#ffd447;color:#061827;text-decoration:none;font-weight:800}</style></head>" +
                "<body><div class='c'><div class='name'>ZOON</div>" +
                "<p>Impossible de joindre ZOON. Vérifie ta connexion puis réessaie.</p>" +
                "<a href='zoon://open'>Réessayer</a></div></body></html>";

        webView.loadDataWithBaseURL(
                "https://zoon.local/",
                html,
                "text/html",
                "UTF-8",
                null
        );
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && fileChooserCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}

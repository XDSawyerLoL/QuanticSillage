package com.quanticsillage.zoon;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String ZOON_URL =
            "https://xdsawyerlol.github.io/QuanticSillage/zoon.html?android=1.1.3";

    private static final int NAVY = Color.rgb(6, 24, 39);
    private static final int YELLOW = Color.rgb(255, 212, 71);

    private FrameLayout root;
    private WebView webView;
    private View loadingOverlay;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(NAVY);
        getWindow().setNavigationBarColor(NAVY);

        root = new FrameLayout(this);
        root.setBackgroundColor(NAVY);
        setContentView(root);

        startZoon();
    }

    private void startZoon() {
        showNativeLoading();

        try {
            WebView next = new WebView(this);
            next.setBackgroundColor(NAVY);
            next.setOverScrollMode(View.OVER_SCROLL_NEVER);

            WebSettings settings = next.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(true);
            settings.setSupportMultipleWindows(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setUserAgentString(
                    settings.getUserAgentString() + " ZOONAndroid/1.1.3"
            );

            next.clearCache(true);
            next.clearHistory();

            next.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    showLoadingOverlay();
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    hideLoadingOverlay();
                }

                @Override
                public boolean shouldOverrideUrlLoading(
                        WebView view,
                        WebResourceRequest request
                ) {
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
                        showFallback(
                                "Impossible de charger ZOON.",
                                "Vérifie ta connexion puis réessaie."
                        );
                    }
                }

                @Override
                public void onReceivedHttpError(
                        WebView view,
                        WebResourceRequest request,
                        WebResourceResponse response
                ) {
                    if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                        showFallback(
                                "ZOON est momentanément indisponible.",
                                "Le serveur a répondu avec le code " + response.getStatusCode() + "."
                        );
                    }
                }

                @Override
                public boolean onRenderProcessGone(
                        WebView view,
                        RenderProcessGoneDetail detail
                ) {
                    if (view == webView) {
                        try {
                            root.removeView(view);
                        } catch (Throwable ignored) {
                        }

                        try {
                            view.destroy();
                        } catch (Throwable ignored) {
                        }

                        webView = null;
                        showFallback(
                                "Le moteur d'affichage Android s'est arrêté.",
                                "ZOON est resté ouvert. Tu peux relancer l'affichage sans quitter l'application."
                        );
                    }
                    return true;
                }
            });

            webView = next;

            root.removeAllViews();
            root.addView(
                    next,
                    new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                    )
            );
            addLoadingOverlay();

            next.loadUrl(ZOON_URL);
        } catch (Throwable error) {
            webView = null;
            showFallback(
                    "ZOON n'a pas pu démarrer son moteur d'affichage.",
                    "L'application reste ouverte. Tu peux réessayer ou ouvrir ZOON dans ton navigateur."
            );
        }
    }

    private boolean routeUri(Uri uri) {
        String scheme = uri.getScheme();

        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            String host = uri.getHost();

            if (host != null && host.equalsIgnoreCase("xdsawyerlol.github.io")) {
                return false;
            }

            openExternal(uri);
            return true;
        }

        openExternal(uri);
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
        }
    }

    private void showNativeLoading() {
        root.removeAllViews();

        LinearLayout box = makeBaseBox();

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.zoon_mark);
        mark.setScaleType(ImageView.ScaleType.CENTER_CROP);
        box.addView(mark, sizeParams(160, 160));

        TextView title = makeText("ZOON", 30, YELLOW);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        titleParams.topMargin = dp(18);
        box.addView(title, titleParams);

        ProgressBar progress = new ProgressBar(this);
        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(dp(40), dp(40));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(22);
        box.addView(progress, progressParams);

        root.addView(
                box,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
    }

    private void addLoadingOverlay() {
        LinearLayout overlay = makeBaseBox();
        overlay.setBackgroundColor(NAVY);

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.zoon_mark);
        mark.setScaleType(ImageView.ScaleType.CENTER_CROP);
        overlay.addView(mark, sizeParams(136, 136));

        ProgressBar progress = new ProgressBar(this);
        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(dp(36), dp(36));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(18);
        overlay.addView(progress, progressParams);

        loadingOverlay = overlay;
        root.addView(
                overlay,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
    }

    private void showLoadingOverlay() {
        if (loadingOverlay != null) {
            loadingOverlay.setVisibility(View.VISIBLE);
        }
    }

    private void hideLoadingOverlay() {
        if (loadingOverlay != null) {
            loadingOverlay.setVisibility(View.GONE);
        }
    }

    private void showFallback(String titleText, String bodyText) {
        root.removeAllViews();

        LinearLayout box = makeBaseBox();
        box.setPadding(dp(32), dp(32), dp(32), dp(32));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.zoon_mark);
        mark.setScaleType(ImageView.ScaleType.CENTER_CROP);
        box.addView(mark, sizeParams(140, 140));

        TextView title = makeText(titleText, 22, Color.WHITE);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        titleParams.topMargin = dp(22);
        box.addView(title, titleParams);

        TextView body = makeText(bodyText, 15, Color.rgb(184, 199, 212));
        body.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams bodyParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        bodyParams.topMargin = dp(12);
        box.addView(body, bodyParams);

        Button retry = new Button(this);
        retry.setText("Réessayer");
        retry.setTextColor(NAVY);
        retry.setBackgroundColor(YELLOW);
        retry.setOnClickListener(v -> startZoon());
        LinearLayout.LayoutParams retryParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(52)
                );
        retryParams.topMargin = dp(26);
        box.addView(retry, retryParams);

        Button browser = new Button(this);
        browser.setText("Ouvrir dans le navigateur");
        browser.setTextColor(Color.WHITE);
        browser.setBackgroundColor(Color.rgb(13, 38, 56));
        browser.setOnClickListener(v -> openExternal(Uri.parse(ZOON_URL)));
        LinearLayout.LayoutParams browserParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(52)
                );
        browserParams.topMargin = dp(10);
        box.addView(browser, browserParams);

        root.addView(
                box,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
    }

    private LinearLayout makeBaseBox() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(NAVY);
        return box;
    }

    private TextView makeText(String text, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        return view;
    }

    private LinearLayout.LayoutParams sizeParams(int widthDp, int heightDp) {
        LinearLayout.LayoutParams params =
                new LinearLayout.LayoutParams(dp(widthDp), dp(heightDp));
        params.gravity = Gravity.CENTER_HORIZONTAL;
        return params;
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                webView.stopLoading();
                webView.setWebViewClient(null);
                webView.destroy();
            } catch (Throwable ignored) {
            }
            webView = null;
        }

        super.onDestroy();
    }
}

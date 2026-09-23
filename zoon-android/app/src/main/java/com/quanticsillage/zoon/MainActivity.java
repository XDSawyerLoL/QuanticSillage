package com.quanticsillage.zoon;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
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

import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String ZOON_URL =
            "https://" + LOCAL_HOST + "/assets/zoon.html?android=1.2.0";

    private static final int NAVY = Color.rgb(6, 24, 39);
    private static final int YELLOW = Color.rgb(255, 212, 71);

    private FrameLayout root;
    private WebView webView;
    private View loadingOverlay;
    private WebViewAssetLoader assetLoader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(NAVY);
        getWindow().setNavigationBarColor(NAVY);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        }

        root = new FrameLayout(this);
        root.setBackgroundColor(NAVY);
        applySystemInsets(root);
        setContentView(root);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler(
                        "/assets/",
                        new WebViewAssetLoader.AssetsPathHandler(this)
                )
                .build();

        startZoon();
    }

    private void applySystemInsets(View target) {
        target.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(0, bars.top, 0, bars.bottom);
            } else {
                view.setPadding(
                        0,
                        windowInsets.getSystemWindowInsetTop(),
                        0,
                        windowInsets.getSystemWindowInsetBottom()
                );
            }
            return windowInsets;
        });
        target.requestApplyInsets();
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
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
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
                    settings.getUserAgentString() + " ZOONAndroid/1.2.0"
            );

            next.setWebChromeClient(new WebChromeClient());

            next.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(
                        WebView view,
                        WebResourceRequest request
                ) {
                    return assetLoader.shouldInterceptRequest(request.getUrl());
                }

                @Override
                public void onPageStarted(
                        WebView view,
                        String url,
                        android.graphics.Bitmap favicon
                ) {
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
                                "ZOON n'a pas pu charger son interface.",
                                "L'interface est incluse dans l'application. Réessaie."
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
                                "ZOON n'a pas pu charger son interface.",
                                "Une ressource locale est manquante."
                        );
                    }
                }

                @Override
                public boolean onRenderProcessGone(
                        WebView view,
                        RenderProcessGoneDetail detail
                ) {
                    if (view == webView) {
                        destroyWebView(view);
                        webView = null;
                        showFallback(
                                "Le moteur d'affichage Android s'est arrêté.",
                                "ZOON reste ouvert. Relance l'interface."
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
                    "ZOON n'a pas pu démarrer.",
                    "Le moteur d'affichage Android n'est pas disponible."
            );
        }
    }

    private boolean routeUri(Uri uri) {
        String scheme = uri.getScheme();

        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            String host = uri.getHost();

            if (host != null && host.equalsIgnoreCase(LOCAL_HOST)) {
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
        mark.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        box.addView(mark, sizeParams(108, 108));

        TextView title = makeText("ZOON", 26, YELLOW);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        title.setLetterSpacing(0.10f);
        LinearLayout.LayoutParams titleParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        titleParams.topMargin = dp(14);
        box.addView(title, titleParams);

        ProgressBar progress = new ProgressBar(this);
        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(dp(32), dp(32));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(18);
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
        mark.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        overlay.addView(mark, sizeParams(96, 96));

        ProgressBar progress = new ProgressBar(this);
        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(dp(30), dp(30));
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(16);
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
        box.setPadding(dp(30), dp(30), dp(30), dp(30));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.zoon_mark);
        mark.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        box.addView(mark, sizeParams(96, 96));

        TextView title = makeText(titleText, 21, Color.WHITE);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        titleParams.topMargin = dp(20);
        box.addView(title, titleParams);

        TextView body = makeText(bodyText, 14, Color.rgb(148, 169, 181));
        body.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams bodyParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
        bodyParams.topMargin = dp(10);
        box.addView(body, bodyParams);

        Button retry = new Button(this);
        retry.setText("Relancer ZOON");
        retry.setTextColor(NAVY);
        retry.setBackgroundColor(YELLOW);
        retry.setAllCaps(false);
        retry.setOnClickListener(v -> startZoon());
        LinearLayout.LayoutParams retryParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(50)
                );
        retryParams.topMargin = dp(24);
        box.addView(retry, retryParams);

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

    private void destroyWebView(WebView view) {
        try {
            root.removeView(view);
        } catch (Throwable ignored) {
        }
        try {
            view.stopLoading();
            view.setWebChromeClient(null);
            view.setWebViewClient(null);
            view.destroy();
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            destroyWebView(webView);
            webView = null;
        }
        super.onDestroy();
    }
}

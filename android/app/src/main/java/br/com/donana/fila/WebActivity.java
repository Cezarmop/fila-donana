package br.com.donana.fila;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Mostra o site da fila dentro do app (WebView).
 * Links para outros endereços (ex.: wa.me do WhatsApp) abrem fora do app, no aplicativo certo.
 */
public class WebActivity extends Activity {

    static final String EXTRA_BASE = "base";
    static final String EXTRA_URL = "url";

    private WebView webView;
    private String hostServidor;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String base = getIntent().getStringExtra(EXTRA_BASE);
        String url = getIntent().getStringExtra(EXTRA_URL);
        hostServidor = Uri.parse(base).getHost();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true); // o site guarda a entrada do cliente no localStorage
        ws.setSupportMultipleWindows(false); // window.open / target=_blank caem no shouldOverrideUrlLoading

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri destino = request.getUrl();
                String scheme = destino.getScheme();
                boolean mesmoServidor = ("http".equals(scheme) || "https".equals(scheme))
                        && hostServidor != null && hostServidor.equalsIgnoreCase(destino.getHost());
                if (mesmoServidor) return false; // continua dentro do app
                abrirFora(destino);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    String html = "<html><body style='font-family:sans-serif;padding:24px;color:#2B1A10'>"
                            + "<h2>Não foi possível abrir a fila</h2>"
                            + "<p>Confira se o computador com o site está ligado, se o celular está na mesma rede Wi-Fi "
                            + "e se o endereço está certo:</p><p><b>" + TextUtils.htmlEncode(base) + "</b></p>"
                            + "<p>Erro: " + TextUtils.htmlEncode(String.valueOf(error.getDescription())) + "</p>"
                            + "<p>Use o botão Voltar para trocar o endereço.</p></body></html>";
                    view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
                }
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(url);
        }
    }

    private void abrirFora(Uri destino) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, destino));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Nenhum app para abrir este link", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed(); // volta para a tela do endereço do servidor
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.setVisibility(View.GONE);
            webView.destroy();
        }
        super.onDestroy();
    }
}

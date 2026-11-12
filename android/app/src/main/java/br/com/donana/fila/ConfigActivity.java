package br.com.donana.fila;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

/**
 * Tela inicial: guarda o endereço do servidor (site da fila) e abre a tela do cliente ou o painel.
 * O endereço fica salvo no aparelho, então só precisa ser digitado uma vez.
 */
public class ConfigActivity extends Activity {

    static final String PREFS = "config";
    static final String CHAVE_URL = "url_servidor";

    private EditText campoUrl;
    private TextView textoErro;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        campoUrl = findViewById(R.id.campoUrl);
        textoErro = findViewById(R.id.textoErro);

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        campoUrl.setText(prefs.getString(CHAVE_URL, ""));

        findViewById(R.id.botaoCliente).setOnClickListener(v -> abrir("/entrar"));
        findViewById(R.id.botaoPainel).setOnClickListener(v -> abrir("/painel"));
    }

    private void abrir(String caminho) {
        String base = normalizar(campoUrl.getText().toString());
        if (base == null) {
            textoErro.setText("Digite um endereço válido, por exemplo http://192.168.0.10:5173");
            textoErro.setVisibility(View.VISIBLE);
            return;
        }
        textoErro.setVisibility(View.GONE);
        campoUrl.setText(base);
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(CHAVE_URL, base).apply();

        Intent intent = new Intent(this, WebActivity.class);
        intent.putExtra(WebActivity.EXTRA_BASE, base);
        intent.putExtra(WebActivity.EXTRA_URL, base + caminho);
        startActivity(intent);
    }

    /** Aceita "192.168.0.10:5173" ou "http://192.168.0.10:5173/" e devolve "http://192.168.0.10:5173". */
    static String normalizar(String texto) {
        String s = texto.trim();
        if (s.isEmpty()) return null;
        if (!s.startsWith("http://") && !s.startsWith("https://")) s = "http://" + s;
        while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        Uri uri = Uri.parse(s);
        if (uri.getHost() == null || uri.getHost().isEmpty()) return null;
        return s;
    }
}

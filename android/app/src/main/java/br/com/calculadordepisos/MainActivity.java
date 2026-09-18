package br.com.calculadordepisos;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.support.v4.content.FileProvider;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Insets;
import android.graphics.Matrix;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.support.annotation.NonNull;
import android.support.media.ExifInterface;
import android.util.Base64;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.FrameLayout;

import org.json.JSONArray;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final String FOTO_HOST = "https://fotoslocais.calculadordepisos/";
    private static final int REQUEST_FILE_CHOOSER = 1001;
    private static final int REQUEST_ANDROID_PICKER = 1002;
    private static final int REQUEST_CAMERA = 1003;
    private static final int REQUEST_CAMERA_PERMISSION = 1004;
    private WebView webView;
    private FrameLayout root;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraOutputUri;
    private static final int REQUEST_EXPORT = 1005;
    private java.io.File exportFile;
    private volatile boolean exportBusy;
    private String exportName;
    private String exportMime;

    @SuppressWarnings("deprecation")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (savedInstanceState != null) {
            String savedUri = savedInstanceState.getString("cameraOutputUri");
            if (savedUri != null) cameraOutputUri = Uri.parse(savedUri);
        }
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
        }
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        root = new FrameLayout(this);
        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets systemBars = insets.getInsets(WindowInsets.Type.systemBars());
                Insets teclado = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(
                        systemBars.left,
                        systemBars.top,
                        systemBars.right,
                        Math.max(systemBars.bottom, teclado.bottom)
                );
            } else {
                view.setPadding(
                        insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom()
                );
            }
            return insets;
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request
            ) {
                String url = request.getUrl().toString();
                if (url.startsWith(FOTO_HOST)) {
                    String nomeArquivo = url.substring(FOTO_HOST.length());
                    if (!nomeArquivo.matches("[a-zA-Z0-9_.-]+")) return new android.webkit.WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"), new java.io.ByteArrayInputStream(new byte[0]));
                    java.io.File arquivo = new java.io.File(new java.io.File(getFilesDir(), "fotos"), nomeArquivo);
                    if (arquivo.exists()) {
                        try {
                            return new android.webkit.WebResourceResponse(
                                    "image/jpeg", null, 200, "OK", java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"), new java.io.FileInputStream(arquivo)
                            );
                        } catch (Exception ignored) {}
                    }
                }
                if (url.startsWith(FOTO_HOST)) return new android.webkit.WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.singletonMap("Access-Control-Allow-Origin", "*"), new java.io.ByteArrayInputStream(new byte[0]));
                return super.shouldInterceptRequest(view, request);
            }
        });


        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            @SuppressWarnings("unused")
            public void open() {
                runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(intent, REQUEST_ANDROID_PICKER);
                } catch (Exception exception) {
                    Intent fallbackIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    fallbackIntent.setType("image/*");
                    fallbackIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    fallbackIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try { startActivityForResult(fallbackIntent, REQUEST_ANDROID_PICKER); }
                    catch (Exception ignored) { avisarFalhaFoto(); }
                }
                });
            }
        }, "AndroidFilePicker");

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void aplicar(boolean escuro) {
                runOnUiThread(() -> aplicarTemaBarras(escuro));
            }
        }, "AndroidTema");

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            @SuppressWarnings("unused")
            public void open() {
                runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(
                        new String[] { Manifest.permission.CAMERA },
                        REQUEST_CAMERA_PERMISSION
                    );
                    return;
                }
                abrirCameraNativa();
                });
            }
        }, "AndroidCamera");



        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void texto(String text) {
                runOnUiThread(() -> {
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("text/plain"); intent.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(intent, "Compartilhar orçamento"));
                });
            }
        }, "AndroidCompartilhar");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void open() {
                runOnUiThread(() -> {
                    android.print.PrintManager manager = (android.print.PrintManager) getSystemService(PRINT_SERVICE);
                    manager.print("Orçamento", webView.createPrintDocumentAdapter("Orçamento"), null);
                });
            }
        }, "AndroidImprimir");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public synchronized boolean iniciar(String name, String mime) {
                if (exportBusy) return false;
                try {
                    exportFile = java.io.File.createTempFile("export_", ".tmp", getCacheDir());
                    exportBusy = true;
                    exportName = name.replaceAll("[^a-zA-Z0-9._-]", "_"); exportMime = mime;
                    return true;
                } catch (Exception error) { return false; }
            }
            @JavascriptInterface public synchronized boolean parte(String encoded) {
                if (exportFile == null || exportFile.length() > 256L * 1024 * 1024) return false;
                try (java.io.FileOutputStream output = new java.io.FileOutputStream(exportFile, true)) {
                    output.write(Base64.decode(encoded, Base64.DEFAULT)); return true;
                } catch (Exception error) { return false; }
            }
            @JavascriptInterface public void concluir() {
                runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType(exportMime);
                        intent.putExtra(Intent.EXTRA_TITLE, exportName);
                        startActivityForResult(intent, REQUEST_EXPORT);
                    } catch (Exception error) { cancelar(); informarExportacao(false); }
                });
            }
            @JavascriptInterface public synchronized void cancelar() {
                if (exportFile != null) exportFile.delete(); exportFile = null; exportBusy = false;
            }
        }, "AndroidSalvarArquivo");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams fileChooserParams
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(java.util.Arrays.asList(fileChooserParams.getAcceptTypes()).contains(".zip") ? "application/zip" : java.util.Arrays.asList(fileChooserParams.getAcceptTypes()).contains(".json") ? "application/json" : "image/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(intent, REQUEST_FILE_CHOOSER);
                } catch (Exception exception) {
                    try {
                        Intent fallbackIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        fallbackIntent.setType(java.util.Arrays.asList(fileChooserParams.getAcceptTypes()).contains(".zip") ? "application/zip" : java.util.Arrays.asList(fileChooserParams.getAcceptTypes()).contains(".json") ? "application/json" : "image/*");
                        fallbackIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                        fallbackIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivityForResult(fallbackIntent, REQUEST_FILE_CHOOSER);
                    } catch (Exception fallbackException) {
                        filePathCallback = null;
                        callback.onReceiveValue(null);
                    }
                }
                return true;
            }
        });
        setContentView(root);
        aplicarTemaBarras(getPreferences(MODE_PRIVATE).getBoolean("temaEscuro", false));
        webView.loadUrl("file:///android_asset/index.html");
    }



    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {
            case REQUEST_EXPORT: {
                final java.io.File file = exportFile; exportFile = null;
                if (file == null) break;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    final Uri uri = data.getData();
                    new Thread(() -> {
                        try (java.io.InputStream input = new java.io.FileInputStream(file);
                             java.io.OutputStream output = getContentResolver().openOutputStream(uri)) {
                            if (output == null) throw new java.io.IOException("No output");
                            byte[] buffer = new byte[65536]; int count;
                            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                            informarExportacao(true);
                        } catch (Exception error) { informarExportacao(false); }
                        finally { file.delete(); }
                    }).start();
                } else { file.delete(); informarExportacao(false); }
                break;
            }
            case REQUEST_CAMERA: {
                JSONArray arquivos = new JSONArray();
                if (resultCode == RESULT_OK && cameraOutputUri != null) {
                    adicionarArquivo(arquivos, cameraOutputUri);
                } else if (cameraOutputUri != null) {
                    // Camera output is a private cache file.
                }
                cameraOutputUri = null;
                enviarArquivosBase64(arquivos);
                break;
            }
            case REQUEST_ANDROID_PICKER:
                enviarArquivosParaWebView(resultCode, data);
                break;
            case REQUEST_FILE_CHOOSER: {
                if (filePathCallback != null) {
                    Uri[] results = (resultCode == RESULT_OK && data != null) ? getUrisFromIntent(data) : null;
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
                break;
            }
            default:
                super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        if (cameraOutputUri != null) state.putString("cameraOutputUri", cameraOutputUri.toString());
        super.onSaveInstanceState(state);
    }

    private Uri[] getUrisFromIntent(Intent data) {
        if (data.getClipData() != null) {
            int count = data.getClipData().getItemCount();
            Uri[] results = new Uri[count];
            for (int i = 0; i < count; i++) {
                results[i] = data.getClipData().getItemAt(i).getUri();
            }
            return results;
        } else if (data.getData() != null) {
            return new Uri[]{data.getData()};
        }
        return null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CAMERA_PERMISSION
            && grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            abrirCameraNativa();
        }
    }

    @SuppressWarnings("deprecation")
    private void aplicarTemaBarras(boolean escuro) {
        Window window = getWindow();
        // Keep these colors aligned with --cor-fundo in style.css.
        int corFundo = escuro ? 0xFF1E1E1E : 0xFFF5F5F5;
        root.setBackgroundColor(corFundo);
        webView.setBackgroundColor(corFundo);
        window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(corFundo));
        getPreferences(MODE_PRIVATE).edit().putBoolean("temaEscuro", escuro).apply();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // The root paints the inset areas behind transparent system bars.
            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);
            WindowInsetsController controller = window.getDecorView().getWindowInsetsController();
            if (controller != null) {
                int lightBars = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(escuro ? 0 : lightBars, lightBars);
            }
        } else {
            window.setStatusBarColor(corFundo);
            // Android 6/7 cannot draw dark navigation icons on a light bar.
            window.setNavigationBarColor(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? corFundo : 0xFF1E1E1E);
            int flags = window.getDecorView().getSystemUiVisibility();
            flags = escuro ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    : flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags = escuro ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                        : flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            window.getDecorView().setSystemUiVisibility(flags);
        }
    }

    private void abrirCameraNativa() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        try {
            java.io.File pasta = new java.io.File(getCacheDir(), "camera");
            pasta.mkdirs();
            java.io.File arquivo = java.io.File.createTempFile("piso_", ".jpg", pasta);
            cameraOutputUri = FileProvider.getUriForFile(this, getPackageName() + ".files", arquivo);
            intent.setClipData(ClipData.newRawUri("foto", cameraOutputUri));
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent, REQUEST_CAMERA);
        } catch (Exception ignored) {
            if (cameraOutputUri != null) {
                // Cache is managed by Android.
                cameraOutputUri = null;
            }
            avisarFalhaFoto();
        }
    }

    private void informarExportacao(boolean sucesso) {
        exportBusy = false;
        webView.post(() -> webView.evaluateJavascript("window.onAndroidExportCompleted && window.onAndroidExportCompleted(" + sucesso + ")", null));
    }

    private void avisarFalhaFoto() {
        webView.post(() -> webView.evaluateJavascript(
            "window.alert('Não foi possível carregar a foto.')",
            null
        ));
    }

    private void enviarArquivosParaWebView(int resultCode, Intent data) {
        JSONArray arquivos = new JSONArray();
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = Math.min(data.getClipData().getItemCount(), 3);
                for (int i = 0; i < count; i++) {
                    adicionarArquivo(arquivos, data.getClipData().getItemAt(i).getUri());
                }
            } else if (data.getData() != null) {
                adicionarArquivo(arquivos, data.getData());
            }
        }
        enviarArquivosBase64(arquivos);
    }

    private void enviarArquivosBase64(JSONArray arquivos) {
        webView.post(() -> webView.evaluateJavascript(
            "window.onAndroidFilesSelected(" + arquivos + ")",
            null
        ));
    }

    private void adicionarArquivo(JSONArray arquivos, Uri uri) {
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) {
                return;
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeStream(entrada, null, options);
            options.inSampleSize = 1;
            while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > 2400) options.inSampleSize *= 2;
            options.inJustDecodeBounds = false;
            Bitmap bitmap;
            try (InputStream pixels = getContentResolver().openInputStream(uri)) {
                bitmap = BitmapFactory.decodeStream(pixels, null, options);
            }
            if (bitmap == null) {
                return;
            }
            Bitmap orientada = aplicarOrientacao(bitmap, uri);
            if (orientada != bitmap) {
                bitmap.recycle();
                bitmap = orientada;
            }
            int maiorLado = Math.max(bitmap.getWidth(), bitmap.getHeight());
            if (maiorLado > 2400) {
                float escala = 2400f / maiorLado;
                Bitmap redimensionada = Bitmap.createScaledBitmap(
                    bitmap,
                    Math.max(1, Math.round(bitmap.getWidth() * escala)),
                    Math.max(1, Math.round(bitmap.getHeight() * escala)),
                    true
                );
                bitmap.recycle();
                bitmap = redimensionada;
            }
            adicionarBitmap(arquivos, bitmap);
            bitmap.recycle();
        } catch (Exception ignored) {
            // Ignora somente o arquivo inválido e mantém os demais selecionados.
        }
    }

    private void adicionarBitmap(JSONArray arquivos, Bitmap bitmap) {
        java.io.File pastaFotos = new java.io.File(getFilesDir(), "fotos");
        if (!pastaFotos.exists()) pastaFotos.mkdirs();
        String nomeArquivo = "foto_" + java.util.UUID.randomUUID() + ".jpg";
        java.io.File arquivo = new java.io.File(pastaFotos, nomeArquivo);
        try (java.io.FileOutputStream saida = new java.io.FileOutputStream(arquivo)) {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, saida);
            arquivos.put(FOTO_HOST + nomeArquivo);
        } catch (Exception ignored) {}
    }

    private Bitmap aplicarOrientacao(Bitmap bitmap, Uri uri) {
        try (InputStream entrada = getContentResolver().openInputStream(uri)) {
            if (entrada == null) {
                return bitmap;
            }
            int orientacao = new ExifInterface(entrada).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            );
            Matrix matriz = new Matrix();
            if (orientacao == ExifInterface.ORIENTATION_ROTATE_90) {
                matriz.postRotate(90);
            } else if (orientacao == ExifInterface.ORIENTATION_ROTATE_180) {
                matriz.postRotate(180);
            } else if (orientacao == ExifInterface.ORIENTATION_ROTATE_270) {
                matriz.postRotate(270);
            } else if (orientacao == ExifInterface.ORIENTATION_FLIP_HORIZONTAL) {
                matriz.preScale(-1, 1);
            } else if (orientacao == ExifInterface.ORIENTATION_FLIP_VERTICAL) {
                matriz.preScale(1, -1);
            } else if (orientacao == ExifInterface.ORIENTATION_TRANSPOSE) {
                matriz.postRotate(90); matriz.postScale(-1, 1);
            } else if (orientacao == ExifInterface.ORIENTATION_TRANSVERSE) {
                matriz.postRotate(270); matriz.postScale(-1, 1);
            } else {
                return bitmap;
            }
            return Bitmap.createBitmap(
                bitmap,
                0,
                0,
                bitmap.getWidth(),
                bitmap.getHeight(),
                matriz,
                true
            );
        } catch (Exception ignored) {
            return bitmap;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        webView.evaluateJavascript(
            "window.tratarVoltarAndroid ? window.tratarVoltarAndroid() : false",
            resultado -> {
                if (!"true".equals(resultado)) {
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        MainActivity.super.onBackPressed();
                    }
                }
            }
        );
    }
}

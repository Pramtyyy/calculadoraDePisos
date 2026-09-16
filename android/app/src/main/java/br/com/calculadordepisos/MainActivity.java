package br.com.calculadordepisos;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
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
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraOutputUri;

    @SuppressWarnings("deprecation")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getDecorView().getWindowInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS ,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            }
        } else {
            window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        window.setStatusBarColor(0xFFFFFFFF);
        window.setNavigationBarColor(0xFFFFFFFF);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
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
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request
            ) {
                String url = request.getUrl().toString();
                if (url.startsWith(FOTO_HOST)) {
                    String nomeArquivo = url.substring(FOTO_HOST.length());
                    java.io.File arquivo = new java.io.File(new java.io.File(getFilesDir(), "fotos"), nomeArquivo);
                    if (arquivo.exists()) {
                        try {
                            return new android.webkit.WebResourceResponse(
                                    "image/jpeg", null, new java.io.FileInputStream(arquivo)
                            );
                        } catch (Exception ignored) {}
                    }
                }
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
                    startActivityForResult(fallbackIntent, REQUEST_ANDROID_PICKER);
                }
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
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(
                        new String[] { Manifest.permission.CAMERA },
                        REQUEST_CAMERA_PERMISSION
                    );
                    return;
                }
                abrirCameraNativa();
            }
        }, "AndroidCamera");



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
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(intent, REQUEST_FILE_CHOOSER);
                } catch (Exception exception) {
                    try {
                        Intent fallbackIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        fallbackIntent.setType("image/*");
                        fallbackIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
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
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(root);
    }



    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {
            case REQUEST_CAMERA: {
                JSONArray arquivos = new JSONArray();
                if (resultCode == RESULT_OK && cameraOutputUri != null) {
                    adicionarArquivo(arquivos, cameraOutputUri);
                } else if (cameraOutputUri != null) {
                    getContentResolver().delete(cameraOutputUri, null, null);
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

    private void aplicarTemaBarras(boolean escuro) {
        Window window = getWindow();
        int corBarras = escuro ? 0xFF1e1e1e : 0xFFFFFFFF;
        window.setStatusBarColor(corBarras);
        window.setNavigationBarColor(corBarras);
        webView.setBackgroundColor(corBarras); // <- essa linha resolve o extraTopSpace

        int flags = window.getDecorView().getSystemUiVisibility();
        if (escuro) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        } else {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        window.getDecorView().setSystemUiVisibility(flags);
    }

    private void abrirCameraNativa() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        ContentValues valores = new ContentValues();
        valores.put(MediaStore.Images.Media.DISPLAY_NAME, "piso_" + System.currentTimeMillis() + ".jpg");
        valores.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            valores.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/CalculadorDePisos");
        }
        cameraOutputUri = getContentResolver().insert(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            valores
        );
        try {
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent, REQUEST_CAMERA);
        } catch (Exception ignored) {
            if (cameraOutputUri != null) {
                getContentResolver().delete(cameraOutputUri, null, null);
                cameraOutputUri = null;
            }
            avisarFalhaFoto();
        }
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
            Bitmap bitmap = BitmapFactory.decodeStream(entrada);
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
        String nomeArquivo = "foto_" + System.currentTimeMillis() + ".jpg";
        java.io.File arquivo = new java.io.File(pastaFotos, nomeArquivo);
        try (java.io.FileOutputStream saida = new java.io.FileOutputStream(arquivo)) {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, saida);
            arquivos.put(FOTO_HOST + nomeArquivo);
        } catch (Exception ignored) {}
    }

    private Bitmap aplicarOrientacao(Bitmap bitmap, Uri uri) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return bitmap;
        }
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

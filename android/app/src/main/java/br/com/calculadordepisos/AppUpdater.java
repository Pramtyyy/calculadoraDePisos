package br.com.calculadordepisos;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.support.v4.content.FileProvider;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Updates the sideloaded app from the configured inventory server. */
@SuppressWarnings("deprecation")
final class AppUpdater {
    static final int REQUEST_INSTALL_PERMISSION = 1010;
    private static final long MAX_APK = 256L * 1024 * 1024;
    private final Activity activity;
    private final WebView webView;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean();
    private volatile boolean closed;
    private volatile File readyFile;
    private volatile JSONObject readyRelease;

    AppUpdater(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private PackageInfo installed() throws PackageManager.NameNotFoundException {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), PackageManager.GET_SIGNATURES);
    }

    private long code(PackageInfo info) {
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    @JavascriptInterface public String version() {
        try { return installed().versionName; } catch (Exception error) { return "?"; }
    }

    private void status(String state, String message) {
        if (closed) return;
        webView.post(() -> {
            if (!closed) webView.evaluateJavascript("window.onAppUpdate && window.onAppUpdate(" +
                    JSONObject.quote(state) + "," + JSONObject.quote(message) + ")", null);
        });
    }

    private HttpURLConnection connect(URL url, String token) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(20000);
        // Never send the access token to a redirect target.
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Accept-Encoding", "identity");
        return connection;
    }

    @JavascriptInterface public boolean check(String base, String token) {
        if (closed || !busy.compareAndSet(false, true)) return false;
        readyFile = null;
        readyRelease = null;
        worker.execute(() -> {
            File partial = null;
            try {
                status("checking", "Consultando atualização…");
                URL server = new URL(base);
                if (!(server.getProtocol().equals("http") || server.getProtocol().equals("https")) ||
                        server.getHost().isEmpty() || server.getUserInfo() != null ||
                        server.getQuery() != null || server.getRef() != null ||
                        !(server.getPath().isEmpty() || server.getPath().equals("/"))) {
                    throw new IOException("Endereço do servidor inválido.");
                }
                if (token == null || token.isEmpty() || token.contains("\n") || token.contains("\r"))
                    throw new IOException("Informe a chave de acesso em Ajustes.");
                JSONObject release;
                HttpURLConnection metadata = connect(new URL(server, "/api/app/version"), token);
                try {
                    int response = metadata.getResponseCode();
                    if (response == 204 || response == 404) {
                        status("current", "Nenhuma atualização publicada neste servidor."); return;
                    }
                    if (response == 401) throw new IOException("Chave de acesso inválida. Confira os Ajustes.");
                    if (response != 200) throw new IOException("Servidor de atualização indisponível. Tente novamente.");
                    try (InputStream input = metadata.getInputStream(); ByteArrayOutputStream data = new ByteArrayOutputStream()) {
                        byte[] buffer = new byte[4096]; int count;
                        while ((count = input.read(buffer)) != -1) {
                            if (data.size() + count > 16384) throw new IOException("Resposta de versão inválida.");
                            data.write(buffer, 0, count);
                        }
                        release = new JSONObject(data.toString("UTF-8"));
                    }
                } finally { metadata.disconnect(); }
                if (!activity.getPackageName().equals(release.getString("packageName")))
                    throw new IOException("A atualização não corresponde a este aplicativo.");
                if (release.getLong("versionCode") <= code(installed())) {
                    status("current", "O aplicativo já está atualizado (" + version() + ")."); return;
                }
                String hash = release.getString("sha256");
                long size = release.getLong("size");
                String apkPath = "/api/app/apk/" + hash + ".apk";
                if (!hash.matches("[a-f0-9]{64}") || size <= 0 || size > MAX_APK ||
                        !apkPath.equals(release.getString("apkPath"))) throw new IOException("Publicação de atualização inválida.");
                File directory = new File(activity.getCacheDir(), "updates");
                if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Sem espaço para a atualização.");
                File target = new File(directory, hash + ".apk");
                if (!target.isFile()) {
                    // This private directory contains only updater downloads.
                    File[] previous = directory.listFiles();
                    if (previous != null) for (File file : previous) if (file.isFile()) file.delete();
                    partial = new File(directory, hash + ".part");
                    HttpURLConnection download = connect(new URL(server, apkPath), token);
                    try {
                        if (download.getResponseCode() != 200) throw new IOException("Não foi possível baixar a atualização.");
                        long total = 0; int lastPercent = -1;
                        try (InputStream input = download.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                            byte[] buffer = new byte[65536]; int count;
                            while ((count = input.read(buffer)) != -1) {
                                if (closed || Thread.currentThread().isInterrupted()) throw new IOException("Download interrompido.");
                                total += count;
                                if (total > size) throw new IOException("Tamanho da atualização inválido.");
                                output.write(buffer, 0, count);
                                int percent = (int) (total * 100 / size);
                                if (percent != lastPercent) {
                                    lastPercent = percent;
                                    status("downloading", "Baixando versão " + release.getString("versionName") + ": " + percent + "%");
                                }
                            }
                        }
                        if (total != size) throw new IOException("Download incompleto. Tente novamente.");
                    } finally { download.disconnect(); }
                    validate(partial, release);
                    if (!partial.renameTo(target)) throw new IOException("Não foi possível salvar a atualização.");
                } else {
                    try { validate(target, release); }
                    catch (Exception error) { target.delete(); throw error; }
                }
                readyRelease = release;
                readyFile = target;
                status("ready", "Versão " + release.getString("versionName") + " baixada. Toque em Instalar atualização.");
            } catch (Exception error) {
                String message = error instanceof IOException ? error.getMessage() : "Não foi possível validar a atualização.";
                // Connection failures should not expose URLs, tokens or internal paths.
                if (error instanceof java.net.SocketException || error instanceof java.net.SocketTimeoutException ||
                        error instanceof java.net.UnknownHostException) message = "Servidor sem conexão. Tente novamente quando estiver na rede.";
                status("error", message == null ? "Falha na atualização. Tente novamente." : message);
            } finally {
                if (partial != null) partial.delete();
                busy.set(false);
            }
        });
        return true;
    }

    private void validate(File file, JSONObject release) throws Exception {
        if (file.length() != release.getLong("size")) throw new IOException("Tamanho da atualização inválido.");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[65536]; int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder hash = new StringBuilder();
        for (byte value : digest.digest()) hash.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
        if (!hash.toString().equals(release.getString("sha256"))) throw new IOException("Arquivo corrompido. Baixe a atualização novamente.");
        PackageManager pm = activity.getPackageManager();
        PackageInfo candidate = pm.getPackageArchiveInfo(file.getAbsolutePath(), PackageManager.GET_SIGNATURES);
        PackageInfo current = installed();
        if (candidate == null || !current.packageName.equals(candidate.packageName) ||
                code(candidate) != release.getLong("versionCode") || code(candidate) <= code(current) ||
                candidate.applicationInfo == null || candidate.applicationInfo.targetSdkVersion < current.applicationInfo.targetSdkVersion ||
                (Build.VERSION.SDK_INT >= 24 && candidate.applicationInfo.minSdkVersion > Build.VERSION.SDK_INT) ||
                candidate.signatures == null || current.signatures == null || candidate.signatures.length == 0 ||
                !new HashSet<>(Arrays.asList(candidate.signatures)).equals(new HashSet<>(Arrays.asList(current.signatures)))) {
            throw new IOException("APK incompatível: confira a versão, o aparelho e a assinatura da publicação.");
        }
    }

    @JavascriptInterface public void install() {
        if (closed || !busy.compareAndSet(false, true)) return;
        final File file = readyFile;
        final JSONObject release = readyRelease;
        worker.execute(() -> {
            try {
                if (file == null || release == null) throw new IOException("Consulte e baixe a atualização primeiro.");
                validate(file, release);
                activity.runOnUiThread(() -> openInstaller(file));
            } catch (Exception error) {
                status("error", "A atualização não está pronta ou é incompatível. Verifique novamente.");
            } finally { busy.set(false); }
        });
    }

    private void openInstaller(File file) {
        if (closed || activity.isFinishing()) return;
        try {
            if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                status("ready", "Autorize este aplicativo a instalar atualizações na próxima tela.");
                activity.startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + activity.getPackageName())), REQUEST_INSTALL_PERMISSION);
                return;
            }
            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".files", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
            status("ready", "Confirme a atualização na tela do Android. Se cancelar, poderá tentar novamente.");
        } catch (Exception error) {
            status("ready", "Não foi possível abrir o instalador. Confira as permissões do aparelho e tente novamente.");
        }
    }

    void permissionReturned() {
        if (Build.VERSION.SDK_INT < 26 || activity.getPackageManager().canRequestPackageInstalls()) install();
        else status("ready", "Instalação não autorizada. Toque em Instalar atualização para tentar novamente.");
    }

    void close() { closed = true; worker.shutdownNow(); }
}

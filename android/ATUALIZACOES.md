# Atualizações pela rede local

A versão 1.3 (versionCode 4) inclui o atualizador. A primeira instalação dessa versão deve ser manual, por cima da instalação existente, usando a mesma chave de assinatura. Não desinstale o aplicativo para atualizar.

Ao abrir o app com servidor e chave de acesso configurados, ele consulta `GET /api/app/version`. Se houver um `versionCode` maior, baixa o APK automaticamente e mostra o progresso. Depois, o usuário toca em **Instalar atualização** e confirma no instalador do Android. Em Android 8 ou superior, pode ser necessário autorizar esse aplicativo a instalar apps na primeira vez.

**Ajustes → Atualização do aplicativo** exibe a versão instalada e permite verificar e instalar novamente. Sem conexão, os cadastros continuam funcionando e a verificação automática não abre alertas. Uma verificação manual mostra o erro. Fechar o processo durante o download pode interrompê-lo; a próxima verificação reinicia o download. Um APK completo já baixado é reutilizado após nova validação. Não há serviço de download permanente em segundo plano.

## Gerar a versão assinada

Incremente `versionCode` e `versionName` em `app/build.gradle.kts` a cada publicação. O servidor compara o código inteiro, não o texto da versão.

Use a chave original `android/key` e as credenciais originais no Android Studio (Generate Signed App Bundle or APK), ou configure estas variáveis no ambiente local do processo de build:

- `PISOS_KEYSTORE`: caminho absoluto da chave original.
- `PISOS_STORE_PASSWORD`: senha do arquivo da chave.
- `PISOS_KEY_ALIAS`: alias da chave.
- `PISOS_KEY_PASSWORD`: senha da chave.

Não grave senhas nos arquivos do projeto nem no histórico de comandos. Com as variáveis configuradas, execute na raiz:

```powershell
.\android\gradlew.bat -p android assembleRelease lintRelease
```

O APK assinado fica em `android/app/build/outputs/apk/release/app-release.apk`. Sem essas variáveis, o build gera `app-release-unsigned.apk`, que **não pode ser instalado nem publicado como atualização**. Não substitua a chave por uma nova.

## Publicar no servidor existente

Depois de gerar o APK assinado, execute na raiz, com Python 3.11+ e o SDK Android disponível:

```powershell
python publicar_atualizacao.py android/app/build/outputs/apk/release/app-release.apk
```

O script verifica a assinatura usando `apksigner`, o identificador e a versão usando `aapt`, rejeita builds de depuração e compara a assinatura com `android/app/release/app-release.apk` (referência 1.2 já existente). Use `--reference caminho/versao-anterior.apk` se precisar apontar para outra referência confiável instalada nos aparelhos. A nova versão deve superar tanto a referência quanto a última publicação.

Se necessário, informe `--sdk` com o diretório do SDK e `--java` com o executável Java. O script também reconhece `ANDROID_HOME`, `ANDROID_SDK_ROOT` e `JAVA_HOME`.

O APK é copiado para `updates/<sha256>.apk`; `updates/latest.json` é substituído atomicamente somente depois da validação. A pasta é ignorada pelo Git. Não edite os APKs publicados; para uma nova compilação, incremente o código e publique novamente. Publique apenas por um processo de cada vez.

Reinicie o servidor Python uma vez para carregar os novos endpoints. Publicações seguintes não exigem reinício. Para outro computador servidor, copie a pasta `updates` para junto de `server.py`, colocando os APKs antes de substituir `latest.json`.

## API e verificações

- `GET /api/app/version`: exige a chave de acesso já usada na sincronização. Retorna 204 enquanto não houver versão publicada, 200 com metadados ou 503 se a publicação estiver incompleta/inválida.
- `GET /api/app/apk/<sha256>.apk`: exige a mesma chave e transmite o arquivo em blocos. A pasta `updates` não é exposta como diretório público.
- O Android não segue redirecionamentos com a chave de acesso. Valida tamanho, SHA-256, pacote, versão maior, compatibilidade e o mesmo conjunto de certificados da instalação atual antes de abrir o instalador. Rotação de chaves não é implementada.
- O APK é instalado pelo Android com confirmação do usuário. Essa implementação é para distribuição direta na rede local; não é um mecanismo de atualização pela Play Store.
- O app e o servidor usam a conexão configurada. Para acesso fora da rede local, configure HTTPS; não exponha o servidor HTTP local diretamente à internet.

## Validação

`python -B tests/run_all.py` executa os testes do servidor, publicação e navegador em dados isolados, com Playwright disponível em `NODE_PATH`. O teste `updates.browser.cjs` simula a ponte Android e verifica a consulta inicial, os estados de erro/progresso e os botões de instalação. O build e `lintRelease` validam o código Android.

A aceitação em aparelho deve cobrir: primeira instalação 1.3 assinada; publicação de versão posterior com a mesma chave; download; concessão e recusa da permissão; cancelamento e confirmação da instalação; preservação dos dados; interrupção do download; rejeição de APK incompatível. Esses passos exigem um aparelho conectado e versões assinadas.

# Calculador de Pisos para Android

Este projeto abre o `index.html` existente dentro de uma `WebView` Android.

## Abrir e executar

1. Abra a pasta `android` no Android Studio.
2. Aguarde a sincronizacao do Gradle.
3. Conecte um smartphone com depuracao USB ou inicie um emulador.
4. Execute o modulo `app`.

O app habilita JavaScript e armazenamento DOM para preservar o uso do `localStorage` da aplicacao.

## Compartilhar dados entre celulares

Na pasta principal do projeto, execute `python server.py` no computador conectado a mesma rede Wi-Fi dos celulares. Abra `http://IP_DO_COMPUTADOR:8000` no navegador para usar o app compartilhado.

No APK, na primeira abertura, informe esse mesmo endereco quando solicitado, por exemplo `http://192.168.0.10:8000`. O servidor guarda os pisos em `dados.sqlite3`.

## Usar pelo VS Code

As tarefas ficam em `.vscode/tasks.json`:

- `Android: gerar APK debug`
- `Android: instalar APK no celular`
- `Android: gerar e instalar no celular`

Use `Terminal > Run Task` para executa-las. Para isso, o computador precisa ter o Android SDK, o comando `adb` no PATH e o Gradle Wrapper (`gradlew.bat`) criado ao abrir/sincronizar o projeto no Android Studio.

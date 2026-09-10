# Calculador de Pisos para Android

Este projeto abre o `index.html` existente dentro de uma `WebView` Android.

## Abrir e executar

1. Abra a pasta `android` no Android Studio.
2. Aguarde a sincronizacao do Gradle.
3. Conecte um smartphone com depuracao USB ou inicie um emulador.
4. Execute o modulo `app`.

O app habilita JavaScript e armazenamento DOM para preservar o uso do `localStorage` da aplicacao.

## Usar pelo VS Code

As tarefas ficam em `.vscode/tasks.json`:

- `Android: gerar APK debug`
- `Android: instalar APK no celular`
- `Android: gerar e instalar no celular`

Use `Terminal > Run Task` para executa-las. Para isso, o computador precisa ter o Android SDK, o comando `adb` no PATH e o Gradle Wrapper (`gradlew.bat`) criado ao abrir/sincronizar o projeto no Android Studio.

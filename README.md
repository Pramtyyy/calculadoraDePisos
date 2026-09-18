# Calculador de Pisos — versão 1.2

## Iniciar e conectar

1. Execute `python -B server.py` na raiz do projeto. A porta padrão é 8000 (`--port` permite alterar).
2. Abra `http://IP_DO_COMPUTADOR:8000` no navegador ou instale o APK atualizado.
3. Abra **Ajustes**, informe o endereço e copie a chave do arquivo local `.server-token`. É possível fornecer a chave por `PISOS_API_TOKEN` em vez desse arquivo. Não publique a chave.
4. Use **Testar conexão** e **Sincronizar agora**. O status mostra erros e operações pendentes.

A versão 1.2 exige a API nova. APKs antigos não sincronizam com o servidor protegido. A versão release gerada está em `android/app/build/outputs/apk/release/app-release-unsigned.apk`; ainda precisa da configuração de assinatura do keystore existente para instalação/atualização de produção.

## Dados e sincronização

Produtos têm IDs e versões estáveis. Cada operação tem um identificador de repetição; repetir uma venda após perder a resposta não desconta estoque duas vezes. O servidor salva a venda e o estoque na mesma transação e rejeita estoque insuficiente, preços alterados e edições concorrentes.

Operações offline e o estoque projetado ficam no aparelho. Um conflito interrompe a fila sem apagar as alterações. Em Ajustes, exporte os dados locais, recarregue os dados do servidor e refaça apenas a alteração necessária. A exportação local inclui fotos já presentes no cache. Dados antigos anteriores à migração são mantidos para recuperação; vendas antigas não sincronizadas exigem revisão, pois não contêm informação suficiente para repetir a baixa de estoque com segurança.

A fila e a limpeza do rascunho são persistidas juntas ao finalizar uma venda. O orçamento não é uma reserva de estoque: preço e disponibilidade são confirmados pelo servidor.

## Orçamentos e estoque

- Rascunho com cliente/telefone persiste no aparelho; orçamentos salvos sincronizam entre aparelhos.
- Compartilhar abre o seletor do sistema; Imprimir/PDF usa a impressão do navegador ou Android.
- Alerta de estoque é configurado em caixas por produto.
- Histórico mostra ajustes, vendas e cancelamentos. Cancelar uma venda nova devolve todas as peças. Vendas antigas exigem ajuste manual; devoluções parciais ainda não têm fluxo próprio.
- Fotos existentes podem ser removidas e uma delas escolhida como capa.

## Backup e restauração

O primeiro início mantém `backups/antes-migracao-v2.sqlite3` e `backups/backup-inicial-v2.zip`. **Baixar backup completo** exporta dados do servidor e fotos em ZIP. Isso não inclui operações que ainda estão apenas em outros aparelhos: sincronize ou exporte cada aparelho separadamente.

Restaurar ZIP exige chave de acesso, confirmação e ausência de pendências locais. O servidor cria uma cópia anterior à restauração e troca a identificação da base para impedir reenvios de aparelhos desatualizados. Outros aparelhos precisam revisar/exportar pendências e recarregar a base restaurada.

Backups automáticos periódicos e cópia externa ainda precisam ser configurados. O servidor atual roda em primeiro plano; para uso contínuo, configure inicialização e supervisão no computador.

## Proteção e limites

Somente os arquivos web explicitamente permitidos são públicos. APIs e fotos exigem a chave; banco de dados, código Python, backups e keystore não são servidos por HTTP. A chave é compartilhada: não existem contas individuais nem permissões por usuário. HTTP é destinado à rede local confiável; acesso externo deve usar HTTPS e uma implantação apropriada.

O APK contém a interface para abrir offline. A versão web ainda depende do host para um início completo sem rede. Os testes físicos cobriram Android 16; versões mais antigas precisam de validação em aparelhos reais.

## Verificação

Com Python, Node, Playwright e Edge disponíveis, execute `python -B tests/run_all.py`. A suíte usa bancos e fotos temporários e cobre autenticação, rotas privadas, conflitos, concorrência pelo último estoque, vendas atômicas, repetição, migração, fotos, rascunhos e recuperação por backup. Se Playwright estiver fora de node_modules local, configure NODE_PATH.

Build isolado para testes: `android/gradlew.bat -p android -PphotoTest=true assembleDebug`. Esse APK usa o ID `.phototest` e não substitui os dados do aplicativo original. Build release: `android/gradlew.bat -p android assembleRelease`.

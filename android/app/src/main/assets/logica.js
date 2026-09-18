function Piso(nome, bitola, tonalidade, fotos, altura, largura, cor, textura, resistencia, caixa, pecasPorCaixa, preco, estoque, pecasAbertas) {
    this.nome = nome;
    this.bitola = bitola;
    this.tonalidade = tonalidade;
    this.fotos = fotos;
    this.altura = altura;
    this.largura = largura;
    this.cor = cor;
    this.textura = textura;
    this.resistencia = resistencia;
    this.caixa = caixa;
    this.pecasPorCaixa = pecasPorCaixa;
    this.preco = preco;
    this.estoque = estoque;
    this.pecasAbertas = pecasAbertas;
    this.ativo = true;
}

const chavePisos = 'pisos';
const chaveApi = 'apiUrl';
const chaveVendas = 'vendas';
const enderecoServidorPadrao = 'http://192.168.0.5:8000';
let pisosEmMemoria = DadosSeguros.project().pisos;
let vendasEmMemoria = DadosSeguros.project().vendas;
let apiUrl = window.location.protocol === 'file:'
    ? (localStorage.getItem(chaveApi) ?? enderecoServidorPadrao)
    : (localStorage.getItem(chaveApi) ?? window.location.origin);
apiUrl = apiUrl.replace(/\/+$/, '');
localStorage.setItem(chaveApi, apiUrl);
const modal = document.getElementById('modal');
const telaPrincipal = document.getElementById('telaPrincipal');
const telaCadastro = document.getElementById('telaCadastro');
const telaOrcamento = document.getElementById('telaOrcamento');
const telaRelatorios = document.getElementById('telaRelatorios');
const contadorOrcamento = document.getElementById('contadorOrcamento');
const irParaCadastro = document.getElementById('irParaCadastro');
const irParaOrcamento = document.getElementById('irParaOrcamento');
const irParaRelatorios = document.getElementById('irParaRelatorios');
const voltarRelatorios = document.getElementById('voltarRelatorios');
const dataInicialRelatorio = document.getElementById('dataInicialRelatorio');
const dataFinalRelatorio = document.getElementById('dataFinalRelatorio');
const buscaRelatorio = document.getElementById('buscaRelatorio');
const listaRelatorioVendas = document.getElementById('listaRelatorioVendas');
const totalVendasRelatorio = document.getElementById('totalVendasRelatorio');
const valorVendasRelatorio = document.getElementById('valorVendasRelatorio');
const pisosForm = document.getElementById('pisosForm');
const abrirFormulario = document.getElementById('abrirFormulario');
const alternarInativos = document.getElementById('alternarInativos');
const voltarCadastro = document.getElementById('voltarCadastro');
const voltarOrcamento = document.getElementById('voltarOrcamento');
const listaPisosCadastro = document.getElementById('listaPisosCadastro');
const listaPisosOrcamento = document.getElementById('listaPisosOrcamento');
const buscaPisos = document.getElementById('buscaPisos');
const buscaPisosOrcamento = document.getElementById('buscaPisosOrcamento');
const modalDetalhes = document.getElementById('modalDetalhes');
const detalhesPiso = document.getElementById('detalhesPiso');
const galeriaDetalhes = document.getElementById('galeriaDetalhes');
const modalGaleria = document.getElementById('modalGaleria');
const galeriaAmpliada = document.getElementById('galeriaAmpliada');
const editarPiso = document.getElementById('editarPiso');
const venderPiso = document.getElementById('venderPiso');
const excluirPiso = document.getElementById('excluirPiso');
const salvarPiso = document.getElementById('salvarPiso');
const modalVenda = document.getElementById('modalVenda');
const vendaForm = document.getElementById('vendaForm');
const produtoVenda = document.getElementById('produtoVenda');
const precoUnitario = document.getElementById('precoUnitario');
const areaPorPeca = document.getElementById('areaPorPeca');
const metrosPorCaixa = document.getElementById('metrosPorCaixa');
const unidadeVenda = document.getElementById('unidadeVenda');
const quantidadeVenda = document.getElementById('quantidadeVenda');
const metrosVendidos = document.getElementById('metrosVendidos');
const valorTotal = document.getElementById('valorTotal');
const modalOrcamento = document.getElementById('modalOrcamento');
const modalConfirmacaoVenda = document.getElementById('modalConfirmacaoVenda');
const cancelarConfirmacaoVenda = document.getElementById('cancelarConfirmacaoVenda');
const confirmarVenda = document.getElementById('confirmarVenda');
const listaOrcamento = document.getElementById('listaOrcamento');
const metragemOrcamento = document.getElementById('metragemOrcamento');
const valorOrcamento = document.getElementById('valorOrcamento');
const finalizarOrcamento = document.getElementById('finalizarOrcamento');
const limparOrcamento = document.getElementById('limparOrcamento');
const quantidadeArgamassa = document.getElementById('quantidadeArgamassa');
const fotosInput = document.getElementById('fotos');
const previaFotos = document.getElementById('previaFotos');
const abrirCamera = document.getElementById('abrirCamera');
const alternarFundo = document.getElementById('alternarFundo');
let indicePisoSelecionado = null;
let pisoSelecionadoId = null;
let indicePisoEditando = null;
let pisoEditandoId = null;
let pisoEditandoVersion = null;
let itensOrcamento = DadosSeguros.draft.itens || [];
let fotosAndroidSelecionadas = [];
let fotosPreservadasNaEdicao = [];
let resolverConfirmacaoVenda = null;
let mostrarInativos = false;

function mostrarTela(nome) {
    document.querySelectorAll('.tela').forEach(function (tela) {
        tela.classList.toggle('ativa', tela.id === `tela${nome[0].toUpperCase()}${nome.slice(1)}`);
    });
    document.querySelectorAll('.navButton').forEach(function (botao) {
        botao.classList.toggle('ativo', botao.dataset.tela === nome);
    });
}

irParaCadastro.addEventListener('click', function () {
    mostrarTela('cadastro');
});

irParaOrcamento.addEventListener('click', function () {
    exibirPisos();
    mostrarTela('orcamento');
});

irParaRelatorios.addEventListener('click', function () {
    exibirRelatorio();
    mostrarTela('relatorios');
});

voltarCadastro.addEventListener('click', function () {
    mostrarTela('principal');
});

voltarOrcamento.addEventListener('click', function () {
    mostrarTela('principal');
});

voltarRelatorios.addEventListener('click', function () {
    mostrarTela('principal');
});

window.tratarVoltarAndroid = function () {
    const dialogoAberto = document.querySelector('dialog[open]');
    if (dialogoAberto) {
        dialogoAberto.close();
        return true;
    }

    const telaAtiva = document.querySelector('.tela.ativa');
    if (telaAtiva && telaAtiva.id !== 'telaPrincipal') {
        mostrarTela('principal');
        return true;
    }

    return false;
};

function aplicarTema(tema) {
    const escuro = tema === 'escuro';
    document.body.classList.toggle('temaEscuro', escuro);
    alternarFundo.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
    alternarFundo.title = escuro ? 'Ativar tema claro' : 'Ativar tema escuro';
    alternarFundo.setAttribute('aria-pressed', String(escuro));
    localStorage.setItem('tema', escuro ? 'escuro' : 'claro');

    if (window.AndroidTema) {
        window.AndroidTema.aplicar(escuro);
    }
}

function alternarTema() {
    const temaAtual = document.body.classList.contains('temaEscuro') ? 'claro' : 'escuro';
    aplicarTema(temaAtual);
}

document.querySelectorAll('[data-fechar]').forEach(function (botao) {
    botao.addEventListener('click', () => document.getElementById(botao.dataset.fechar).close());
});

alternarFundo.addEventListener('click', alternarTema);
aplicarTema(localStorage.getItem('tema') || 'claro');

function fecharAoTocarFora(dialog, aoFechar) {
    dialog.addEventListener('click', function (event) {
        if (event.target === dialog) {
            dialog.close();
        }
    });
    dialog.addEventListener('close', function () {
        if (!document.querySelector('dialog[open]')) {
            document.body.classList.remove('modalAberto');
        }
    });
    if (aoFechar) {
        dialog.addEventListener('close', aoFechar);
    }
}

const observadorDeModais = new MutationObserver(function () {
    document.body.classList.toggle(
        'modalAberto',
        Boolean(document.querySelector('dialog[open]'))
    );
});

document.querySelectorAll('dialog').forEach(function (dialog) {
    observadorDeModais.observe(dialog, { attributes: true, attributeFilter: ['open'] });
});

fecharAoTocarFora(modal, function () {
    indicePisoEditando = null;
    fotosAndroidSelecionadas = [];
    fotosPreservadasNaEdicao = [];
    pisosForm.reset();
    salvarPiso.textContent = 'Adicionar';
});
fecharAoTocarFora(modalDetalhes);
fecharAoTocarFora(modalGaleria);
fecharAoTocarFora(modalVenda);
fecharAoTocarFora(modalOrcamento);
fecharAoTocarFora(modalConfirmacaoVenda, function () {
    if (resolverConfirmacaoVenda) {
        resolverConfirmacaoVenda(false);
        resolverConfirmacaoVenda = null;
    }
});

function pedirConfirmacaoVenda() {
    return new Promise(function (resolver) {
        resolverConfirmacaoVenda = resolver;
        modalConfirmacaoVenda.showModal();
    });
}

cancelarConfirmacaoVenda.addEventListener('click', function () {
    modalConfirmacaoVenda.close();
});

confirmarVenda.addEventListener('click', function () {
    if (resolverConfirmacaoVenda) {
        resolverConfirmacaoVenda(true);
        resolverConfirmacaoVenda = null;
    }
    modalConfirmacaoVenda.close();
});

function avisarFalhaFoto() {
    window.alert('Não foi possível carregar a foto.');
}

async function requisitar(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const headers = new Headers(options.headers || {});
    if (apiUrl && url.startsWith(apiUrl + '/')) {
        const token = localStorage.getItem('apiToken') || '';
        if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
    }
    try { return await fetch(url, { ...options, headers, signal: controller.signal }); }
    finally { clearTimeout(timer); }
}

const bancoFotos = new Promise(function (resolve, reject) {
    const pedido = indexedDB.open('fotos-pisos', 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('fotos');
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
});
bancoFotos.catch(() => {});
async function cacheFoto(chave, valor) {
    const banco = await bancoFotos;
    return new Promise(function (resolve, reject) {
        const tx = banco.transaction('fotos', valor === undefined ? 'readonly' : 'readwrite');
        const loja = tx.objectStore('fotos');
        const pedido = valor === undefined ? loja.get(chave) : loja.put(valor, chave);
        tx.oncomplete = () => resolve(pedido.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
function carregarFoto(imagem, foto) {
    const url = resolverUrlFoto(foto);
    cacheFoto(url).then(async function (local) {
        if (local) { imagem.src = local; return; }
        if (url.startsWith('data:')) { imagem.src = url; return; }
        const response = await requisitar(url);
        if (!response.ok) throw Error('Foto indisponível');
        const blob = await response.blob();
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
        });
        imagem.src = data; await cacheFoto(url, data);
    }).catch(() => { imagem.alt = 'Foto indisponível neste aparelho'; });
}

async function enviarFotoServidor(dataUrl) {
    const resposta = await requisitar(`${apiUrl}/api/foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: dataUrl })
    });
    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
    }
    const dados = await resposta.json();
    if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(dados.arquivo)) throw new Error('Resposta de foto inválida');
    const foto = `fotos/${dados.arquivo}`;
    await cacheFoto(resolverUrlFoto(foto), dataUrl);
    return foto;
}

function resolverUrlFoto(foto) {
    if (!foto) return '';
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(foto)) return foto;
    return apiUrl ? `${apiUrl.replace(/\/+$/, '')}/${foto.replace(/^\/+/, '')}` : foto;
}

window.onAndroidFilesSelected = async function (urls) {
    if (!Array.isArray(urls) || urls.length === 0) return;
    try {
        const arquivos = await Promise.all(urls.slice(0, 3).map(async function (url, index) {
            const resposta = await requisitar(url);
            if (!resposta.ok) throw new Error('Foto local indisponível');
            return new File([await resposta.blob()], `foto-${index + 1}.jpg`, { type: 'image/jpeg' });
        }));
        fotosAndroidSelecionadas = arquivos;
        mostrarPrevia(arquivos);
    } catch (erro) {
        avisarFalhaFoto();
    }
};

document.getElementById('selecionarFotos').addEventListener('click', () => fotosInput.click());

fotosInput.addEventListener('click', function (event) {
    if (window.AndroidFilePicker) {
        event.preventDefault();
        window.AndroidFilePicker.open();
    }
});

const cameraInput = document.createElement('input');
cameraInput.type = 'file';
cameraInput.accept = 'image/*';
cameraInput.setAttribute('capture', 'environment');
cameraInput.addEventListener('change', function () {
    if (!cameraInput.files.length) return;
    fotosAndroidSelecionadas = Array.from(cameraInput.files).slice(0, 3);
    mostrarPrevia(fotosAndroidSelecionadas);
    cameraInput.value = '';
});

abrirCamera.addEventListener('click', function () {
    if (window.AndroidCamera) {
        window.AndroidCamera.open();
    } else {
        cameraInput.click();
    }
});

function obterPisos() {
    return pisosEmMemoria;
}

function atualizarDadosLocais() {
    const state = DadosSeguros.project();
    pisosEmMemoria = state.pisos;
    if (pisoSelecionadoId) indicePisoSelecionado = pisosEmMemoria.findIndex(p => p.id === pisoSelecionadoId);
    vendasEmMemoria = state.vendas;
    document.getElementById('statusSync').textContent = DadosSeguros.status + (DadosSeguros.pending ? ` · ${DadosSeguros.pending} pendente(s)` : '');
    exibirPisos(); exibirRelatorio(); listarOrcamentosSalvos();
}
function persistirPisos(pisos) {
    DadosSeguros.savePisos(pisos);
    sincronizarPisos().catch(console.warn);
}
async function fotoParaServidor(foto) {
    if (foto.startsWith('fotos/')) return foto;
    if (foto.startsWith('localfoto:')) {
        const local = await cacheFoto(foto);
        if (!local) throw Error('Foto local não encontrada');
        return enviarFotoServidor(local);
    }
    if (foto.startsWith('data:')) return enviarFotoServidor(foto);
    if (foto.startsWith('https://fotoslocais.calculadordepisos/')) {
        const response = await requisitar(foto); if (!response.ok) throw Error('Foto não encontrada');
        const blob = await response.blob();
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
        });
        return enviarFotoServidor(data);
    }
    throw Error('Importe novamente esta foto para o servidor configurado.');
}
function sincronizarPisos() { return DadosSeguros.sync(apiUrl, requisitar, fotoParaServidor); }
function orientarConexao(error) {
    if (error.status === 401) {
        if (!configModal.open) document.getElementById('abrirConfiguracoes').click();
        document.getElementById('resultadoConexao').textContent = 'Servidor acessível. Informe a chave de acesso deste servidor e salve para sincronizar. Seus dados locais foram mantidos.';
        document.getElementById('chaveConfig').focus();
    }
}
async function carregarPisos() { try { await sincronizarPisos(); } catch (error) { orientarConexao(error); console.warn(error); } }
window.addEventListener('online', carregarPisos);

function exibirRelatorio() {
    const inicio = dataInicialRelatorio.value;
    const fim = dataFinalRelatorio.value;
    const busca = buscaRelatorio.value.trim().toLocaleLowerCase();
    const vendasFiltradas = vendasEmMemoria.filter(function (venda) {
        const data = venda.data.slice(0, 10);
        const texto = `${data} ${venda.itens.map(function (item) { return item.nome; }).join(' ')}`.toLocaleLowerCase();
        return (!inicio || data >= inicio) && (!fim || data <= fim) && (!busca || texto.includes(busca));
    });
    listaRelatorioVendas.innerHTML = '';
    if (!vendasFiltradas.length) { const empty = document.createElement('li'); empty.textContent = 'Nenhuma venda neste período.'; listaRelatorioVendas.append(empty); }
    let total = 0;
    vendasFiltradas.forEach(function (venda) {
        if (!venda.cancelada) total += Number(venda.total) || 0;
        const linha = document.createElement('li');
        linha.className = 'itemRelatorio';
        linha.textContent = `${new Date(venda.data).toLocaleString('pt-BR')} - ${venda.itens.map(function (item) {
            return `${item.nome} (${item.quantidade} ${item.unidade})`;
        }).join(', ')} - ${formatarMoeda(venda.total)}`;
        if (venda.cancelada) { linha.append(' · CANCELADA'); }
        else if (!venda.pendente && venda.itens.every(i => i.pisoId && i.pecas)) {
            const cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.className = 'botaoSecundario'; cancelar.textContent = 'Cancelar venda';
            cancelar.addEventListener('click', () => {
                if (!confirm('Cancelar esta venda e devolver as peças ao estoque?')) return;
                DadosSeguros.enqueue([{id:DadosSeguros.id(),tipo:'cancelarVenda',vendaId:venda.id}]); sincronizarPisos().catch(console.warn);
            }); linha.appendChild(cancelar);
        }
        if (venda.pendente) linha.append(' · Aguardando sincronização');
        listaRelatorioVendas.appendChild(linha);
    });
    totalVendasRelatorio.textContent = `${vendasFiltradas.length} ${vendasFiltradas.length === 1 ? 'venda' : 'vendas'}`;
    valorVendasRelatorio.textContent = formatarMoeda(total);
}

function abrirDetalhesLote(pisoId, modo) {
    const index = obterPisos().findIndex(p => p.id === pisoId);
    if (index < 0) return;
    mostrarDetalhesPiso(index, modo);
}

let origemLoteId = null;
const modalLote = document.getElementById('modalLote');
document.getElementById('loteForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const pisos = obterPisos();
    const origem = pisos.find(p => p.id === origemLoteId);
    if (!origem) return window.alert('Modelo não encontrado. Reabra o cadastro.');
    const bitola = document.getElementById('bitolaLote').value;
    const tonalidade = document.getElementById('tonalidadeLote').value;
    const modeloId = origem.modeloId || origem.id;
    if (pisos.some(p => (p.modeloId || p.id) === modeloId && Number(p.bitola) === Number(bitola) && Number(p.tonalidade) === Number(tonalidade))) {
        window.alert('Já existe um lote com essa bitola e tonalidade neste modelo.');
        return;
    }
    try {
        persistirPisos([...pisos, {...origem, id: DadosSeguros.id(), modeloId, version: 0,
            bitola, tonalidade, estoque: 0, pecasAbertas: 0, ativo: true}]);
        modalLote.close();
        exibirPisos();
    } catch (error) { window.alert(error.message); }
});

function abrirDetalhesPiso(event, modo) {
    if (event.target.closest('button')) {
        return;
    }

    const item = event.target.closest('li');
    if (item) {
        mostrarDetalhesPiso(Number(item.dataset.index), modo);
    }
}

function mostrarDetalhesPiso(index, modo) {
        const piso = obterPisos()[index];
        if (!piso) {
            return;
        }
        indicePisoSelecionado = index;
        pisoSelecionadoId = piso.id;
        editarPiso.style.display = modo === 'cadastro' ? '' : 'none';
        excluirPiso.style.display = modo === 'cadastro' ? '' : 'none';
        excluirPiso.textContent = piso.ativo === false ? 'Ativar piso' : 'Inativar piso';
        excluirPiso.title = piso.ativo === false ? 'Ativar piso' : 'Inativar piso';
        venderPiso.style.display = modo === 'orcamento' ? '' : 'none';
        modalDetalhes.showModal();
        galeriaDetalhes.replaceChildren();
        detalhesPiso.textContent = [
            `Nome: ${piso.nome}`,
            `Bitola: ${piso.bitola ?? 'Não informado'}`,
            `Tonalidade: ${piso.tonalidade ?? 'Não informado'}`,
            `Altura: ${piso.altura}`,
            `Largura: ${piso.largura}`,
            `Cor: ${piso.cor}`,
            `Textura: ${piso.textura}`,
            `Resistência: ${piso.resistencia}`,
            `Metros por caixa: ${piso.caixa ?? 'Não informado'}`,
            `Peças por caixa: ${piso.pecasPorCaixa ?? 'Não informado'}`,
            `Preço por m²: ${formatarMoeda(piso.preco)}`,
            `Estoque: ${piso.estoque ?? 0} caixas${Number(piso.pecasAbertas ?? 0) > 0 ? ` e ${piso.pecasAbertas} peças` : ''}`
        ].join('\n');
        exibirGaleria(galeriaDetalhes, piso.fotos);
        venderPiso.disabled = obterTotalPecas(piso) <= 0;
}

listaPisosCadastro.addEventListener('click', function (event) {
    abrirDetalhesPiso(event, 'cadastro');
});

listaPisosOrcamento.addEventListener('click', function (event) {
    abrirDetalhesPiso(event, 'orcamento');
});

function exibirPisos() {
    const pisos = obterPisos();

    renderizarListaPisos(listaPisosCadastro, buscaPisos.value, !mostrarInativos);
    renderizarListaPisos(listaPisosOrcamento, buscaPisosOrcamento.value, true);
}

function renderizarListaPisos(lista, termoBusca, somenteAtivos) {
    lista.innerHTML = '';
    const pisos = obterPisos();
    const termo = termoBusca.trim().toLocaleLowerCase();
    const modelosExibidos = new Set();
    const pisosOrdenados = pisos.map((piso, index) => ({piso, index}))
        .sort((a, b) => String(a.piso.nome ?? '').localeCompare(String(b.piso.nome ?? ''), 'pt-BR', {sensitivity: 'base', numeric: true}));
    pisosOrdenados.forEach(function ({piso, index}) {
        if (somenteAtivos && piso.ativo === false) {
            return;
        }
        const tamanho = `${piso.altura ?? ''}x${piso.largura ?? ''}`;
        const textoBusca = `${piso.nome} ${piso.cor ?? ''} ${piso.altura ?? ''} ${piso.largura ?? ''} ${tamanho}`.toLocaleLowerCase();
        if (termo && !textoBusca.includes(termo)) {
            return;
        }
        const modeloId = piso.modeloId || piso.id;
        if (modelosExibidos.has(modeloId)) return;
        modelosExibidos.add(modeloId);
        const lotes = pisos.filter(p => (p.modeloId || p.id) === modeloId && (!somenteAtivos || p.ativo !== false));
        const item = document.createElement('li');
        item.dataset.index = index;
        const card = document.createElement('div');
        card.className = 'pisoCard';
        const informacoes = document.createElement('div');
        informacoes.className = 'pisoInformacoes';
        card.appendChild(informacoes);
        exibirGaleria(card, piso.fotos);
        item.appendChild(card);
        const listaLotes = document.createElement('div');
        listaLotes.className = 'listaLotes';
        lotes.forEach(lote => {
            const linha = document.createElement('div');
            linha.className = 'linhaLote';
            const resumo = document.createElement('span');
            resumo.textContent = `Bitola ${lote.bitola ?? '-'} · Tonalidade ${lote.tonalidade ?? '-'} · ${lote.estoque || 0} caixas e ${lote.pecasAbertas || 0} peças · ${Number(calcularAreaTotalPiso(lote)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m²${lote.ativo === false ? ' · INATIVO' : Number(lote.estoqueMinimo) > 0 && obterTotalPecas(lote) <= Number(lote.estoqueMinimo) * Number(lote.pecasPorCaixa) ? ' · ESTOQUE BAIXO' : ''}`;
            const abrir = document.createElement('button');
            abrir.type = 'button';
            abrir.className = 'botaoSecundario';
            abrir.textContent = lista === listaPisosCadastro ? 'Editar lote' : 'Escolher lote';
            abrir.addEventListener('click', () => {
                abrirDetalhesLote(lote.id, lista === listaPisosCadastro ? 'cadastro' : 'orcamento');
                if (lista === listaPisosCadastro) editarPiso.click();
            });
            linha.append(resumo, abrir);
            listaLotes.append(linha);
        });
        if (lista === listaPisosCadastro) {
            const adicionar = document.createElement('button');
            adicionar.type = 'button';
            adicionar.textContent = 'Adicionar lote';
            adicionar.addEventListener('click', () => {
                origemLoteId = piso.id;
                document.getElementById('loteForm').reset();
                document.getElementById('modeloLote').textContent = piso.nome;
                modalLote.showModal();
            });
            listaLotes.append(adicionar);
        }
        card.append(listaLotes);
        informacoes.textContent = `${piso.nome} · ${formatarMoeda(piso.preco)}/m² · ${lotes.length} ${lotes.length === 1 ? 'lote' : 'lotes'} · ${lotes.reduce((total, lote) => total + Number(calcularAreaTotalPiso(lote)), 0).toFixed(2)} m² em estoque`;
        lista.appendChild(item);
    });
    if (!lista.children.length) { const empty = document.createElement('li'); empty.className = 'estadoVazio'; empty.textContent = termoBusca ? 'Nenhum piso encontrado. Tente outro termo.' : 'Nenhum piso cadastrado. Adicione o primeiro produto em Cadastro.'; lista.append(empty); }
}

function calcularAreaTotalPiso(piso) {
    const metrosPorCaixa = Number(piso?.caixa ?? 0);
    const pecasAbertas = Number(piso?.pecasAbertas ?? 0);
    const estoque = Number(piso?.estoque ?? 0);
    const areaPorPeca = calcularAreaPorPeca(piso);
    return (estoque * metrosPorCaixa + pecasAbertas * areaPorPeca ).toFixed(2);
}

function exibirGaleria(container, fotos) {
    const fotosValidas = Array.isArray(fotos) ? fotos.filter(Boolean).slice(0, 3) : [];
    if (fotosValidas.length === 0) {
        return;
    }

    const galeria = document.createElement('div');
    galeria.className = 'galeria';
    const imagem = document.createElement('img');
    carregarFoto(imagem, fotosValidas[0]);
    imagem.alt = 'Foto do piso';
    imagem.loading = 'eager';
    imagem.addEventListener('click', function (event) {
        event.stopPropagation();
        abrirGaleria(fotosValidas);
    });
    galeria.appendChild(imagem);
    container.appendChild(galeria);
}

function abrirGaleria(fotos) {
    galeriaAmpliada.innerHTML = '';
    fotos.slice(0, 3).forEach(function (foto) {
        const imagem = document.createElement('img');
        carregarFoto(imagem, foto);
        imagem.alt = 'Foto ampliada do piso';
        galeriaAmpliada.appendChild(imagem);
    });
    modalGaleria.showModal();
}

excluirPiso.addEventListener('click', function () {
    const pisos = obterPisos();
    if (indicePisoSelecionado === null || !pisos[indicePisoSelecionado]) {
        return;
    }

    pisos[indicePisoSelecionado] = { ...pisos[indicePisoSelecionado], ativo: pisos[indicePisoSelecionado].ativo === false };
    persistirPisos(pisos);
    indicePisoSelecionado = null;
    modalDetalhes.close();
    exibirPisos();
});

editarPiso.addEventListener('click', function () {
    const piso = obterPisos()[indicePisoSelecionado];
    if (!piso) {
        return;
    }
    indicePisoEditando = indicePisoSelecionado;
    pisoEditandoId = piso.id;
    pisoEditandoVersion = piso.version;
    fotosPreservadasNaEdicao = Array.isArray(piso.fotos) ? piso.fotos.slice() : [];
    mostrarFotosSalvas();
    modalDetalhes.close();

    Object.keys(piso).forEach(function (campo) {
        const input = pisosForm.elements[campo];
        if (input && campo !== 'fotos') {
            input.value = piso[campo] ?? '';
        }
    });

    fotosInput.value = '';

    salvarPiso.textContent = 'Salvar alterações';
    modal.showModal();
});

venderPiso.addEventListener('click', function () {
    const pisos = obterPisos();
    const piso = pisos[indicePisoSelecionado];

    if (!piso || obterTotalPecas(piso) <= 0) {
        return;
    }

    modalDetalhes.close();
    produtoVenda.textContent = `${piso.nome} - Bitola: ${piso.bitola ?? '-'} - Tonalidade: ${piso.tonalidade ?? '-'}`;
    precoUnitario.textContent = formatarMoeda(piso.preco);
    areaPorPeca.textContent = `${calcularAreaPorPeca(piso).toFixed(4)} m²`;
    metrosPorCaixa.textContent = `${Number(piso.caixa ?? 0).toFixed(2)} m²`;
    unidadeVenda.value = 'caixas';
    quantidadeVenda.value = '';
    atualizarLimiteQuantidade();
    atualizarValorTotal();
    modalVenda.showModal();
});

function formatarMoeda(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function calcularAreaPorPeca(piso) {
    return (Number(piso?.altura ?? 0) * Number(piso?.largura ?? 0)) / 10000;
}

function calcularArgamassaNecessaria(metros) {
    const argamassaPorMetro = 0.33;
    return Math.ceil(metros * argamassaPorMetro);
}

function obterPrecoVenda(piso) {
    const preco = Number(piso?.preco ?? 0);
    return unidadeVenda.value === 'pecas' ? preco * 1.2 : preco;
}

function obterTotalPecas(piso) {
    return (Number(piso?.estoque ?? 0) * Number(piso?.pecasPorCaixa ?? 1)) + Number(piso?.pecasAbertas ?? 0);
}

function obterPecasReservadas(indicePiso) {
    return itensOrcamento
        .filter(function (item) {
            return item.pisoId === obterPisos()[indicePiso]?.id;
        })
        .reduce(function (total, item) {
            return total + item.pecasReservadas;
        }, 0);
}

function obterEstoqueDisponivel(piso, indicePiso) {
    return obterTotalPecas(piso) - obterPecasReservadas(indicePiso);
}

function atualizarLimiteQuantidade() {
    const piso = obterPisos()[indicePisoSelecionado];
    quantidadeVenda.max = unidadeVenda.value === 'caixas'
        ? Math.floor(obterEstoqueDisponivel(piso, indicePisoSelecionado) / Number(piso?.pecasPorCaixa ?? 1))
        : obterEstoqueDisponivel(piso, indicePisoSelecionado);
    quantidadeVenda.labels[0].textContent = unidadeVenda.value === 'caixas'
        ? 'Quantidade de caixas:'
        : 'Quantidade de peças:';
}

function atualizarValorTotal() {
    const piso = obterPisos()[indicePisoSelecionado];
    const quantidade = Number(quantidadeVenda.value) || 0;
    const metros = unidadeVenda.value === 'caixas'
        ? quantidade * Number(piso?.caixa ?? 0)
        : quantidade * calcularAreaPorPeca(piso);
    metrosVendidos.textContent = `${metros.toFixed(2)} m²`;
    precoUnitario.textContent = formatarMoeda(obterPrecoVenda(piso));
    valorTotal.textContent = formatarMoeda(metros * obterPrecoVenda(piso));
}

quantidadeVenda.addEventListener('input', atualizarValorTotal);
unidadeVenda.addEventListener('change', function () {
    atualizarLimiteQuantidade();
    atualizarValorTotal();
});

vendaForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const pisos = obterPisos();
    const piso = pisos[indicePisoSelecionado];
    const quantidade = Number(quantidadeVenda.value);
    const vendendoPecas = unidadeVenda.value === 'pecas';

    const pecasPorCaixa = Number(piso?.pecasPorCaixa ?? 1);
    const estoqueDisponivel = obterEstoqueDisponivel(piso, indicePisoSelecionado);
    const pecasReservadas = vendendoPecas ? quantidade : quantidade * pecasPorCaixa;
    if (!piso || !Number.isInteger(quantidade) || quantidade <= 0 || pecasReservadas > estoqueDisponivel) {
        quantidadeVenda.setCustomValidity('A quantidade deve estar disponível no estoque.');
        quantidadeVenda.reportValidity();
        return;
    }

    quantidadeVenda.setCustomValidity('');
    const metros = unidadeVenda.value === 'caixas'
        ? quantidade * Number(piso.caixa ?? 0)
        : quantidade * calcularAreaPorPeca(piso);
    itensOrcamento.push({
        indicePiso: indicePisoSelecionado,
        pisoId: piso.id,
        nome: piso.nome,
        bitola: piso.bitola,
        tonalidade: piso.tonalidade,
        unidade: unidadeVenda.value,
        quantidade,
        pecasReservadas,
        metros,
        preco: obterPrecoVenda(piso),
        total: Math.round((metros * obterPrecoVenda(piso) + Number.EPSILON) * 100) / 100
    });
    exibirOrcamento();
    modalVenda.close();
});

function exibirOrcamento() {
    salvarRascunho();
    listaOrcamento.innerHTML = '';
    if (!itensOrcamento.length) { const empty = document.createElement('li'); empty.textContent = 'Adicione produtos para montar um orçamento.'; listaOrcamento.append(empty); }
    let metros = 0;
    let valor = 0;

    itensOrcamento.forEach(function (item, index) {
        metros += item.metros;
        valor += item.total;
        const linha = document.createElement('li');
        linha.textContent = `${item.nome} - ${item.bitola ?? '-'}/${item.tonalidade ?? '-'} - ${item.quantidade} ${item.unidade} - ${item.metros.toFixed(2)} m² - ${formatarMoeda(item.total)} `;
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.textContent = 'Remover';
        remover.className = 'botaoSecundario';
        remover.addEventListener('click', function () {
            itensOrcamento.splice(index, 1);
            exibirOrcamento();
        });
        linha.appendChild(remover);
        listaOrcamento.appendChild(linha);
    });

    metragemOrcamento.textContent = `${metros.toFixed(2)} m²`;
    valorOrcamento.textContent = formatarMoeda(valor);
    quantidadeArgamassa.textContent = `${calcularArgamassaNecessaria(metros)} sacos`;
    contadorOrcamento.textContent = `${itensOrcamento.length} ${itensOrcamento.length === 1 ? 'item' : 'itens'}`;
    finalizarOrcamento.disabled = itensOrcamento.length === 0;
    limparOrcamento.disabled = itensOrcamento.length === 0;
}

limparOrcamento.addEventListener('click', function () {
    itensOrcamento = [];
    orcamentoAtualId = null;
    exibirOrcamento();
});

let finalizando = false;
finalizarOrcamento.addEventListener('click', async function () {
    if (finalizando || !itensOrcamento.length) return;
    finalizando = true;
    try {
        if (!await pedirConfirmacaoVenda()) return;
        const needed = {};
        for (const item of itensOrcamento) {
            if (!item.pisoId) throw Error('Reabra os produtos deste orçamento antigo.');
            const piso = obterPisos().find(p => p.id === item.pisoId);
            if (!piso || piso.ativo === false) throw Error('Produto indisponível. Revise o orçamento.');
            needed[piso.id] = (needed[piso.id] || 0) + item.quantidade * (item.unidade === 'caixas' ? Number(piso.pecasPorCaixa) : 1);
            if (needed[piso.id] > obterTotalPecas(piso)) throw Error('Estoque insuficiente: ' + piso.nome);
        }
        const operation = {id:DadosSeguros.id(), tipo:'venda', data:new Date().toISOString(),
            cliente:document.getElementById('clienteOrcamento').value.trim(), itens:DadosSeguros.copy(itensOrcamento)};
        DadosSeguros.enqueue([operation], true);
        orcamentoAtualId = null;
        itensOrcamento = []; salvarRascunho(); exibirOrcamento(); modalOrcamento.close();
        mostrarTela('orcamento');
        await sincronizarPisos();
    } catch (error) { window.alert(error.message); }
    finally { finalizando = false; }
});

abrirFormulario.addEventListener('click', function () {
    indicePisoEditando = null;
    fotosAndroidSelecionadas = [];
    fotosPreservadasNaEdicao = [];
    pisosForm.reset();
    previaFotos.innerHTML = '';
    mostrarFotosSalvas();
    salvarPiso.textContent = 'Adicionar';
    modal.showModal();
});

abrirOrcamento.addEventListener('click', function () {
    exibirOrcamento();
    modalOrcamento.showModal();
});

pisosForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const dados = new FormData(pisosForm);
    if (salvarPiso.disabled) return;
    salvarPiso.disabled = true;
    salvarPiso.textContent = 'Salvando…';
    const pisos = obterPisos().slice();
    const fotosSelecionadas = fotosAndroidSelecionadas.length > 0
        ? fotosAndroidSelecionadas
        : Array.from(pisosForm.elements.fotos.files);
    pisosForm.elements.fotos.setCustomValidity('');
    const indice = indicePisoEditando === null ? null : pisos.findIndex(p => p.id === pisoEditandoId);
    if (indice === -1) { salvarPiso.disabled = false; window.alert('Produto não encontrado. Reabra o cadastro.'); return; }
    const fotosAtuais = indice === null
        ? []
        : fotosPreservadasNaEdicao;
    lerFotos(fotosSelecionadas.slice(0, 3)).then(function (fotos) {
        const fotosFinais = fotos.length > 0
            ? fotosAtuais.concat(fotos).slice(-3)
            : fotosAtuais;
        const piso = new Piso(
            dados.get('nome').toUpperCase(),
            dados.get('bitola'),
            dados.get('tonalidade'),
            fotosFinais,
            dados.get('altura'),
            dados.get('largura'),
            dados.get('cor'),
            dados.get('textura'),
            dados.get('resistencia'),
            dados.get('caixa'),
            dados.get('pecasPorCaixa'),
            dados.get('preco'),
            dados.get('estoque'),
            dados.get('pecasAbertas')
        );

        piso.id = indice === null ? DadosSeguros.id() : pisos[indice].id;
        piso.modeloId = indice === null ? piso.id : (pisos[indice].modeloId || pisos[indice].id);
        if (pisos.some(p => p.id !== piso.id && (p.modeloId || p.id) === piso.modeloId && Number(p.bitola) === Number(piso.bitola) && Number(p.tonalidade) === Number(piso.tonalidade))) {
            throw new Error('Já existe um lote com essa bitola e tonalidade neste modelo.');
        }
        piso.version = indice === null ? 0 : pisoEditandoVersion;
        piso.ativo = indice === null ? true : pisos[indice].ativo;
        piso.estoqueMinimo = Number(dados.get('estoqueMinimo')) || 0;
        if (indice === null) {
            pisos.push(piso);
        } else {
            pisos[indice] = piso;
        }
        persistirPisos(pisos);

        pisosForm.reset();
        fotosAndroidSelecionadas = [];
        fotosPreservadasNaEdicao = [];
        indicePisoEditando = null;
        salvarPiso.textContent = 'Adicionar';
        modal.close();
        exibirPisos();
        mostrarTela('cadastro');
    }).catch(function (error) {
        window.alert(error.message || 'Não foi possível salvar. Seus dados continuam no formulário.');
    }).finally(function () { salvarPiso.disabled = false; salvarPiso.textContent = indicePisoEditando === null ? 'Adicionar' : 'Salvar alterações'; });
});

function lerFotos(fotos) {
    return Promise.all(fotos.map(function (foto) {
        return new Promise(function (resolve, reject) {
            if (typeof foto === 'string') {
                processarImagem(foto, resolve, reject);
                return;
            }
            const leitor = new FileReader();
            leitor.addEventListener('load', function () {
                processarImagem(leitor.result, resolve, reject);
            });
            leitor.addEventListener('error', reject);
            leitor.readAsDataURL(foto);
        });
    })).then(async function (dataUrls) {
        if (!apiUrl) {
            return Promise.all(dataUrls.map(async function (data, index) {
                const chave = `localfoto:${Date.now()}-${index}-${Math.random()}`;
                await cacheFoto(chave, data);
                return chave;
            }));
        }
        const resultados = [];
        for (const dataUrl of dataUrls) {
            try {
                resultados.push(await enviarFotoServidor(dataUrl));
            } catch (erro) {
                console.warn('Falha ao enviar foto ao servidor; usando local.', erro);
                const chave = `localfoto:${crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()}`;
                await cacheFoto(chave, dataUrl);
                resultados.push(chave);
            }
        }
        return resultados;
    });
}

function processarImagem(dataUrl, resolve, reject) {
    const imagem = new Image();
    imagem.addEventListener('load', function () {
        const limite = 1000;
        const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imagem.width * escala));
        canvas.height = Math.max(1, Math.round(imagem.height * escala));
        canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
    });
    imagem.addEventListener('error', reject);
    imagem.src = dataUrl;
}

buscaPisos.addEventListener('input', exibirPisos);
buscaPisosOrcamento.addEventListener('input', exibirPisos);
dataInicialRelatorio.addEventListener('input', exibirRelatorio);
dataFinalRelatorio.addEventListener('input', exibirRelatorio);
buscaRelatorio.addEventListener('input', exibirRelatorio);

alternarInativos.addEventListener('click', function () {
    mostrarInativos = !mostrarInativos;
    alternarInativos.setAttribute('aria-pressed', String(mostrarInativos));
    alternarInativos.textContent = mostrarInativos ? 'Mostrar somente ativos' : 'Mostrar inativos';
    exibirPisos();
});

function atualizarAlturaDisponivel() {
    const altura = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--altura-disponivel', `${altura}px`);
    const campoAtivo = document.activeElement;
    if (campoAtivo && document.body.classList.contains('modalAberto')) {
        window.setTimeout(function () {
            campoAtivo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 80);
    }
}

atualizarAlturaDisponivel();
window.addEventListener('resize', atualizarAlturaDisponivel);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', atualizarAlturaDisponivel);
}

function mostrarFotosSalvas() {
    const container = document.getElementById('fotosSalvas'); container.replaceChildren();
    fotosPreservadasNaEdicao.forEach((foto, index) => {
        const card = document.createElement('div'); const image = document.createElement('img');
        image.alt = index === 0 ? 'Foto de capa' : 'Foto do piso'; carregarFoto(image, foto); card.append(image);
        const cover = document.createElement('button'); cover.type = 'button'; cover.className = 'botaoSecundario';
        cover.textContent = index === 0 ? 'Capa' : 'Usar como capa'; cover.disabled = index === 0;
        cover.onclick = () => { fotosPreservadasNaEdicao.splice(index, 1); fotosPreservadasNaEdicao.unshift(foto); mostrarFotosSalvas(); };
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'botaoSecundario'; remove.textContent = 'Remover foto';
        remove.onclick = () => { fotosPreservadasNaEdicao.splice(index, 1); mostrarFotosSalvas(); };
        card.append(cover, remove); container.append(card);
    });
}
function salvarRascunho() {
    DadosSeguros.draftSave({itens:itensOrcamento,cliente:document.getElementById('clienteOrcamento').value,
        telefone:document.getElementById('telefoneOrcamento').value,quoteId:orcamentoAtualId});
}
let orcamentoAtualId = DadosSeguros.draft.quoteId || null;
document.getElementById('clienteOrcamento').value = DadosSeguros.draft.cliente || '';
document.getElementById('telefoneOrcamento').value = DadosSeguros.draft.telefone || '';
['clienteOrcamento','telefoneOrcamento'].forEach(id => document.getElementById(id).addEventListener('input', salvarRascunho));
const modalOrcamentosSalvos = document.getElementById('modalOrcamentosSalvos');
fecharAoTocarFora(modalOrcamentosSalvos);
document.getElementById('abrirOrcamentosSalvos').onclick = () => {
    listarOrcamentosSalvos();
    modalOrcamentosSalvos.showModal();
};
function listarOrcamentosSalvos() {
    const list = document.getElementById('orcamentosSalvos'); list.replaceChildren();
    const quotes = DadosSeguros.project().orcamentos;
    if (!quotes.length) { const li = document.createElement('li'); li.textContent = 'Nenhum orçamento salvo.'; list.append(li); }
    quotes.forEach(quote => {
        const li = document.createElement('li');
        li.textContent = `${quote.cliente} · ${quote.itens.length} item(ns) · ${formatarMoeda(quote.itens.reduce((s,i) => s + Number(i.total), 0))} `;
        const open = document.createElement('button'); open.type = 'button'; open.className = 'botaoSecundario'; open.textContent = 'Abrir';
        open.onclick = () => {
            if (itensOrcamento.length && !confirm('Substituir o rascunho atual por este orçamento?')) return;
            itensOrcamento = DadosSeguros.copy(quote.itens); orcamentoAtualId = quote.id;
            document.getElementById('clienteOrcamento').value = quote.cliente;
            document.getElementById('telefoneOrcamento').value = quote.telefone || '';
            salvarRascunho();
            exibirOrcamento();
            modalOrcamentosSalvos.close();
            modalOrcamento.showModal();
        }; li.append(open); list.append(li);
    });
}
document.getElementById('salvarOrcamento').onclick = () => {
    const cliente = document.getElementById('clienteOrcamento').value.trim();
    if (!cliente || !itensOrcamento.length) { alert('Informe o cliente e adicione pelo menos um produto.'); return; }
    const old = DadosSeguros.project().orcamentos.find(q => q.id === orcamentoAtualId);
    const quote = {id:old?.id || DadosSeguros.id(), cliente, telefone:document.getElementById('telefoneOrcamento').value.trim(), itens:DadosSeguros.copy(itensOrcamento)};
    try { DadosSeguros.enqueue([{id:DadosSeguros.id(),tipo:'orcamento',baseVersion:old?.version || 0,orcamento:quote}]);
        orcamentoAtualId = quote.id; salvarRascunho(); sincronizarPisos().catch(console.warn);
    } catch (error) { alert(error.message); }
};
function resumoOrcamentoTexto() {
    return ['ORÇAMENTO — Calculador de Pisos', document.getElementById('clienteOrcamento').value,
        document.getElementById('telefoneOrcamento').value,
        ...itensOrcamento.map(i => `${i.nome}: ${i.quantidade} ${i.unidade} — ${formatarMoeda(i.total)}`),
        'Total: ' + formatarMoeda(itensOrcamento.reduce((s,i) => s + i.total, 0)),
        'Valores e disponibilidade sujeitos à confirmação.'].filter(Boolean).join('\n');
}
async function baixarArquivo(blob, name) {
    if (window.AndroidSalvarArquivo) {
        if (!window.AndroidSalvarArquivo.iniciar(name, blob.type || 'application/octet-stream')) throw Error('Aguarde a exportação atual.');
        try {
            for (let offset = 0; offset < blob.size; offset += 192 * 1024) {
                const bytes = new Uint8Array(await blob.slice(offset, offset + 192 * 1024).arrayBuffer());
                let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
                if (!window.AndroidSalvarArquivo.parte(btoa(binary))) throw Error('Falha ao preparar o arquivo.');
            }
            await new Promise((resolve, reject) => {
                window.onAndroidExportCompleted = success => { window.onAndroidExportCompleted = null; success ? resolve() : reject(Error('Exportação cancelada ou não concluída.')); };
                window.AndroidSalvarArquivo.concluir();
            });
        } catch (error) { window.AndroidSalvarArquivo.cancelar(); throw error; }
        return;
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
document.getElementById('compartilharOrcamento').onclick = async () => {
    const text = resumoOrcamentoTexto();
    try { if (navigator.share) await navigator.share({title:'Orçamento',text});
        else if (window.AndroidCompartilhar) window.AndroidCompartilhar.texto(text);
        else await baixarArquivo(new Blob([text], {type:'text/plain;charset=utf-8'}),'orcamento.txt');
    } catch (error) { if (error.name !== 'AbortError') alert('Não foi possível compartilhar.'); }
};
document.getElementById('imprimirOrcamento').onclick = () => {
    document.getElementById('orcamentoImpressao').textContent = resumoOrcamentoTexto();
    if (window.AndroidImprimir) window.AndroidImprimir.open(); else window.print();
};
const configModal = document.getElementById('modalConfiguracoes');
fecharAoTocarFora(configModal);
document.getElementById('abrirConfiguracoes').onclick = () => {
    document.getElementById('servidorConfig').value = apiUrl;
    document.getElementById('chaveConfig').value = localStorage.getItem('apiToken') || '';
    const history = document.getElementById('historicoEstoque'); history.replaceChildren();
    DadosSeguros.project().movimentos.slice(-50).reverse().forEach(m => {
        const li = document.createElement('li'); li.textContent = `${new Date(m.data).toLocaleString('pt-BR')} · ${m.nome}: ${m.pecas > 0 ? '+' : ''}${m.pecas} peças · ${m.motivo}`; history.append(li);
    });
    configModal.showModal();
};
document.getElementById('configForm').onsubmit = async event => {
    event.preventDefault();
    const raw = document.getElementById('servidorConfig').value.trim().replace(/\/+$/, '');
    try {
        if (raw) { const url = new URL(raw); if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Informe somente http(s)://servidor:porta.'); }
        if (raw !== apiUrl && DadosSeguros.pending) throw Error('Sincronize ou exporte e descarte as pendências antes de trocar de servidor.');
        apiUrl = raw; localStorage.setItem(chaveApi,raw); localStorage.setItem('apiToken',document.getElementById('chaveConfig').value.trim());
        await sincronizarPisos(); document.getElementById('resultadoConexao').textContent = DadosSeguros.status;
    } catch (error) { document.getElementById('resultadoConexao').textContent = error.message; }
};
document.getElementById('testarConexao').onclick = async () => {
    try {
        const url = document.getElementById('servidorConfig').value.trim().replace(/\/+$/, '');
        if (!/^https?:\/\//.test(url)) throw Error('Informe um endereço http(s) válido.');
        const token = document.getElementById('chaveConfig').value.trim();
        await DadosSeguros.responseJson(await requisitar(`${url}/api/state`, {headers:{Authorization:'Bearer '+token}})); document.getElementById('resultadoConexao').textContent = 'Conexão e chave de acesso válidas.'; }
    catch (error) { document.getElementById('resultadoConexao').textContent = error.message; }
};
document.getElementById('sincronizarAgora').onclick = () => sincronizarPisos().catch(error => { document.getElementById('resultadoConexao').textContent = error.message; orientarConexao(error); });
async function exportarDadosLocais() {
    const value = DadosSeguros.raw;
    const references = new Set();
    function collect(node) {
        if (typeof node === 'string' && (node.startsWith('localfoto:') || node.startsWith('fotos/'))) references.add(node);
        else if (Array.isArray(node)) node.forEach(collect);
        else if (node && typeof node === 'object') Object.values(node).forEach(collect);
    }
    collect(value); value.localPhotos = {};
    for (const reference of references) {
        const photo = await cacheFoto(resolverUrlFoto(reference));
        if (photo) value.localPhotos[reference] = photo;
    }
    await baixarArquivo(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),'dados-locais-'+Date.now()+'.json');
}
document.getElementById('importarLocal').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
        if (DadosSeguros.pending) throw Error('Resolva as pendências atuais antes de importar.');
        if (file.size > 256 * 1024 * 1024) throw Error('Arquivo muito grande.');
        const value = JSON.parse(await file.text());
        if (!confirm('Importar dados locais e pendências deste arquivo? A sincronização será manual após a revisão.')) return;
        for (const [reference, photo] of Object.entries(value.localPhotos || {})) {
            if (typeof photo !== 'string' || !photo.startsWith('data:image/')) throw Error('Foto inválida na exportação');
            await cacheFoto(resolverUrlFoto(reference), photo);
        }
        delete value.localPhotos; DadosSeguros.importLocal(value);
        itensOrcamento = DadosSeguros.draft.itens || []; orcamentoAtualId = DadosSeguros.draft.quoteId || null;
        document.getElementById('clienteOrcamento').value = DadosSeguros.draft.cliente || '';
        document.getElementById('telefoneOrcamento').value = DadosSeguros.draft.telefone || '';
        exibirOrcamento();
    } catch (error) { alert(error.message); }
    finally { event.target.value = ''; }
};
document.getElementById('exportarLocal').onclick = () => exportarDadosLocais().catch(error => alert(error.message));
document.getElementById('recarregarServidor').onclick = async () => {
    if (!confirm('Exportar uma cópia local e descartar as alterações pendentes para recarregar os dados do servidor?')) return;
    try { await exportarDadosLocais(); const remote = await DadosSeguros.responseJson(await requisitar(`${apiUrl}/api/state`));
        DadosSeguros.reset(remote); itensOrcamento = []; orcamentoAtualId = null; exibirOrcamento();
    } catch (error) { alert(error.message); }
};
document.getElementById('backupServidor').onclick = async () => {
    try { const response = await requisitar(`${apiUrl}/api/backup`); if (!response.ok) throw Error('Falha no backup. Verifique a conexão e a chave.');
        await baixarArquivo(await response.blob(),'backup-pisos-'+Date.now()+'.zip');
    } catch (error) { alert(error.message); }
};
document.getElementById('restaurarArquivo').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
        if (DadosSeguros.pending) throw Error('Sincronize ou exporte as pendências antes de restaurar.');
        if (!confirm('Substituir os dados do servidor por este backup? Uma cópia de segurança será criada antes da restauração.')) return;
        const current = await DadosSeguros.responseJson(await requisitar(`${apiUrl}/api/state`));
        const state = await DadosSeguros.responseJson(await requisitar(`${apiUrl}/api/restore`,{method:'POST',headers:{'Content-Type':'application/zip','If-Match':String(current.revision)},body:file}));
        DadosSeguros.reset(state); itensOrcamento = []; orcamentoAtualId = null; exibirOrcamento();
    } catch (error) { alert(error.message); }
    finally { event.target.value = ''; }
};

DadosSeguros.onChange(atualizarDadosLocais);
atualizarDadosLocais();
exibirOrcamento();
carregarPisos();

fotosInput.addEventListener('change', function () {
    if (!fotosInput.files.length) return;
    fotosAndroidSelecionadas = [];
    mostrarPrevia(Array.from(fotosInput.files).slice(0, 3));
});

function mostrarPrevia(arquivos) {
    fotosInput.setCustomValidity('');
    previaFotos.innerHTML = '';

    arquivos.forEach(function (arquivo) {
        const imagem = document.createElement('img');
        const url = URL.createObjectURL(arquivo);

        imagem.src = url;
        imagem.alt = 'Prévia da foto selecionada';

        imagem.onload = function () {
            URL.revokeObjectURL(url);
        };

        previaFotos.appendChild(imagem);
    });
}

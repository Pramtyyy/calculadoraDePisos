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
let pisosEmMemoria = JSON.parse(localStorage.getItem(chavePisos)) || [];
let vendasEmMemoria = JSON.parse(localStorage.getItem(chaveVendas)) || [];
let apiUrl = window.location.protocol === 'file:'
    ? (localStorage.getItem(chaveApi) || enderecoServidorPadrao)
    : (localStorage.getItem(chaveApi) || window.location.origin);
if (apiUrl === 'http://192.168.0.15:8000') {
    apiUrl = enderecoServidorPadrao;
}
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
const abrirCamera = document.getElementById('abrirCamera');
const alternarFundo = document.getElementById('alternarFundo');
let indicePisoSelecionado = null;
let indicePisoEditando = null;
let itensOrcamento = [];
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
    alternarFundo.textContent = escuro ? '\u263c' : '\u2600';
    alternarFundo.setAttribute('aria-pressed', String(escuro));
    localStorage.setItem('tema', escuro ? 'escuro' : 'claro');
}

function alternarTema() {
    const temaAtual = document.body.classList.contains('temaEscuro') ? 'claro' : 'escuro';
    aplicarTema(temaAtual);
}

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

window.onAndroidFilesSelected = function (arquivos) {
    if (!Array.isArray(arquivos) || arquivos.length === 0) {
        fotosAndroidSelecionadas = [];
        return;
    }
    fotosAndroidSelecionadas = arquivos.slice(0, 3);
    const transferencia = new DataTransfer();
    fotosAndroidSelecionadas.forEach(function (dataUrl, index) {
        const partes = dataUrl.split(',');
        const mime = partes[0].match(/:(.*?);/)[1];
        const bytes = atob(partes[1]);
        const dados = new Uint8Array(bytes.length);
        for (let indice = 0; indice < bytes.length; indice++) {
            dados[indice] = bytes.charCodeAt(indice);
        }
        transferencia.items.add(new File(
            [new Blob([dados], { type: mime })],
            `foto-${index + 1}.jpg`,
            { type: mime }
        ));
    });
    fotosInput.files = transferencia.files;
    fotosInput.dispatchEvent(new Event('change', { bubbles: true }));
};

fotosInput.addEventListener('click', function (event) {
    if (window.AndroidFilePicker) {
        event.preventDefault();
        window.AndroidFilePicker.open();
    }
});

abrirCamera.addEventListener('click', function () {
    if (window.AndroidCamera) {
        window.AndroidCamera.open();
    } else {
        fotosInput.click();
    }
});

function obterPisos() {
    return pisosEmMemoria;
}

function persistirPisos(pisos) {
    pisosEmMemoria = pisos;
    localStorage.setItem(chavePisos, JSON.stringify(pisos));
    if (!apiUrl) {
        return;
    }

    fetch(`${apiUrl}/api/pisos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pisos)
    }).then(function (resposta) {
        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }
    }).catch(function (erro) {
        console.warn('Servidor indisponível; dados mantidos localmente.', erro);
        window.alert('Não foi possível sincronizar com o servidor. Os dados ficaram somente neste aparelho.');
    });
}

async function persistirVendas(vendas) {
    vendasEmMemoria = vendas;
    localStorage.setItem(chaveVendas, JSON.stringify(vendas));
    if (!apiUrl) {
        return;
    }
    const resposta = await fetch(`${apiUrl}/api/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendas)
    });
    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
    }
}

function avisarFalhaSincronizacao(erro) {
        console.warn('Vendas mantidas localmente; falha ao sincronizar.', erro);
        window.alert('A venda foi salva neste aparelho, mas não foi possível salvar o relatório no servidor.');
}

async function carregarPisos() {
    if (!apiUrl && window.location.protocol === 'file:' && !localStorage.getItem(chaveApi)) {
        const endereco = window.prompt(
            'Informe a URL do servidor (ex.: http://192.168.0.10:8000). Deixe vazio para usar somente este aparelho:',
            ''
        );
        if (endereco) {
            apiUrl = endereco.replace(/\/$/, '');
            localStorage.setItem(chaveApi, apiUrl);
        }
    }

    if (!apiUrl) {
        return;
    }

    try {
        const [resposta, respostaVendas] = await Promise.all([
            fetch(`${apiUrl}/api/pisos`),
            fetch(`${apiUrl}/api/vendas`)
        ]);
        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }
        pisosEmMemoria = await resposta.json();
        if (respostaVendas.ok) {
            vendasEmMemoria = await respostaVendas.json();
            localStorage.setItem(chaveVendas, JSON.stringify(vendasEmMemoria));
        }
        localStorage.setItem(chavePisos, JSON.stringify(pisosEmMemoria));
        exibirPisos();
    } catch (erro) {
        console.warn('Servidor indisponível; usando dados locais.', erro);
    }
}

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
    let total = 0;
    vendasFiltradas.forEach(function (venda) {
        total += Number(venda.total) || 0;
        const linha = document.createElement('li');
        linha.className = 'itemRelatorio';
        linha.textContent = `${new Date(venda.data).toLocaleString('pt-BR')} - ${venda.itens.map(function (item) {
            return `${item.nome} (${item.quantidade} ${item.unidade})`;
        }).join(', ')} - ${formatarMoeda(venda.total)}`;
        listaRelatorioVendas.appendChild(linha);
    });
    totalVendasRelatorio.textContent = `${vendasFiltradas.length} ${vendasFiltradas.length === 1 ? 'venda' : 'vendas'}`;
    valorVendasRelatorio.textContent = formatarMoeda(total);
}

function abrirDetalhesPiso(event, modo) {
    if (event.target.closest('button')) {
        return;
    }

    const item = event.target.closest('li');
    if (item) {
        const piso = obterPisos()[Number(item.dataset.index)];
        if (!piso) {
            return;
        }
        indicePisoSelecionado = Number(item.dataset.index);
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
    pisos.forEach(function (piso, index) {
        if (somenteAtivos && piso.ativo === false) {
            return;
        }
        const tamanho = `${piso.altura ?? ''}x${piso.largura ?? ''}`;
        const textoBusca = `${piso.nome} ${piso.cor ?? ''} ${piso.altura ?? ''} ${piso.largura ?? ''} ${tamanho}`.toLocaleLowerCase();
        if (termo && !textoBusca.includes(termo)) {
            return;
        }
        const item = document.createElement('li');
        item.dataset.index = index;
        const card = document.createElement('div');
        card.className = 'pisoCard';
        const pecasAbertas = Number(piso.pecasAbertas ?? 0);
        const estoque = `${piso.estoque ?? 0} caixas${pecasAbertas > 0 ? ` e ${pecasAbertas} peças` : ''}`;
        const informacoes = document.createElement('div');
        informacoes.className = 'pisoInformacoes';
        const situacao = piso.ativo === false ? ' - INATIVO' : '';
        informacoes.textContent = `${piso.nome}${situacao} - ${piso.bitola ?? '-'}/${piso.tonalidade ?? '-'} - ${formatarMoeda(piso.preco)}/m² - Estoque: ${estoque}`;
        card.appendChild(informacoes);
        exibirGaleria(card, piso.fotos);
        item.appendChild(card);
        lista.appendChild(item);
    });
}

function exibirGaleria(container, fotos) {
    const fotosValidas = Array.isArray(fotos) ? fotos.filter(Boolean).slice(0, 3) : [];
    if (fotosValidas.length === 0) {
        return;
    }

    const galeria = document.createElement('div');
    galeria.className = 'galeria';
    const imagem = document.createElement('img');
    imagem.src = fotosValidas[0];
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
        imagem.src = foto;
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

    pisos[indicePisoSelecionado].ativo = pisos[indicePisoSelecionado].ativo === false;
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
    fotosPreservadasNaEdicao = Array.isArray(piso.fotos) ? piso.fotos.slice() : [];
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
            return item.indicePiso === indicePiso;
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
        nome: piso.nome,
        bitola: piso.bitola,
        tonalidade: piso.tonalidade,
        unidade: unidadeVenda.value,
        quantidade,
        pecasReservadas,
        metros,
        preco: obterPrecoVenda(piso),
        total: metros * obterPrecoVenda(piso)
    });
    exibirOrcamento();
    modalVenda.close();
});

function exibirOrcamento() {
    listaOrcamento.innerHTML = '';
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
    exibirOrcamento();
});

finalizarOrcamento.addEventListener('click', async function () {
    if (!await pedirConfirmacaoVenda()) {
        return;
    }

    const pisos = obterPisos();
    const pecasPorPiso = {};

    itensOrcamento.forEach(function (item) {
        pecasPorPiso[item.indicePiso] = (pecasPorPiso[item.indicePiso] ?? 0) + item.pecasReservadas;
    });

    Object.keys(pecasPorPiso).forEach(function (indice) {
        const piso = pisos[Number(indice)];
        const totalRestante = obterTotalPecas(piso) - pecasPorPiso[indice];
        const pecasPorCaixa = Number(piso.pecasPorCaixa ?? 1);
        piso.estoque = Math.floor(totalRestante / pecasPorCaixa);
        piso.pecasAbertas = totalRestante % pecasPorCaixa;
    });

    const totalVenda = itensOrcamento.reduce(function (total, item) {
        return total + item.total;
    }, 0);
    try {
        await persistirVendas(vendasEmMemoria.concat({
        data: new Date().toISOString(),
        itens: itensOrcamento.map(function (item) {
            return { nome: item.nome, quantidade: item.quantidade, unidade: item.unidade, total: item.total };
        }),
        total: totalVenda
        }));
    } catch (erro) {
        avisarFalhaSincronizacao(erro);
    }
    persistirPisos(pisos);
    itensOrcamento = [];
    exibirOrcamento();
    exibirPisos();
    mostrarTela('orcamento');
});

abrirFormulario.addEventListener('click', function () {
    indicePisoEditando = null;
    fotosAndroidSelecionadas = [];
    fotosPreservadasNaEdicao = [];
    pisosForm.reset();
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
    const pisos = obterPisos();
    const fotosSelecionadas = fotosAndroidSelecionadas.length > 0
        ? fotosAndroidSelecionadas
        : Array.from(pisosForm.elements.fotos.files);
    pisosForm.elements.fotos.setCustomValidity('');
    const indice = indicePisoEditando;
    const fotosAtuais = indice === null
        ? []
        : (fotosPreservadasNaEdicao.length > 0 ? fotosPreservadasNaEdicao : (pisos[indice].fotos ?? []));
    lerFotos(fotosSelecionadas.slice(0, 3)).then(function (fotos) {
        const fotosFinais = fotos.length > 0
            ? fotosAtuais.concat(fotos).slice(-3)
            : fotosAtuais;
        const piso = new Piso(
            dados.get('nome'),
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
    }).catch(function () {
        avisarFalhaFoto();
        pisosForm.elements.fotos.setCustomValidity('Não foi possível carregar a foto.');
        pisosForm.elements.fotos.reportValidity();
    });
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
    }));
}

function processarImagem(dataUrl, resolve, reject) {
    const imagem = new Image();
    imagem.addEventListener('load', function () {
        const limite = 2400;
        const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imagem.width * escala));
        canvas.height = Math.max(1, Math.round(imagem.height * escala));
        canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
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

exibirPisos();
exibirOrcamento();
exibirRelatorio();
carregarPisos();



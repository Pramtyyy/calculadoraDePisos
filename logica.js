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
}

const chavePisos = 'pisos';
const modal = document.getElementById('modal');
const pisosForm = document.getElementById('pisosForm');
const abrirFormulario = document.getElementById('abrirFormulario');
const listaPisos = document.getElementById('listaPisos');
const fecharFormulario = document.getElementById('fecharFormulario');
const limparPisos = document.getElementById('limparPisos');
const abrirOrcamento = document.getElementById('abrirOrcamento');
const buscaPisos = document.getElementById('buscaPisos');
const modalDetalhes = document.getElementById('modalDetalhes');
const detalhesPiso = document.getElementById('detalhesPiso');
const galeriaDetalhes = document.getElementById('galeriaDetalhes');
const fecharDetalhes = document.getElementById('fecharDetalhes');
const editarPiso = document.getElementById('editarPiso');
const venderPiso = document.getElementById('venderPiso');
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
const fecharVenda = document.getElementById('fecharVenda');
const modalOrcamento = document.getElementById('modalOrcamento');
const listaOrcamento = document.getElementById('listaOrcamento');
const metragemOrcamento = document.getElementById('metragemOrcamento');
const valorOrcamento = document.getElementById('valorOrcamento');
const finalizarOrcamento = document.getElementById('finalizarOrcamento');
const limparOrcamento = document.getElementById('limparOrcamento');
const fecharOrcamento = document.getElementById('fecharOrcamento');
const quantidadeArgamassa = document.getElementById('quantidadeArgamassa');
let indicePisoSelecionado = null;
let indicePisoEditando = null;
let itensOrcamento = [];

function obterPisos() {
    return JSON.parse(localStorage.getItem(chavePisos)) || [];
}

listaPisos.addEventListener('click', function (event) {
    if (event.target.closest('button')) {
        return;
    }

    const item = event.target.closest('li');
    if (item) {
        const piso = obterPisos()[Number(item.dataset.index)];
        indicePisoSelecionado = Number(item.dataset.index);
        modalDetalhes.showModal();
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
});

function exibirPisos() {
    listaPisos.innerHTML = '';
    const pisos = obterPisos();
    limparPisos.disabled = pisos.length === 0;

    const termo = buscaPisos.value.trim().toLocaleLowerCase();
    pisos.forEach(function (piso, index) {
        const tamanho = `${piso.altura ?? ''}x${piso.largura ?? ''}`;
        const textoBusca = `${piso.nome} ${piso.cor ?? ''} ${piso.altura ?? ''} ${piso.largura ?? ''} ${tamanho}`.toLocaleLowerCase();
        if (termo && !textoBusca.includes(termo)) {
            return;
        }
        const item = document.createElement('li');
        item.dataset.index = index;
        const pecasAbertas = Number(piso.pecasAbertas ?? 0);
        const estoque = `${piso.estoque ?? 0} caixas${pecasAbertas > 0 ? ` e ${pecasAbertas} peças` : ''}`;
        item.textContent = `${piso.nome} - ${piso.bitola ?? '-'}/${piso.tonalidade ?? '-'} - ${formatarMoeda(piso.preco)}/m² - Estoque: ${estoque} `;
        exibirGaleria(item, piso.fotos);
        const deletarButton = document.createElement('button');
        deletarButton.type = 'button';
        deletarButton.textContent = 'Deletar Piso';
        deletarButton.addEventListener('click', function () {
            pisos.splice(index, 1);
            localStorage.setItem(chavePisos, JSON.stringify(pisos));
            exibirPisos();
        });
        item.appendChild(deletarButton);
        listaPisos.appendChild(item);
    });
}

function exibirGaleria(container, fotos) {
    if (!Array.isArray(fotos) || fotos.length === 0) {
        return;
    }

    const galeria = document.createElement('div');
    galeria.className = 'galeria';
    fotos.forEach(function (foto) {
        const imagem = document.createElement('img');
        imagem.src = foto;
        imagem.alt = 'Foto do piso';
        galeria.appendChild(imagem);
    });
    container.appendChild(galeria);
}

fecharDetalhes.addEventListener('click', function () {
    modalDetalhes.close();
});

editarPiso.addEventListener('click', function () {
    const piso = obterPisos()[indicePisoSelecionado];
    indicePisoEditando = indicePisoSelecionado;
    modalDetalhes.close();

    Object.keys(piso).forEach(function (campo) {
        const input = pisosForm.elements[campo];
        if (input) {
            input.value = piso[campo] ?? '';
        }
    });

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
    quantidadeVenda.value = '1';
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

fecharVenda.addEventListener('click', function () {
    modalVenda.close();
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
    abrirOrcamento.textContent = `Orçamento (${itensOrcamento.length})`;
    finalizarOrcamento.disabled = itensOrcamento.length === 0;
    limparOrcamento.disabled = itensOrcamento.length === 0;
}

abrirOrcamento.addEventListener('click', function () {
    exibirOrcamento();
    modalOrcamento.showModal();
});

fecharOrcamento.addEventListener('click', function () {
    modalOrcamento.close();
});

limparOrcamento.addEventListener('click', function () {
    itensOrcamento = [];
    exibirOrcamento();
});

finalizarOrcamento.addEventListener('click', function () {
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

    localStorage.setItem(chavePisos, JSON.stringify(pisos));
    itensOrcamento = [];
    modalOrcamento.close();
    exibirOrcamento();
    exibirPisos();
});

abrirFormulario.addEventListener('click', function () {
    modal.showModal();
});

fecharFormulario.addEventListener('click', function () {
    modal.close();
});

limparPisos.addEventListener('click', function () {
    localStorage.removeItem(chavePisos);
    exibirPisos();
});

pisosForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const dados = new FormData(pisosForm);
    const pisos = obterPisos();
    const fotosSelecionadas = Array.from(pisosForm.elements.fotos.files);
    if (fotosSelecionadas.length > 3) {
        pisosForm.elements.fotos.setCustomValidity('Escolha no máximo 3 fotos.');
        pisosForm.elements.fotos.reportValidity();
        return;
    }

    pisosForm.elements.fotos.setCustomValidity('');
    const indice = indicePisoEditando;
    const fotosAtuais = indice === null ? [] : (pisos[indice].fotos ?? []);
    lerFotos(fotosSelecionadas).then(function (fotos) {
        const piso = new Piso(
            dados.get('nome'),
            dados.get('bitola'),
            dados.get('tonalidade'),
            fotos.length > 0 ? fotos : fotosAtuais,
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
        localStorage.setItem(chavePisos, JSON.stringify(pisos));

        pisosForm.reset();
        indicePisoEditando = null;
        salvarPiso.textContent = 'Adicionar';
        modal.close();
        exibirPisos();
    });
});

function lerFotos(fotos) {
    return Promise.all(fotos.map(function (foto) {
        return new Promise(function (resolve, reject) {
            const leitor = new FileReader();
            leitor.addEventListener('load', function () {
                resolve(leitor.result);
            });
            leitor.addEventListener('error', reject);
            leitor.readAsDataURL(foto);
        });
    }));
}

buscaPisos.addEventListener('input', exibirPisos);

exibirPisos();
exibirOrcamento();



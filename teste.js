function Piso(nome, altura, largura, cor, textura, resistencia, caixa, preco, estoque) {
    this.nome = nome;
    this.altura = altura;
    this.largura = largura;
    this.cor = cor;
    this.textura = textura;
    this.resistencia = resistencia;
    this.caixa = caixa;
    this.preco = preco;
    this.estoque = estoque;
}

const chavePisos = 'pisos';
const modal = document.getElementById('modal');
const pisosForm = document.getElementById('pisosForm');
const abrirFormulario = document.getElementById('abrirFormulario');
const listaPisos = document.getElementById('listaPisos');
const fecharFormulario = document.getElementById('fecharFormulario');
const limparPisos = document.getElementById('limparPisos');
const modalDetalhes = document.getElementById('modalDetalhes');
const detalhesPiso = document.getElementById('detalhesPiso');
const fecharDetalhes = document.getElementById('fecharDetalhes');
const editarPiso = document.getElementById('editarPiso');
const venderPiso = document.getElementById('venderPiso');
const salvarPiso = document.getElementById('salvarPiso');
const modalVenda = document.getElementById('modalVenda');
const vendaForm = document.getElementById('vendaForm');
const produtoVenda = document.getElementById('produtoVenda');
const precoUnitario = document.getElementById('precoUnitario');
const metrosPorCaixa = document.getElementById('metrosPorCaixa');
const quantidadeVenda = document.getElementById('quantidadeVenda');
const metrosVendidos = document.getElementById('metrosVendidos');
const valorTotal = document.getElementById('valorTotal');
const fecharVenda = document.getElementById('fecharVenda');
let indicePisoSelecionado = null;
let indicePisoEditando = null;

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
            `Altura: ${piso.altura}`,
            `Largura: ${piso.largura}`,
            `Cor: ${piso.cor}`,
            `Textura: ${piso.textura}`,
            `Resistência: ${piso.resistencia}`,
            `Metros por caixa: ${piso.caixa ?? 'Não informado'}`,
            `Preço por m²: ${formatarMoeda(piso.preco)}`,
            `Estoque: ${piso.estoque ?? 0} caixas`
        ].join('\n');
        venderPiso.disabled = Number(piso.estoque ?? 0) <= 0;
    }
});

function exibirPisos() {
    listaPisos.innerHTML = '';
    const pisos = obterPisos();
    limparPisos.disabled = pisos.length === 0;

    pisos.forEach(function (piso, index) {
        const item = document.createElement('li');
        item.dataset.index = index;
        item.textContent = `${piso.nome} - ${formatarMoeda(piso.preco)}/m² - Estoque: ${piso.estoque ?? 0} caixas `;
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

    if (!piso || Number(piso.estoque ?? 0) <= 0) {
        return;
    }

    modalDetalhes.close();
    produtoVenda.textContent = piso.nome;
    precoUnitario.textContent = formatarMoeda(piso.preco);
    metrosPorCaixa.textContent = `${Number(piso.caixa ?? 0).toFixed(2)} m²`;
    quantidadeVenda.value = '1';
    quantidadeVenda.max = piso.estoque;
    atualizarValorTotal();
    modalVenda.showModal();
});

function formatarMoeda(valor) {
    return Number(valor ?? 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function atualizarValorTotal() {
    const piso = obterPisos()[indicePisoSelecionado];
    const quantidadeCaixas = Number(quantidadeVenda.value) || 0;
    const metros = quantidadeCaixas * Number(piso?.caixa ?? 0);
    metrosVendidos.textContent = `${metros.toFixed(2)} m²`;
    valorTotal.textContent = formatarMoeda(metros * Number(piso?.preco ?? 0));
}

quantidadeVenda.addEventListener('input', atualizarValorTotal);

fecharVenda.addEventListener('click', function () {
    modalVenda.close();
});

vendaForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const pisos = obterPisos();
    const piso = pisos[indicePisoSelecionado];
    const quantidadeCaixas = Number(quantidadeVenda.value);

    if (!piso || !Number.isInteger(quantidadeCaixas) || quantidadeCaixas <= 0 || quantidadeCaixas > Number(piso.estoque ?? 0)) {
        quantidadeVenda.setCustomValidity('A quantidade deve estar disponível no estoque.');
        quantidadeVenda.reportValidity();
        return;
    }

    quantidadeVenda.setCustomValidity('');
    piso.estoque = Number(piso.estoque) - quantidadeCaixas;
    localStorage.setItem(chavePisos, JSON.stringify(pisos));
    modalVenda.close();
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
    const piso = new Piso(
        dados.get('nome'),
        dados.get('altura'),
        dados.get('largura'),
        dados.get('cor'),
        dados.get('textura'),
        dados.get('resistencia'),
        dados.get('caixa'),
        dados.get('preco'),
        dados.get('estoque')
    );

    const pisos = obterPisos();
    if (indicePisoEditando === null) {
        pisos.push(piso);
    } else {
        pisos[indicePisoEditando] = piso;
    }
    localStorage.setItem(chavePisos, JSON.stringify(pisos));

    pisosForm.reset();
    indicePisoEditando = null;
    salvarPiso.textContent = 'Adicionar';
    modal.close();
    exibirPisos();
});

exibirPisos();



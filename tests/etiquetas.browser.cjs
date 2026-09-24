const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://etiquetas.test/**', async route => {
            const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
            if (['index.html', 'style.css', 'logica.js', 'sincronizacao.js'].includes(file)) {
                await route.fulfill({ path: path.join(__dirname, '..', file) });
            } else await route.fulfill({ status: 503, body: '{}' });
        });
        await page.goto('http://etiquetas.test');
        await page.evaluate(() => {
            document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
            obterPisos = () => [{ id: 'etiqueta-teste', nome: 'Piso <Branco> & Cinza', altura: 60,
                largura: 120, resistencia: 'PEI 4', caixa: 2.88, fotos: [], estoque: 10 }];
            window.print = () => { window.impressaoSolicitada = true; };
            mostrarDetalhesPiso(0, 'cadastro');
        });
        await page.locator('#imprimirEtiqueta').click();
        assert.match(await page.locator('#previaEtiqueta').innerText(), /Piso <Branco> & Cinza/);
        assert.match(await page.locator('#previaEtiqueta').innerText(), /60 × 120/);
        assert.match(await page.locator('#previaEtiqueta').innerText(), /2,88 m²/);
        await page.locator('#quantidadeEtiquetas').fill('3');
        await page.locator('#posicaoEtiqueta').fill('14');
        await page.locator('#etiquetasForm button').click();
        assert.equal(await page.evaluate(() => window.impressaoSolicitada), true);
        assert.equal(await page.locator('.folhaEtiquetas').count(), 2);
        assert.equal(await page.locator('.folhaEtiquetas strong').count(), 3);
        assert.equal(await page.locator('.folhaEtiquetas .etiquetaPiso').first().innerText(), '');
        await page.emulateMedia({ media: 'print' });
        const size = await page.locator('.folhaEtiquetas .etiquetaPiso').first().boundingBox();
        assert.ok(Math.abs(size.width - 384) < 1);
        assert.ok(Math.abs(size.height - 33.9 * 96 / 25.4) < 1);
        assert.equal(await page.locator('#orcamentoImpressao').isVisible(), false);
        await page.emulateMedia({ media: 'screen' });
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        assert.equal(await page.evaluate(() => document.body.classList.contains('imprimindoEtiquetas')), false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('#modalEtiquetas [data-fechar]').click();
        assert.equal(await page.locator('#modalDetalhes').isVisible(), true);
        assert.deepEqual(errors, []);
        console.log('PASS label content, sheet positions, page overflow, physical dimensions, print cleanup and mobile layout');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });

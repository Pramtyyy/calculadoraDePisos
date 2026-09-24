const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://updates.test/**', async route => {
            const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
            if (['index.html', 'style.css', 'logica.js', 'sincronizacao.js'].includes(file)) {
                await route.fulfill({ path: path.join(__dirname, '..', file) });
            } else await route.fulfill({ status: 503, body: '{}' });
        });
        await page.addInitScript(() => {
            localStorage.setItem('apiToken', 'test-token');
            window.checks = [];
            window.installs = 0;
            window.AndroidAtualizacao = {
                version: () => '1.3',
                check: (server, token) => {
                    window.checks.push({ server, token });
                    window.onAppUpdate('checking', 'Consultando…');
                    return true;
                },
                install: () => { window.installs++; }
            };
        });
        await page.goto('http://updates.test');
        await page.waitForFunction(() => window.checks.length === 1);
        assert.equal(await page.locator('#verificarAtualizacao').isDisabled(), true);
        assert.deepEqual(await page.evaluate(() => window.checks[0]), { server: 'http://updates.test', token: 'test-token' });
        await page.evaluate(() => {
            document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
            window.onAppUpdate('error', 'Servidor offline');
        });
        assert.equal(await page.locator('#avisoAtualizacao').isVisible(), false);
        await page.locator('#abrirConfiguracoes').click();
        assert.equal(await page.locator('#versaoInstalada').innerText(), '1.3');
        await page.locator('#verificarAtualizacao').click();
        assert.equal(await page.evaluate(() => window.checks.length), 2);
        await page.evaluate(() => window.onAppUpdate('downloading', 'Baixando: 50%'));
        assert.equal(await page.locator('#statusAtualizacaoAjustes').innerText(), 'Baixando: 50%');
        assert.equal(await page.locator('#instalarAtualizacaoAjustes').isVisible(), false);
        await page.evaluate(() => window.onAppUpdate('ready', 'Versão 1.4 baixada'));
        await page.locator('#instalarAtualizacaoAjustes').click();
        assert.equal(await page.evaluate(() => window.installs), 1);
        await page.locator('#modalConfiguracoes [data-fechar]').click();
        await page.locator('#instalarAtualizacao').click();
        assert.equal(await page.evaluate(() => window.installs), 2);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
        console.log('PASS startup check, authentication handoff, offline behavior, progress, settings, install actions and mobile layout (mock Android bridge)');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });

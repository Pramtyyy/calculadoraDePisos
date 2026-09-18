const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs/promises');
const base='http://127.0.0.1:8765',headers={Authorization:'Bearer test-token','Content-Type':'application/json'};
async function state(){return(await fetch(base+'/api/state',{headers})).json()}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('apiToken','test-token'));await page.goto(base);await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');
 const before=await state();assert.ok(before.pisos.length,'Run photos.browser.cjs first');const product=before.pisos.at(-1);
 await page.evaluate(()=>mostrarTela('cadastro'));await page.locator('#listaPisosCadastro .pisoInformacoes').last().click();await page.locator('#editarPiso').click();
 const changed={...product,cor:'VERMELHO'};
 const r=await fetch(base+'/api/sync',{method:'POST',headers,body:JSON.stringify({serverId:before.serverId,operation:{id:'remote-'+Date.now(),tipo:'piso',baseVersion:product.version,piso:changed}})});assert.equal(r.status,200);
 await page.locator('#cor').fill('AZUL');await page.locator('#salvarPiso').click();await page.waitForFunction(()=>DadosSeguros.status.startsWith('Conflito:'));
 assert.equal((await state()).pisos.at(-1).cor,'VERMELHO');assert.equal(await page.evaluate(()=>DadosSeguros.pending),1);
 await page.reload();await page.waitForFunction(()=>DadosSeguros.status.startsWith('Conflito:'));assert.equal(await page.evaluate(()=>obterPisos().at(-1).cor),'AZUL');
 console.log('PASS stale edit rejected and local pending edit preserved after reload');
 await page.locator('#abrirConfiguracoes').click();
 let download=page.waitForEvent('download');await page.locator('#exportarLocal').click();let file=await download;
 const exported=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(exported.queue.length,1);assert.ok(Object.keys(exported.localPhotos).length);
 download=page.waitForEvent('download');await page.locator('#recarregarServidor').click();await download;await page.waitForFunction(()=>!DadosSeguros.pending);assert.equal(await page.evaluate(()=>obterPisos().at(-1).cor),'VERMELHO');
 console.log('PASS conflict recovery exports pending operations + cached photos before reloading');
 download=page.waitForEvent('download');await page.locator('#backupServidor').click();file=await download;const archive=await fs.readFile(await file.path());const oldId=(await state()).serverId;
 await page.locator('#restaurarArquivo').setInputFiles({name:'backup.zip',mimeType:'application/zip',buffer:archive});await page.waitForFunction(old=>DadosSeguros.project().serverId!==old,oldId);
 const restored=await state();assert.notEqual(restored.serverId,oldId);assert.equal(restored.pisos.length,before.pisos.length);
 console.log('PASS authenticated complete backup/restore and stale-device invalidation');
 await page.locator('#modalConfiguracoes [data-fechar]').click();
 for(const width of [320,390,768,1200]){await page.setViewportSize({width,height:850});for(const screen of ['principal','cadastro','orcamento','relatorios']){await page.evaluate(s=>mostrarTela(s),screen);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}}
 assert.deepEqual(errors,[]);console.log('PASS responsive screens and no browser errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

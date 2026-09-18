const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765';
async function remote(){return (await fetch(base+'/api/state',{headers:{Authorization:'Bearer test-token'}})).json();}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);
 await page.waitForFunction(()=>document.getElementById('modalConfiguracoes').open);
 assert.match(await page.locator('#resultadoConexao').textContent(),/Servidor acessível/);
 await page.locator('#chaveConfig').fill('test-token');
 await page.locator('#configForm button[type=submit]').click();
 await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');
 await page.locator('#modalConfiguracoes [data-fechar]').click();
 console.log('PASS missing access key opens setup and saved key restores online sync');

 await page.goto(base);await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');
 async function addTile(name){
  await page.evaluate(()=>mostrarTela('cadastro'));await page.locator('#abrirFormulario').click();
  await page.locator('#nome').fill(name);await page.locator('#cor').fill('Branco');
  for(const [id,value] of Object.entries({bitola:'1',tonalidade:'1',altura:'50',largura:'50',caixa:'1',pecasPorCaixa:'4',preco:'10',estoque:'10'}))await page.locator('#'+id).fill(value);
  const chooser=page.waitForEvent('filechooser');await page.locator('#selecionarFotos').click();await (await chooser).setFiles('tests/gallery-fixture.png');
  await page.waitForFunction(()=>document.querySelector('#previaFotos img')?.naturalWidth>0);
  await page.locator('#salvarPiso').click();await page.waitForFunction(()=>!modal.open);
 }
 const initial=(await remote()).pisos.length;
 await addTile('BROWSER TILE');await page.waitForFunction(()=>!DadosSeguros.pending);
 assert.equal((await remote()).pisos.length,initial+1);
 await page.reload();await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');
 assert.equal(await page.evaluate(()=>obterPisos().length),initial+1);
 console.log('PASS authenticated gallery upload and reload');
 await page.evaluate(()=>mostrarTela('orcamento'));await page.locator('#listaPisosOrcamento .pisoInformacoes').last().click();await page.locator('#venderPiso').click();
 await page.locator('#quantidadeVenda').fill('1');await page.locator('#vendaForm button[type=submit]').click();await page.locator('#abrirOrcamento').click();
 await page.locator('#clienteOrcamento').fill('Cliente teste');await page.locator('#telefoneOrcamento').fill('11999990000');await page.locator('#salvarOrcamento').click();
 await page.waitForFunction(()=>!DadosSeguros.pending);
 await page.reload();await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');assert.equal(await page.evaluate(()=>itensOrcamento.length),1);
 assert.equal(await page.locator('#clienteOrcamento').inputValue(),'Cliente teste');assert.ok((await remote()).orcamentos.length);
 console.log('PASS saved quotation and draft/customer persistence');
 await page.evaluate(()=>mostrarTela('orcamento'));
 await page.locator('#abrirOrcamentosSalvos').click();
 assert.equal(await page.locator('#modalOrcamentosSalvos').evaluate(el=>el.open),true);
 await page.locator('#orcamentosSalvos button').last().click();
 assert.equal(await page.locator('#modalOrcamentosSalvos').evaluate(el=>el.open),false);
 assert.equal(await page.locator('#modalOrcamento').evaluate(el=>el.open),true);
 assert.equal(await page.locator('#clienteOrcamento').inputValue(),'Cliente teste');
 await page.locator('#modalOrcamento [data-fechar]').click();
 console.log('PASS saved quotes modal opens selected quote in editor');

 await context.route('**/api/**',r=>r.abort());
 await page.evaluate(()=>mostrarTela('orcamento'));await page.locator('#abrirOrcamento').click();await page.locator('#finalizarOrcamento').click();await page.locator('#confirmarVenda').click();
 await page.waitForFunction(()=>DadosSeguros.pending===1);await page.reload();
 await page.waitForFunction(()=>DadosSeguros.pending===1);
 assert.equal(await page.evaluate(()=>vendasEmMemoria.filter(v=>v.pendente).length),1);
 assert.equal(await page.evaluate(()=>obterPisos().at(-1).estoque),9);
 await page.evaluate(()=>mostrarTela('cadastro'));await page.waitForFunction(()=>[...document.querySelectorAll('#listaPisosCadastro img')].every(i=>i.complete&&i.naturalWidth>0));
 console.log('PASS offline sale + stock retained together across reload');
 await context.unroute('**/api/**');
 let dropped=false;
 await context.route('**/api/sync',async route=>{if(!dropped){dropped=true;await route.fetch();await route.abort();}else await route.continue();});
 await page.evaluate(()=>carregarPisos());
 assert.equal(await page.evaluate(()=>DadosSeguros.pending),1);
 const once=await remote();const saleId=await page.evaluate(()=>DadosSeguros.raw.queue[0].id);
 assert.ok(once.vendas.some(v=>v.id===saleId));
 await context.unroute('**/api/sync');await page.evaluate(()=>carregarPisos());await page.waitForFunction(()=>!DadosSeguros.pending);
 const after=await remote();assert.equal(after.vendas.filter(v=>v.id===saleId).length,1);assert.equal(after.pisos.at(-1).estoque,9);
 console.log('PASS lost response retry does not duplicate sale or stock deduction');
 await page.locator('#abrirConfiguracoes').click();await page.locator('#testarConexao').click();await page.waitForFunction(()=>document.getElementById('resultadoConexao').textContent.includes('válidas'));
 await page.screenshot({path:'tests/settings-v2.png'});
 await page.locator('#modalConfiguracoes [data-fechar]').click();
 assert.deepEqual(errors,[]);console.log('PASS settings connection test; no page errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


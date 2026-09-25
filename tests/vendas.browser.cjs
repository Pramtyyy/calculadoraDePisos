const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:360,height:800}});
 await page.addInitScript(()=>localStorage.setItem('apiToken','test-token'));
 await page.goto('http://127.0.0.1:8765');
 await page.waitForFunction(()=>DadosSeguros.status==='Sincronizado');
 await page.evaluate(()=>{
   vendasEmMemoria=[{id:'v1',cliente:'Maria <Silva>',data:'2026-09-25T12:00:00Z',total:50,itens:[{nome:'Piso A',quantidade:2,unidade:'caixas',metros:2,total:50}]},
   {id:'v2',data:'2026-09-24T12:00:00Z',cancelada:true,total:10,itens:[{nome:'Antigo',quantidade:1,unidade:'pecas',total:10}]}];
   window.print=()=>window.printCount=(window.printCount||0)+1;
   exibirRelatorio();mostrarTela('relatorios');
 });
 await page.locator('#buscaRelatorio').fill('Maria');
 assert.equal(await page.locator('.itemRelatorio').count(),1);
 await page.getByRole('button',{name:'Imprimir venda',exact:true}).click();
 let receipt=await page.locator('#orcamentoImpressao').textContent();
 assert.match(receipt,/Cliente: Maria <Silva>/);assert.match(receipt,/2 caixas/);assert.match(receipt,/50,00/);
 assert.equal(await page.evaluate(()=>window.printCount),1);
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('#orcamentoImpressao').isVisible(),true);
 assert.equal(await page.locator('#telaRelatorios').isVisible(),false);
 await page.emulateMedia({media:'screen'});
 await page.locator('#buscaRelatorio').fill('Antigo');
 await page.evaluate(()=>window.AndroidImprimir={open:()=>window.nativePrint=true});
 await page.getByRole('button',{name:'Imprimir venda',exact:true}).click();
 receipt=await page.locator('#orcamentoImpressao').textContent();
 assert.match(receipt,/CANCELADA/);assert.match(receipt,/Não informado/);assert.doesNotMatch(receipt,/Maria/);
 assert.equal(await page.evaluate(()=>window.nativePrint),true);
 console.log('PASS sale customer search, receipt, legacy/cancelled sales, browser and Android print');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

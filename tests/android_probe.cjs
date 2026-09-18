const { chromium }=require('playwright');
(async()=>{ const b=await chromium.connectOverCDP('http://127.0.0.1:9223'); const p=b.contexts()[0].pages()[0];
 const action=process.argv[2];
 if(action==='offline') {
  await p.addInitScript(() => { window.alert = () => {}; });
  await p.route('**/api/**',r=>r.abort()); await p.route('**/fotos/**',r=>r.abort());
  await p.reload(); await p.locator('#irParaCadastro').click();
  await p.waitForFunction(()=>[...document.querySelectorAll('#listaPisosCadastro img')].length>0&&[...document.querySelectorAll('#listaPisosCadastro img')].every(i=>i.complete&&i.naturalWidth>0));
  await p.evaluate(async()=>{ const key='localfoto:android-offline-test'; const c=document.createElement('canvas'); c.width=30;c.height=30; await cacheFoto(key,c.toDataURL('image/jpeg')); persistirPisos([...obterPisos(),{nome:'OFFLINE ANDROID TEST',fotos:[key],ativo:true}]); });
  await p.reload(); await p.locator('#irParaCadastro').click();
  await p.waitForFunction(()=>obterPisos().some(p=>p.nome==='OFFLINE ANDROID TEST'));
  await p.waitForFunction(()=>[...document.querySelectorAll('#listaPisosCadastro img')].every(i=>i.complete&&i.naturalWidth>0));
  console.log('PASS Android offline save and file:// reload with persistent photo cache');
  await p.unroute('**/api/**'); await p.unroute('**/fotos/**'); await p.reload();
  await p.waitForFunction(()=>!localStorage.getItem('pisosPendentes'));
  console.log('PASS Android reconnect sync');
 }
 if(action==='inspect') console.log(await p.evaluate(()=>({url:location.href,apiUrl,pisos:obterPisos().length,selected:fotosAndroidSelecionadas.length,modal:modal.open,photos:document.querySelectorAll('img').length})));
 if(action==='camera') { await p.evaluate(()=>{localStorage.setItem('apiUrl','http://127.0.0.1:8765')}); await p.reload(); await p.locator('#irParaCadastro').click(); await p.locator('#abrirFormulario').click(); await p.locator('#abrirCamera').click(); }
 if(action==='gallery') { await p.locator('#abrirFormulario').click(); await p.locator('#selecionarFotos').click(); }
 if(action==='selection') console.log(await p.evaluate(()=>({selected:fotosAndroidSelecionadas.length,previews:[...previaFotos.querySelectorAll('img')].map(i=>({loaded:i.complete,width:i.naturalWidth,height:i.naturalHeight}))})));
 if(action==='upload') console.log(await p.evaluate(async()=>{const original=apiUrl;apiUrl='http://192.168.0.5:8000';try {const photos=await lerFotos(fotosAndroidSelecionadas); return {photos,serverUpload:photos.every(f=>f.startsWith('fotos/'))};}finally{apiUrl=original}}));
 if(action==='save') {await p.locator('#nome').fill('ANDROID PHOTO TEST');await p.locator('#cor').fill('Branco'); for(const id of ['bitola','tonalidade','altura','largura','caixa','pecasPorCaixa','preco','estoque'])await p.locator('#'+id).fill('10');await p.locator('#salvarPiso').click();await p.waitForFunction(()=>!modal.open);await p.waitForFunction(()=>!localStorage.getItem('pisosPendentes')); console.log('PASS native photo saved to isolated server');}
 if(action==='reload') {await p.reload();await p.locator('#irParaCadastro').click();await p.waitForFunction(()=>[...document.querySelectorAll('#listaPisosCadastro img')].length>0&&[...document.querySelectorAll('#listaPisosCadastro img')].every(i=>i.complete&&i.naturalWidth>0)); console.log('PASS Android reload: persisted photos render');}
 process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});


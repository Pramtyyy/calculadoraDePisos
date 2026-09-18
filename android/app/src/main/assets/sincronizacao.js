/* Persistent operation queue: one localStorage write commits local stock + sale together. */
const DadosSeguros = (() => {
    const key = 'estadoSeguroV2';
    const empty = () => ({pisos:[], vendas:[], orcamentos:[], movimentos:[], revision:0, serverId:null});
    const copy = value => JSON.parse(JSON.stringify(value));
    const id = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    function read(name, fallback) { try { return JSON.parse(localStorage.getItem(name)) ?? fallback; } catch { return fallback; } }
    const legacy = {pisos:read('pisos',[]), vendas:read('vendas',[])};
    let data = read(key,null) || {base:{...empty(), pisos:legacy.pisos.map((p,i)=>({...p,id:p.id||`legacy-${i}`,version:p.version||1})), vendas:legacy.vendas}, queue:[], legacyBackup:legacy,
        legacyPending:localStorage.getItem('pisosPendentes') === '1', draft:read('rascunhoOrcamento',null)};
    let active = Promise.resolve();
    let notify = () => {};
    let status = 'Dados locais';
    function commit(next) { localStorage.setItem(key,JSON.stringify(next)); data=next; notify(); }
    function project() {
        const state=copy(data.base);
        for (const op of data.queue) {
            if (op.tipo==='piso') {
                const index=state.pisos.findIndex(p=>p.id===op.piso.id);
                const piso={...copy(op.piso),version:op.baseVersion+1};
                if(index<0)state.pisos.push(piso);else state.pisos[index]=piso;
            } else if(op.tipo==='venda') {
                if(state.vendas.some(v=>v.id===op.id))continue;
                const changed = new Set();
                for(const item of op.itens) {
                    const piso=state.pisos.find(p=>p.id===item.pisoId);if(!piso)continue;
                    const pieces=item.unidade==='caixas'?item.quantidade*Number(piso.pecasPorCaixa):item.quantidade;
                    const total=Number(piso.estoque)*Number(piso.pecasPorCaixa)+Number(piso.pecasAbertas||0)-pieces;
                    piso.estoque=Math.floor(total/Number(piso.pecasPorCaixa));piso.pecasAbertas=total%Number(piso.pecasPorCaixa);if(!changed.has(piso.id))piso.version=(piso.version||1)+1;changed.add(piso.id);
                }
                state.vendas.push({id:op.id,data:op.data,cliente:op.cliente,itens:copy(op.itens),total:op.itens.reduce((sum,i)=>sum+i.total,0),pendente:true});
            } else if(op.tipo==='orcamento') {
                const index=state.orcamentos.findIndex(q=>q.id===op.orcamento.id);
                const quote={...copy(op.orcamento),version:op.baseVersion+1};
                if(index<0)state.orcamentos.push(quote);else state.orcamentos[index]=quote;
            } else if(op.tipo==='cancelarVenda') {
                const sale=state.vendas.find(v=>v.id===op.vendaId);
                if(!sale||sale.cancelada)continue;
                sale.cancelada=true;sale.pendente=true;
                for(const item of sale.itens) {
                    const piso=state.pisos.find(p=>p.id===item.pisoId);if(!piso)continue;
                    const total=Number(piso.estoque)*Number(piso.pecasPorCaixa)+Number(piso.pecasAbertas||0)+Number(item.pecas||0);
                    piso.estoque=Math.floor(total/Number(piso.pecasPorCaixa));piso.pecasAbertas=total%Number(piso.pecasPorCaixa);piso.version=(piso.version||1)+1;
                }
            }
        }
        return state;
    }
    function enqueue(ops, clearDraft = false) {
        if(!data.base.serverId && data.base.pisos.some(p=>p.id.startsWith('legacy-')))throw Error('Conecte ao servidor em Configurações para concluir a migração dos dados.');
        if(data.legacyPending)throw Error('Exporte e revise os dados antigos em Configurações antes de continuar.');
        const next=copy(data);next.queue.push(...ops);
        if(clearDraft)next.draft={...(next.draft||{}),itens:[],quoteId:null};
        commit(next);
    }
    function savePisos(pisos) {
        const current=project().pisos;
        const ops=[];
        for(const raw of pisos) {
            const item=copy(raw);item.id ||= id();
            const old=current.find(p=>p.id===item.id);
            const a={...item},b={...old};delete a.version;delete b.version;
            if(JSON.stringify(a)===JSON.stringify(b))continue;
            ops.push({id:id(),tipo:'piso',baseVersion:item.version ?? old?.version ?? 0,piso:item});
        }
        if(ops.length)enqueue(ops);
    }
    function message(value) {status=value;notify();}
    async function responseJson(response) {
        const result=await response.json();
        if(!response.ok) {
            const error=Error(result.erro||`HTTP ${response.status}`);error.status=response.status;throw error;
        }
        return result;
    }
    function sync(url, request, upload) {
        active=active.catch(()=>{}).then(async()=>{
            if(!url){message('Somente neste aparelho');return;}
            if(data.legacyPending){message('Dados antigos pendentes: exporte antes de recarregar');return;}
            message('Sincronizando…');
            try {
                const remote=await responseJson(await request(`${url}/api/state`));
                if(!data.base.serverId && data.legacyBackup?.vendas?.length) {
                    const signature = v => JSON.stringify([v.data,Number(v.total),(v.itens||[]).map(i=>[i.nome,Number(i.quantidade),i.unidade,Number(i.total)])]);
                    const known = new Set(remote.vendas.map(signature));
                    if(data.legacyBackup.vendas.some(v=>!known.has(signature(v)))) {
                        const next=copy(data);next.legacyPending=true;commit(next);
                        message('Vendas antigas pendentes: exporte e revise antes de recarregar');return;
                    }
                }
                if(data.base.serverId && data.base.serverId!==remote.serverId && data.queue.length) {
                    throw Error('Servidor ou backup alterado. Exporte as pendências antes de trocar de base.');
                }
                if(!data.queue.length || !data.base.serverId) {
                    const next=copy(data);next.base=remote;commit(next);
                }
                while(data.queue.length) {
                    let op=copy(data.queue[0]);
                    if(op.tipo==='piso') {
                        op.piso.fotos=await Promise.all((op.piso.fotos||[]).map(upload));
                        const next=copy(data);next.queue[0]=op;commit(next);
                    }
                    const result=await responseJson(await request(`${url}/api/sync`,{
                        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverId:data.base.serverId,operation:op})
                    }));
                    const next=copy(data);next.base=result;next.queue=next.queue.filter(p=>p.id!==op.id);commit(next);
                }
                message('Sincronizado');
            } catch(error) {
                message(error.status===401?'Chave de acesso necessária':error.status===409?`Conflito: ${error.message}`:`Sem sincronizar: ${error.message}`);
                throw error;
            }
        });
        return active;
    }
    return {id,copy,project,savePisos,enqueue,sync,responseJson,
        onChange(callback){notify=callback;},
        get pending(){return data.queue.length;},get status(){return status;},get raw(){return copy(data);},
        get draft(){return copy(data.draft||{itens:[],cliente:'',telefone:''});},
        draftSave(draft){const next=copy(data);next.draft=copy(draft);localStorage.setItem(key,JSON.stringify(next));data=next;},
        importLocal(value){
            if(data.queue.length)throw Error('Exporte e resolva as pendências atuais antes de importar.');
            if(!value || !value.base || !['pisos','vendas','orcamentos','movimentos'].every(k=>Array.isArray(value.base[k])) || !Array.isArray(value.queue))throw Error('Exportação local inválida');
            if(value.queue.some(op=>!op || typeof op.id!=='string' || !['piso','venda','orcamento','cancelarVenda'].includes(op.tipo)))throw Error('Operações inválidas');
            const previous=copy(data);
            try { const original=data;data=copy(value);project();data=original; }catch(error){data=previous;throw Error('Não foi possível validar os dados importados');}
            commit({...copy(value),recovery:previous});message('Dados locais importados; revise antes de sincronizar');
        },
        reset(remote){const recovery={base:data.base,queue:data.queue,legacyBackup:data.legacyBackup,draft:data.draft};commit({...data,base:remote,queue:[],legacyPending:false,draft:null,recovery});message('Sincronizado');},
        pendingError:message
    };
})();

"""Isolated API tests and browser fixture server; never writes production records."""
import base64, io, json, shutil, sqlite3, sys, tempfile, threading, unittest, urllib.error, urllib.request, zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
PROJECT=server.ROOT
TOKEN='test-token'

def configure(directory):
    server.ROOT=Path(directory); server.DATABASE=server.ROOT/'test.sqlite3';server.PASTA_FOTOS=server.ROOT/'fotos'
    server.AUTH_TOKEN=TOKEN
    for name in ('index.html','logica.js','sincronizacao.js','style.css'):
        shutil.copyfile(PROJECT/name,server.ROOT/name)
    server.inicializar_banco()

def piso(item_id='tile',stock=10):
    return dict(id=item_id,nome='TEST TILE',bitola='1',tonalidade='1',altura=50,largura=50,caixa=1,pecasPorCaixa=4,
                preco=10,estoque=stock,pecasAbertas=0,fotos=[],ativo=True,cor='Branco',textura='polido',resistencia='LA')

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=PROJECT/'tests');configure(self.temp.name)
        self.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.AppHandler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.url='http://127.0.0.1:'+str(self.http.server_port)
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();self.temp.cleanup()
    def request(self,path,body=None,token=TOKEN,method=None,headers=None):
        h={'Authorization':'Bearer '+token} if token else {}
        if isinstance(body,(dict,list)): body=json.dumps(body).encode();h['Content-Type']='application/json'
        h.update(headers or {})
        req=urllib.request.Request(self.url+path,data=body,headers=h,method=method)
        try:
            with urllib.request.urlopen(req) as response:return response.status,response.read(),response.headers
        except urllib.error.HTTPError as response:
            with response:return response.code,response.read(),response.headers
    def operation(self,op):
        status,body,_=self.request('/api/sync',{'serverId':server.ler_estado()['serverId'],'operation':op})
        return status,json.loads(body)
    def create(self,stock=10):
        op={'id':'create','tipo':'piso','baseVersion':0,'piso':piso(stock=stock)}
        status,state=self.operation(op);self.assertEqual(status,200,state);return state
    def sale(self,opid='sale',qty=1):
        return {'id':opid,'tipo':'venda','cliente':'Test','itens':[{'pisoId':'tile','quantidade':qty,'unidade':'caixas','total':qty*10}]}
    def test_access_and_static_allowlist(self):
        self.assertEqual(self.request('/')[0],200)
        self.assertEqual(self.request('/api/state',token='')[0],401)
        for path in ['/test.sqlite3','/android/key','/.server-token','/server.py','/../server.py','/%2e%2e/server.py','/backups/','/.git/config']:
            self.assertEqual(self.request(path)[0],404,path)
            self.assertEqual(self.request(path,method='HEAD')[0],404,path)
        self.assertEqual(self.request('/api/health',token='')[0],200)
        self.assertEqual(self.request('/api/pisos',[])[0],400)
    def test_lotes_preserve_independent_stock(self):
        self.create()
        second = dict(piso('lot-2', stock=3), modeloId='tile', bitola='2', tonalidade='5')
        status, state = self.operation(dict(id='new-lot', tipo='piso', baseVersion=0, piso=second))
        self.assertEqual(status, 200, state)
        self.assertEqual(state['pisos'][1]['modeloId'], 'tile')
        duplicate = dict(second, id='duplicate', bitola='02')
        self.assertEqual(self.operation(dict(id='duplicate', tipo='piso', baseVersion=0, piso=duplicate))[0], 409)
        sale = self.sale()
        sale['itens'][0]['pisoId'] = 'lot-2'
        status, state = self.operation(sale)
        self.assertEqual(status, 200, state)
        self.assertEqual([p['estoque'] for p in state['pisos']], [10, 2])
        status, state = self.operation(dict(id='cancel-lot', tipo='cancelarVenda', vendaId='sale'))
        self.assertEqual(status, 200, state)
        self.assertEqual([p['estoque'] for p in state['pisos']], [10, 3])
    def test_photo_validation_and_auth(self):
        png=b'\x89PNG\r\n\x1a\nfixture'
        status,body,_=self.request('/api/foto',{'foto':'data:image/png;base64,'+base64.b64encode(png).decode()})
        self.assertEqual(status,200);name=json.loads(body)['arquivo'];self.assertTrue(name.endswith('.png'))
        status,data,headers=self.request('/fotos/'+name);self.assertEqual(data,png)
        self.assertEqual(headers['Access-Control-Allow-Origin'],'*')
        self.assertEqual(self.request('/fotos/'+name,token='')[0],401)
        for value in [None,123,'!!!','data:text/html;base64,PHNjcmlwdD4=']:
            self.assertEqual(self.request('/api/foto',{'foto':value})[0],400)
    def test_retry_and_conflicting_edit(self):
        self.create()
        edit={'id':'edit1','tipo':'piso','baseVersion':1,'piso':dict(piso(),nome='UPDATED')}
        self.assertEqual(self.operation(edit)[0],200)
        self.assertEqual(self.operation(edit)[0],200)
        self.assertEqual(server.ler_estado()['revision'],2)
        edit['id']='edit2';self.assertEqual(self.operation(edit)[0],409)
        self.assertEqual(server.ler_pisos()[0]['nome'],'UPDATED')
    def test_atomic_sale_idempotency_and_cancel(self):
        self.create(stock=2)
        self.assertEqual(self.operation(self.sale())[0],200)
        self.assertEqual(self.operation(self.sale())[0],200)
        self.assertEqual(server.ler_pisos()[0]['estoque'],1);self.assertEqual(len(server.ler_vendas()),1)
        self.assertEqual(self.operation(self.sale('oversell',2))[0],409)
        self.assertEqual(len(server.ler_vendas()),1)
        self.assertEqual(self.operation({'id':'cancel','tipo':'cancelarVenda','vendaId':'sale'})[0],200)
        self.assertEqual(server.ler_pisos()[0]['estoque'],2)
        self.assertEqual(self.operation({'id':'cancel2','tipo':'cancelarVenda','vendaId':'sale'})[0],409)
    def test_partial_sale_failure_rolls_back(self):
        self.create(stock=1)
        sale=self.sale();sale['itens'].append({'pisoId':'missing','quantidade':1,'unidade':'caixas','total':10})
        self.assertEqual(self.operation(sale)[0],409)
        self.assertEqual(server.ler_pisos()[0]['estoque'],1);self.assertEqual(server.ler_vendas(),[])
    def test_concurrent_last_box(self):
        from concurrent.futures import ThreadPoolExecutor
        self.create(stock=1)
        with ThreadPoolExecutor(2) as pool: results=list(pool.map(lambda name:self.operation(self.sale(name))[0],['a','b']))
        self.assertEqual(sorted(results),[200,409]);self.assertEqual(server.ler_pisos()[0]['estoque'],0)
    def test_price_change_and_validation(self):
        self.create()
        self.assertEqual(self.operation(self.sale('wrongprice',1)|{'itens':[{'pisoId':'tile','unidade':'caixas','quantidade':1,'total':1}]})[0],409)
        self.assertEqual(self.operation({'id':'bad','tipo':'piso','baseVersion':1,'piso':dict(piso(),estoque=-1)})[0],400)
    def test_backup_restore_identity_and_conflict(self):
        self.create();before=server.ler_estado();backup=server.criar_backup()
        self.operation(self.sale())
        with self.assertRaises(server.Conflict):server.restaurar_backup(backup,before['revision'])
        restored=server.restaurar_backup(backup,server.ler_estado()['revision'])
        self.assertEqual(restored['pisos'][0]['estoque'],10)
        self.assertNotEqual(restored['serverId'],before['serverId'])
        with self.assertRaises(server.Conflict):server.sincronizar(self.sale(),before['serverId'])
    def test_legacy_migration_preserves_records_and_stable_ids(self):
        with server.conectar_banco() as connection:
            connection.execute("UPDATE app_data SET pisos=?,vendas=?",(json.dumps([piso()]),json.dumps([{'data':'2026-01-01','itens':[],'total':0}])))
        server.inicializar_banco();first=server.ler_estado();server.inicializar_banco();second=server.ler_estado()
        self.assertEqual(first,second);self.assertEqual(first['pisos'][0]['estoque'],10);self.assertTrue(first['vendas'][0]['id'])

if __name__=='__main__':
    if '--serve' in sys.argv:
        with tempfile.TemporaryDirectory(dir=PROJECT/'tests') as directory:
            configure(directory)
            print('Isolated server on 127.0.0.1:8765',flush=True)
            server.ThreadingHTTPServer(('127.0.0.1',8765),server.AppHandler).serve_forever()
    else:unittest.main()

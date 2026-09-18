"""LAN inventory server. All data/photo access requires a shared access token."""
from contextlib import contextmanager, closing
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse
import base64
import hashlib
import hmac
import io
import json
import math
import os
import re
import secrets
import sqlite3
import uuid
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / 'dados.sqlite3'
PASTA_FOTOS = ROOT / 'fotos'
TOKEN_FILE = ROOT / '.server-token'
AUTH_TOKEN = os.environ.get('PISOS_API_TOKEN', '')
PUBLIC_FILES = {'/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css',
                '/logica.js': 'logica.js', '/sincronizacao.js': 'sincronizacao.js'}
PHOTO_NAME = re.compile(r'^[a-f0-9]{32}\.(jpg|png|webp)$')

class Conflict(ValueError):
    pass

@contextmanager
def conectar_banco():
    banco = sqlite3.connect(DATABASE, timeout=20)
    try:
        with banco:
            yield banco
    finally:
        banco.close()

def agora():
    return datetime.now(timezone.utc).isoformat()

def inicializar_banco():
    PASTA_FOTOS.mkdir(exist_ok=True, parents=True)
    with conectar_banco() as banco:
        banco.execute("CREATE TABLE IF NOT EXISTS app_data (id INTEGER PRIMARY KEY CHECK(id=1), pisos TEXT NOT NULL)")
        cols = {r[1] for r in banco.execute('PRAGMA table_info(app_data)')}
        for col, definition in [('vendas', "TEXT NOT NULL DEFAULT '[]'"), ('orcamentos', "TEXT NOT NULL DEFAULT '[]'"),
                                ('movimentos', "TEXT NOT NULL DEFAULT '[]'"), ('revision', 'INTEGER NOT NULL DEFAULT 0'),
                                ('server_id', "TEXT NOT NULL DEFAULT ''")]:
            if col not in cols:
                banco.execute(f'ALTER TABLE app_data ADD COLUMN {col} {definition}')
        banco.execute("INSERT OR IGNORE INTO app_data (id,pisos) VALUES(1,'[]')")
        banco.execute('CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL)')
        state = ler_estado(banco)
        for collection in ('pisos', 'vendas', 'orcamentos'):
            for item in state[collection]:
                item.setdefault('id', uuid.uuid4().hex)
                item.setdefault('version', 1)
        if not state['serverId']:
            state['serverId'] = uuid.uuid4().hex
        gravar_estado(banco, state)

def ler_estado(banco=None):
    if banco is None:
        with conectar_banco() as connection:
            return ler_estado(connection)
    row = banco.execute('SELECT pisos,vendas,orcamentos,movimentos,revision,server_id FROM app_data WHERE id=1').fetchone()
    return dict(zip(('pisos', 'vendas', 'orcamentos', 'movimentos'), (json.loads(v) for v in row[:4])),
                revision=row[4], serverId=row[5])

def gravar_estado(banco, state):
    banco.execute('UPDATE app_data SET pisos=?,vendas=?,orcamentos=?,movimentos=?,revision=?,server_id=? WHERE id=1',
                  tuple(json.dumps(state[k], ensure_ascii=False, allow_nan=False) for k in ('pisos','vendas','orcamentos','movimentos'))
                  + (state['revision'], state['serverId']))

def ler_pisos(): return ler_estado()['pisos']
def ler_vendas(): return ler_estado()['vendas']

def numero(value, name, minimum=0, integer=False):
    if isinstance(value, bool): raise ValueError(f'{name}: número inválido')
    try: result = float(value)
    except (TypeError, ValueError): raise ValueError(f'{name}: número inválido')
    if not math.isfinite(result) or result < minimum or (integer and not result.is_integer()):
        raise ValueError(f'{name}: valor inválido')
    return int(result) if integer else result

def texto(value, name, limit=200):
    if not isinstance(value,str) or not value.strip() or len(value)>limit:
        raise ValueError(f'{name}: texto inválido')
    return value.strip()

def total_pecas(piso):
    return int(piso['estoque']) * int(piso['pecasPorCaixa']) + int(piso.get('pecasAbertas') or 0)

def validar_piso(raw, verificar_arquivos=True):
    if not isinstance(raw, dict): raise ValueError('Piso inválido')
    item = {k: texto(raw.get(k), k) for k in ('id','nome')}
    item['modeloId'] = texto(raw.get('modeloId', item['id']), 'modeloId')
    for key in ('bitola','tonalidade','cor','textura','resistencia'):
        value = raw.get(key, '')
        if not isinstance(value,(str,int,float)) or len(str(value))>200: raise ValueError(f'{key}: valor inválido')
        item[key] = str(value)
    for key in ('altura','largura','caixa'):
        item[key] = numero(raw.get(key),key,minimum=0.0001)
    item['preco'] = numero(raw.get('preco'), 'preco')
    for key in ('estoque','pecasAbertas','estoqueMinimo'):
        item[key] = numero(raw.get(key) or 0, key, integer=True)
    item['pecasPorCaixa'] = numero(raw.get('pecasPorCaixa'), 'pecasPorCaixa', minimum=1, integer=True)
    # Older records may hold complete boxes in the open-piece count. Preserve total stock.
    extra, item['pecasAbertas'] = divmod(item['pecasAbertas'], item['pecasPorCaixa'])
    item['estoque'] += extra
    item['ativo'] = raw.get('ativo',True)
    if not isinstance(item['ativo'],bool): raise ValueError('Ativo deve ser booleano')
    photos = raw.get('fotos',[])
    if not isinstance(photos,list) or len(photos)>3: raise ValueError('Máximo de três fotos')
    for photo in photos:
        if not isinstance(photo,str) or not photo.startswith('fotos/') or not PHOTO_NAME.fullmatch(photo[6:]):
            raise ValueError('Foto deve estar armazenada neste servidor')
        if verificar_arquivos and not (PASTA_FOTOS / photo[6:]).is_file(): raise ValueError('Arquivo de foto não encontrado')
    item['fotos'] = photos
    return item

def encontrar(items, item_id):
    return next((v for v in items if v.get('id')==item_id), None)

def movimento(state, piso, delta, motivo, operation):
    if delta:
        state['movimentos'].append({'id':uuid.uuid4().hex,'pisoId':piso['id'],'nome':piso['nome'],
                                   'pecas':delta,'motivo':motivo,'data':agora(),'operationId':operation})

def aplicar_operacao(state, op):
    kind = op.get('tipo')
    if kind == 'piso':
        item = validar_piso(op.get('piso'))
        old = encontrar(state['pisos'], item['id'])
        expected = old.get('version',1) if old else 0
        if op.get('baseVersion') != expected: raise Conflict('Este piso foi alterado em outro aparelho. Revise as alterações pendentes.')
        if old and 'modeloId' not in op['piso']:
            item['modeloId'] = old.get('modeloId', old['id'])
        def lote_codigo(value):
            value = str(value).strip()
            return str(int(value)) if value.isascii() and value.isdigit() else value
        if any(p['id'] != item['id'] and p.get('modeloId', p['id']) == item['modeloId']
               and all(lote_codigo(p.get(k, '')) == lote_codigo(item[k]) for k in ('bitola', 'tonalidade'))
               for p in state['pisos']):
            raise Conflict('Já existe um lote com essa bitola e tonalidade neste modelo.')
        item['version'] = expected + 1
        delta = total_pecas(item) - (total_pecas(old) if old else 0)
        if old: state['pisos'][state['pisos'].index(old)] = item
        else: state['pisos'].append(item)
        movimento(state,item,delta,'Cadastro / ajuste de estoque',op['id'])
    elif kind == 'venda':
        if encontrar(state['vendas'],op['id']): raise Conflict('Venda já existente')
        raw_items = op.get('itens')
        if not isinstance(raw_items,list) or not raw_items or len(raw_items)>200: raise ValueError('Itens da venda inválidos')
        needed, items = {}, []
        for raw in raw_items:
            if not isinstance(raw,dict): raise ValueError('Item inválido')
            piso = encontrar(state['pisos'],raw.get('pisoId'))
            if not piso or not piso.get('ativo',True): raise Conflict('Produto indisponível para venda')
            qty = numero(raw.get('quantidade'),'quantidade',minimum=1,integer=True)
            unit = raw.get('unidade')
            if unit not in ('caixas','pecas'): raise ValueError('Unidade inválida')
            pieces = qty * int(piso['pecasPorCaixa']) if unit=='caixas' else qty
            needed[piso['id']] = needed.get(piso['id'],0)+pieces
            area = qty * float(piso['caixa']) if unit=='caixas' else qty * float(piso['altura'])*float(piso['largura'])/10000
            price = float(piso['preco']) * (1.2 if unit=='pecas' else 1)
            total = round(area*price,2)
            if abs(numero(raw.get('total'),'total')-total)>0.011: raise Conflict('O preço mudou. Atualize o orçamento antes de confirmar.')
            items.append({'pisoId':piso['id'],'nome':piso['nome'],'quantidade':qty,'unidade':unit,'pecas':pieces,'total':total})
        for item_id, pieces in needed.items():
            piso = encontrar(state['pisos'],item_id)
            remaining = total_pecas(piso)-pieces
            if remaining<0: raise Conflict(f'Estoque insuficiente: {piso["nome"]}')
            piso['estoque'],piso['pecasAbertas'] = divmod(remaining,int(piso['pecasPorCaixa']))
            piso['version'] = piso.get('version',1)+1
            movimento(state,piso,-pieces,'Venda',op['id'])
        customer = op.get('cliente','')
        if not isinstance(customer,str) or len(customer)>200: raise ValueError('Cliente inválido')
        state['vendas'].append({'id':op['id'],'data':agora(),'cliente':customer,'itens':items,'total':round(sum(i['total'] for i in items),2),'version':1})
    elif kind == 'cancelarVenda':
        sale = encontrar(state['vendas'],op.get('vendaId'))
        if not sale or sale.get('cancelada'): raise Conflict('Venda inexistente ou já cancelada')
        if not all(i.get('pisoId') and i.get('pecas') for i in sale['itens']): raise Conflict('Venda antiga: faça um ajuste manual de estoque')
        for item in sale['itens']:
            piso=encontrar(state['pisos'],item['pisoId'])
            if not piso: raise Conflict('Produto não encontrado')
            piso['estoque'],piso['pecasAbertas']=divmod(total_pecas(piso)+item['pecas'],int(piso['pecasPorCaixa']))
            piso['version']=piso.get('version',1)+1
            movimento(state,piso,item['pecas'],'Cancelamento de venda',op['id'])
        sale['cancelada']=True; sale['canceladaEm']=agora(); sale['version']=sale.get('version',1)+1
    elif kind == 'orcamento':
        quote=op.get('orcamento')
        if not isinstance(quote,dict): raise ValueError('Orçamento inválido')
        quote=json.loads(json.dumps(quote,allow_nan=False))
        texto(quote.get('id'),'id');texto(quote.get('cliente'),'cliente')
        if not isinstance(quote.get('itens'),list) or len(quote['itens'])>200: raise ValueError('Itens inválidos')
        for item in quote['itens']:
            if not isinstance(item,dict): raise ValueError('Item inválido')
            texto(item.get('pisoId'),'pisoId');numero(item.get('quantidade'),'quantidade',minimum=1,integer=True)
            if item.get('unidade') not in ('caixas','pecas'): raise ValueError('Unidade inválida')
            for field in ('total','metros','preco','pecasReservadas'): numero(item.get(field),field)
            texto(item.get('nome'),'nome')
        if not isinstance(quote.get('telefone',''),str) or len(quote.get('telefone',''))>100: raise ValueError('Telefone inválido')
        old=encontrar(state['orcamentos'],quote['id']);version=old.get('version',1) if old else 0
        if op.get('baseVersion')!=version: raise Conflict('Orçamento alterado em outro aparelho')
        quote['version']=version+1;quote['atualizadoEm']=agora()
        if old: state['orcamentos'][state['orcamentos'].index(old)]=quote
        else: state['orcamentos'].append(quote)
    else: raise ValueError('Operação desconhecida')

def sincronizar(op, server_id):
    if not isinstance(op,dict): raise ValueError('Operação inválida')
    operation_id=texto(op.get('id'),'id',100)
    fingerprint=hashlib.sha256(json.dumps(op,sort_keys=True,allow_nan=False).encode()).hexdigest()
    with conectar_banco() as banco:
        banco.execute('BEGIN IMMEDIATE')
        state=ler_estado(banco)
        if server_id!=state['serverId']: raise Conflict('Servidor diferente. Verifique as configurações antes de sincronizar.')
        previous=banco.execute('SELECT fingerprint FROM operations WHERE id=?',(operation_id,)).fetchone()
        if previous:
            if previous[0]!=fingerprint: raise Conflict('Identificador reutilizado com conteúdo diferente')
            return state
        aplicar_operacao(state,op)
        state['revision']+=1
        gravar_estado(banco,state)
        banco.execute('INSERT INTO operations VALUES(?,?)',(operation_id,fingerprint))
        return state

def salvar_foto(data):
    if not isinstance(data,str): raise ValueError('Foto deve ser base64')
    if ',' in data:
        header,data=data.split(',',1)
        if header not in ('data:image/jpeg;base64','data:image/png;base64','data:image/webp;base64'): raise ValueError('Formato não suportado')
    image=base64.b64decode(data,validate=True)
    if image.startswith(b'\xff\xd8\xff'): ext='jpg'
    elif image.startswith(b'\x89PNG\r\n\x1a\n'): ext='png'
    elif image.startswith(b'RIFF') and image[8:12]==b'WEBP': ext='webp'
    else: raise ValueError('Imagem inválida')
    name=hashlib.sha256(image).hexdigest()[:32]+'.'+ext
    target=PASTA_FOTOS/name
    if not target.exists():
        temp=target.with_suffix('.'+uuid.uuid4().hex+'.tmp');temp.write_bytes(image);os.replace(temp,target)
    return name

def criar_backup():
    # Read state + idempotency log in a single SQLite read transaction.
    with conectar_banco() as banco:
        banco.execute('BEGIN')
        state=ler_estado(banco)
        state['operations']=list(banco.execute('SELECT id,fingerprint FROM operations'))
    result=io.BytesIO()
    with zipfile.ZipFile(result,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('estado.json',json.dumps(state,ensure_ascii=False))
        for file in PASTA_FOTOS.iterdir():
            if PHOTO_NAME.fullmatch(file.name): archive.write(file,'fotos/'+file.name)
    return result.getvalue()

def restaurar_backup(content, expected_revision):
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        infos=archive.infolist()
        if len(infos)>10000 or sum(i.file_size for i in infos)>256*1024*1024: raise ValueError('Backup muito grande')
        if len({i.filename for i in infos})!=len(infos): raise ValueError('Arquivos duplicados no backup')
        if archive.getinfo('estado.json').file_size > 32*1024*1024: raise ValueError('Dados do backup muito grandes')
        state=json.loads(archive.read('estado.json'))
        if not isinstance(state,dict) or not all(isinstance(state.get(k),list) for k in ('pisos','vendas','orcamentos','movimentos')): raise ValueError('Backup inválido')
        for info in infos:
            if info.filename!='estado.json' and not (info.filename.startswith('fotos/') and PHOTO_NAME.fullmatch(info.filename[6:])): raise ValueError('Arquivo não permitido no backup')
        photos={i.filename[6:]:archive.read(i) for i in infos if i.filename.startswith('fotos/')}
        for collection in ('pisos','vendas','orcamentos'):
            ids=[i.get('id') for i in state[collection] if isinstance(i,dict)]
            if len(ids)!=len(state[collection]) or any(not isinstance(i,str) or not i for i in ids) or len(set(ids))!=len(ids): raise ValueError('Registros inválidos')
        for piso in state['pisos']:
            validar_piso(piso, verificar_arquivos=False)
            numero(piso.get('version',1),'version',minimum=1,integer=True)
            for photo in piso.get('fotos',[]):
                if not isinstance(photo,str) or not photo.startswith('fotos/') or photo[6:] not in photos: raise ValueError('Foto ausente do backup')
        for sale in state['vendas']:
            texto(sale.get('data'),'data');numero(sale.get('total'),'total')
            if not isinstance(sale.get('itens'),list): raise ValueError('Venda inválida')
            for item in sale['itens']:
                if not isinstance(item,dict): raise ValueError('Item inválido')
                texto(item.get('nome'),'nome');numero(item.get('quantidade'),'quantidade',minimum=1,integer=True);numero(item.get('total'),'total')
        for quote in state['orcamentos']:
            texto(quote.get('cliente'),'cliente')
            if not isinstance(quote.get('itens'),list): raise ValueError('Orçamento inválido')
            for item in quote['itens']:
                if not isinstance(item,dict): raise ValueError('Item inválido')
                texto(item.get('pisoId'),'pisoId');texto(item.get('nome'),'nome')
                for field in ('quantidade','total','metros','preco','pecasReservadas'): numero(item.get(field),field)
        for move in state['movimentos']:
            if not isinstance(move,dict) or not all(key in move for key in ('nome','pecas','motivo','data')): raise ValueError('Histórico inválido')
        with conectar_banco() as banco:
            banco.execute('BEGIN IMMEDIATE');old=ler_estado(banco)
            if expected_revision!=old['revision']: raise Conflict('Os dados mudaram. Faça um novo backup e tente novamente.')
            for name,data in photos.items():
                target=PASTA_FOTOS/name
                if target.exists() and target.read_bytes()!=data: raise ValueError('Foto com conteúdo conflitante')
            for name,data in photos.items(): (PASTA_FOTOS/name).write_bytes(data)
            # Rotate dataset identity: stale devices cannot replay operations into restored data.
            state['serverId']=uuid.uuid4().hex;state['revision']=old['revision']+1
            gravar_estado(banco,state);banco.execute('DELETE FROM operations')
    return state

class AppHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def enviar_json(self,status,data):
        self.enviar_bytes(status,json.dumps(data,ensure_ascii=False,allow_nan=False).encode(),'application/json; charset=utf-8')
    def enviar_bytes(self,status,data,mime):
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(data)));self.end_headers()
        if self.command!='HEAD': self.wfile.write(data)
    def autorizado(self):
        supplied=self.headers.get('Authorization','')
        return bool(AUTH_TOKEN) and hmac.compare_digest(supplied.encode('utf-8'),('Bearer '+AUTH_TOKEN).encode('utf-8'))
    def do_OPTIONS(self):
        self.send_response(204);self.send_header('Access-Control-Allow-Methods','GET, HEAD, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type, Authorization, If-Match');self.end_headers()
    def do_HEAD(self): self.do_GET()
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path in PUBLIC_FILES:
            file=ROOT/PUBLIC_FILES[path]
            if file.is_file(): self.enviar_bytes(200,file.read_bytes(),self.guess_type(str(file)));return
        if path=='/api/health': self.enviar_json(200,{'ok':True,'apiVersion':2});return
        if not self.autorizado(): self.enviar_json(401,{'erro':'Informe a chave de acesso em Configurações.'});return
        if path=='/api/state': self.enviar_json(200,ler_estado());return
        if path=='/api/pisos': self.enviar_json(200,ler_pisos());return
        if path=='/api/vendas': self.enviar_json(200,ler_vendas());return
        if path=='/api/backup': self.enviar_bytes(200,criar_backup(),'application/zip');return
        if path.startswith('/fotos/') and PHOTO_NAME.fullmatch(path[7:]):
            file=PASTA_FOTOS/path[7:]
            if file.is_file(): self.enviar_bytes(200,file.read_bytes(),self.guess_type(str(file)));return
        self.enviar_json(404,{'erro':'Não encontrado'})
    def do_POST(self):
        if not self.autorizado(): self.enviar_json(401,{'erro':'Chave de acesso inválida'});return
        path=urlsplit(self.path).path
        try:
            size=int(self.headers.get('Content-Length','0'))
            limit=256*1024*1024 if path=='/api/restore' else 20*1024*1024
            if size<=0 or size>limit: raise ValueError('Tamanho de requisição inválido')
            self.connection.settimeout(20);body=self.rfile.read(size)
            if len(body)!=size: raise ValueError('Corpo incompleto')
            if path=='/api/restore':
                backup_dir=ROOT/'backups';backup_dir.mkdir(exist_ok=True)
                (backup_dir/('antes-restauracao-'+uuid.uuid4().hex+'.zip')).write_bytes(criar_backup())
                self.enviar_json(200,restaurar_backup(body,int(self.headers.get('If-Match','-1'))));return
            data=json.loads(body)
            if not isinstance(data,dict): raise ValueError('O corpo deve ser um objeto')
            if path=='/api/foto': self.enviar_json(200,{'arquivo':salvar_foto(data.get('foto'))});return
            if path=='/api/sync': self.enviar_json(200,sincronizar(data.get('operation'),data.get('serverId')));return
            self.enviar_json(426,{'erro':'Atualize o aplicativo para sincronização segura.'})
        except Conflict as error: self.enviar_json(409,{'erro':str(error)})
        except (ValueError,TypeError,KeyError,zipfile.BadZipFile,base64.binascii.Error) as error: self.enviar_json(400,{'erro':str(error)})
        except (ConnectionError,TimeoutError): return
    def do_PUT(self): self.do_POST()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
    if DATABASE.exists():
        # Keep a consistent pre-migration DB copy; photos remain untouched.
        backup_dir=ROOT/'backups';backup_dir.mkdir(exist_ok=True)
        backup=backup_dir/'antes-migracao-v2.sqlite3'
        if not backup.exists():
            with closing(sqlite3.connect(DATABASE)) as source, closing(sqlite3.connect(backup)) as dest: source.backup(dest)
    inicializar_banco()
    backup_dir=ROOT/'backups';backup_dir.mkdir(exist_ok=True)
    initial_backup=backup_dir/'backup-inicial-v2.zip'
    if not initial_backup.exists(): initial_backup.write_bytes(criar_backup())
    if not AUTH_TOKEN:
        if not TOKEN_FILE.exists(): TOKEN_FILE.write_text(secrets.token_urlsafe(32),encoding='utf-8')
        AUTH_TOKEN=TOKEN_FILE.read_text(encoding='utf-8').strip()
    if not AUTH_TOKEN: raise SystemExit('Configure uma chave de acesso não vazia.')
    try: http=ThreadingHTTPServer(('0.0.0.0',args.port),AppHandler)
    except OSError as error: raise SystemExit(f'Não foi possível iniciar o servidor: {error}')
    print(f'Servidor na porta {args.port}. Chave de acesso em {TOKEN_FILE.name} (ou PISOS_API_TOKEN).',flush=True)
    http.serve_forever()

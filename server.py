import json
import sqlite3
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "dados.sqlite3"


def inicializar_banco():
    with sqlite3.connect(DATABASE) as banco:
        banco.execute(
            "CREATE TABLE IF NOT EXISTS app_data (id INTEGER PRIMARY KEY CHECK (id = 1), pisos TEXT NOT NULL)"
        )
        colunas = [linha[1] for linha in banco.execute("PRAGMA table_info(app_data)")]
        if "vendas" not in colunas:
            banco.execute("ALTER TABLE app_data ADD COLUMN vendas TEXT NOT NULL DEFAULT '[]'")
        banco.execute("INSERT OR IGNORE INTO app_data (id, pisos, vendas) VALUES (1, '[]', '[]')")


def ler_pisos():
    with sqlite3.connect(DATABASE) as banco:
        registro = banco.execute("SELECT pisos FROM app_data WHERE id = 1").fetchone()
    return json.loads(registro[0])


def salvar_pisos(pisos):
    with sqlite3.connect(DATABASE) as banco:
        banco.execute(
            "UPDATE app_data SET pisos = ? WHERE id = 1",
            (json.dumps(pisos, ensure_ascii=False),),
        )


def ler_vendas():
    with sqlite3.connect(DATABASE) as banco:
        registro = banco.execute("SELECT vendas FROM app_data WHERE id = 1").fetchone()
    return json.loads(registro[0])


def salvar_vendas(vendas):
    with sqlite3.connect(DATABASE) as banco:
        banco.execute(
            "UPDATE app_data SET vendas = ? WHERE id = 1",
            (json.dumps(vendas, ensure_ascii=False),),
        )


class AppHandler(SimpleHTTPRequestHandler):
    def enviar_json(self, status, dados):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/pisos":
            self.enviar_json(200, ler_pisos())
            return
        if self.path == "/api/vendas":
            self.enviar_json(200, ler_vendas())
            return
        super().do_GET()

    def salvar_requisicao(self):
        if self.path not in ("/api/pisos", "/api/vendas"):
            self.enviar_json(404, {"erro": "Rota nao encontrada"})
            return

        try:
            tamanho = int(self.headers.get("Content-Length", "0"))
            corpo = self.rfile.read(tamanho)
            if len(corpo) < tamanho:
                raise ValueError("Corpo incompleto: conexao interrompida")
            dados = json.loads(corpo)
            if not isinstance(dados, list):
                raise ValueError("O corpo deve ser uma lista")
            if self.path == "/api/pisos":
                salvar_pisos(dados)
            else:
                salvar_vendas(dados)
        except (ConnectionResetError, ConnectionAbortedError):
            return
        except (ValueError, json.JSONDecodeError) as erro:
            self.enviar_json(400, {"erro": str(erro)})
            return

        self.enviar_json(200, {"ok": True})
        
    def do_POST(self):
        self.salvar_requisicao()

    def do_PUT(self):
        self.salvar_requisicao()


if __name__ == "__main__":
    inicializar_banco()
    handler = partial(AppHandler, directory=str(ROOT))
    try:
        servidor = ThreadingHTTPServer(("0.0.0.0", 8000), handler)
    except OSError as erro:
        if getattr(erro, "winerror", None) == 10048 or erro.errno == 98:
            print("A porta 8000 ja esta em uso. Feche o outro servidor ou use a instancia que ja esta rodando.")
        else:
            print(f"Nao foi possivel iniciar o servidor: {erro}")
        raise SystemExit(1)

    print("Servidor em http://0.0.0.0:8000")
    print("Use no celular o endereco http://IP_DESTE_COMPUTADOR:8000")
    servidor.serve_forever()
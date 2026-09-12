import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "dados.sqlite3"


def inicializar_banco():
    with sqlite3.connect(DATABASE) as banco:
        banco.execute(
            "CREATE TABLE IF NOT EXISTS app_data (id INTEGER PRIMARY KEY CHECK (id = 1), pisos TEXT NOT NULL)"
        )
        banco.execute("INSERT OR IGNORE INTO app_data (id, pisos) VALUES (1, '[]')")


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
        super().do_GET()

    def salvar_requisicao(self):
        if self.path != "/api/pisos":
            self.enviar_json(404, {"erro": "Rota nao encontrada"})
            return

        try:
            tamanho = int(self.headers.get("Content-Length", "0"))
            pisos = json.loads(self.rfile.read(tamanho))
            if not isinstance(pisos, list):
                raise ValueError("O corpo deve ser uma lista de pisos")
            salvar_pisos(pisos)
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
    servidor = ThreadingHTTPServer(("0.0.0.0", 8000), AppHandler)
    print("Servidor em http://0.0.0.0:8000")
    print("Use no celular o endereco http://IP_DESTE_COMPUTADOR:8000")
    servidor.serve_forever()
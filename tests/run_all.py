"""Run API + browser checks against a fresh isolated database."""
import os, subprocess, tempfile, threading, unittest
from pathlib import Path
import test_photos
import server

if __name__ == '__main__':
    result=unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromTestCase(test_photos.ServerTests))
    if not result.wasSuccessful():raise SystemExit(1)
    with tempfile.TemporaryDirectory(dir=test_photos.PROJECT/'tests') as temp:
        test_photos.configure(temp)
        http=server.ThreadingHTTPServer(('127.0.0.1',8765),server.AppHandler)
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            for name in ('photos.browser.cjs','recovery.browser.cjs','lotes.browser.cjs'):
                subprocess.run(['node',str(Path(__file__).parent/name)],cwd=test_photos.PROJECT,check=True)
        finally:
            http.shutdown();http.server_close();thread.join()

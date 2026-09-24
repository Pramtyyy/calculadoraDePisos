"""Release publication tests use isolated files and mocked SDK inspection."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import publicar_atualizacao as publisher


class PublicationTests(unittest.TestCase):
    def test_atomic_publication_and_reject_downgrade_or_wrong_signer(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            apk = root / 'new.apk'
            apk.write_bytes(b'APK fixture')
            output = root / 'updates'
            current = dict(packageName=publisher.PACKAGE, versionCode=3, versionName='1.2')
            new = dict(packageName=publisher.PACKAGE, versionCode=4, versionName='1.3')
            def publish(candidate, signer='trusted'):
                with patch.object(publisher, 'inspect_apk', side_effect=[(candidate.copy(), [signer]), (current, ['trusted'])]):
                    return publisher.publish(apk, root / 'old.apk', output, root, 'java')
            result = publish(new)
            self.assertEqual(json.loads((output / 'latest.json').read_text()), result)
            self.assertEqual((output / (result['sha256'] + '.apk')).read_bytes(), apk.read_bytes())
            original = (output / 'latest.json').read_bytes()
            for candidate, signer in [(new, 'trusted'), (current, 'trusted'),
                                      (dict(new, versionCode=5), 'untrusted')]:
                with self.assertRaises(ValueError): publish(candidate, signer)
                self.assertEqual((output / 'latest.json').read_bytes(), original)


if __name__ == '__main__':
    unittest.main()

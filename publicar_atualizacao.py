"""Publish a signed APK for the LAN updater without changing inventory data."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
PACKAGE = 'br.com.calculadordepisos'


def inspect_apk(apk, build_tools, java):
    verify = subprocess.run([str(java), '-jar', str(build_tools / 'lib' / 'apksigner.jar'),
                             'verify', '--print-certs', str(apk)], capture_output=True, text=True)
    if verify.returncode:
        raise ValueError(f'APK sem assinatura válida: {apk.name}')
    certs = sorted(re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]+)', verify.stdout))
    if not certs:
        raise ValueError('Não foi possível identificar o certificado do APK.')
    aapt = build_tools / ('aapt.exe' if os.name == 'nt' else 'aapt')
    result = subprocess.run([str(aapt), 'dump', 'badging', str(apk)], capture_output=True, text=True, check=True)
    package = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'", result.stdout)
    if not package or package[1] != PACKAGE:
        raise ValueError('O APK deve pertencer ao Calculador de Pisos de produção.')
    if 'application-debuggable' in result.stdout:
        raise ValueError('Publique um APK release, sem depuração.')
    return {'packageName': package[1], 'versionCode': int(package[2]), 'versionName': package[3]}, certs


def publish(apk, reference, directory, build_tools, java):
    # Inspect the exact snapshot that will be published, even if a build replaces its output.
    directory.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='publish-', dir=directory) as temp:
        snapshot = Path(temp) / 'release.apk'
        shutil.copyfile(apk, snapshot)
        size = snapshot.stat().st_size
        if not 0 < size <= 256 * 1024 * 1024:
            raise ValueError('Tamanho do APK inválido.')
        release, certificates = inspect_apk(snapshot, build_tools, java)
        previous, trusted = inspect_apk(reference, build_tools, java)
        if certificates != trusted:
            raise ValueError('O APK usa uma chave diferente da versão de referência instalada.')
        if release['versionCode'] <= previous['versionCode']:
            raise ValueError('A nova versão deve ter versionCode maior que a referência.')
        manifest = directory / 'latest.json'
        if manifest.exists():
            current = json.loads(manifest.read_text(encoding='utf-8'))
            if release['versionCode'] <= current['versionCode']:
                raise ValueError('A versão deve ser maior que a já publicada.')
        with snapshot.open('rb') as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        release.update(sha256=digest, size=size)
        target = directory / (digest + '.apk')
        if not target.exists():
            os.replace(snapshot, target)
        elif target.read_bytes() != snapshot.read_bytes():
            raise ValueError('Arquivo publicado com conteúdo conflitante.')
        pointer = Path(temp) / 'latest.json'
        pointer.write_text(json.dumps(release, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        os.replace(pointer, manifest)
    return release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path, help='Novo APK release assinado')
    parser.add_argument('--reference', type=Path, default=ROOT / 'android/app/release/app-release.apk',
                        help='APK assinado anteriormente instalado nos aparelhos')
    parser.add_argument('--output', type=Path, default=ROOT / 'updates')
    sdk_default = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or str(Path.home() / 'AppData/Local/Android/Sdk')
    parser.add_argument('--sdk', type=Path, default=Path(sdk_default))
    java_default = str(Path(os.environ['JAVA_HOME']) / 'bin/java.exe') if os.name == 'nt' and os.environ.get('JAVA_HOME') else 'java'
    parser.add_argument('--java', default=java_default)
    args = parser.parse_args()
    try:
        candidates = [p for p in (args.sdk / 'build-tools').iterdir() if (p / 'lib/apksigner.jar').is_file()]
        tools = max(candidates, key=lambda p: tuple(int(n) for n in re.findall(r'\d+', p.name)))
        release = publish(args.apk.resolve(), args.reference.resolve(), args.output.resolve(), tools, args.java)
        print(f"Versão {release['versionName']} (código {release['versionCode']}) publicada em {args.output}.")
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        parser.exit(1, f'Publicação não concluída: {error}\n')


if __name__ == '__main__':
    main()

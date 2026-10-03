from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'extension/manifest.json').read_text())['version']
files=['extension/manifest.json','extension/core.js','extension/background.js','extension/content.js','native/host.py','scripts/install.py','install-macos.command','extension-id.txt','README.md','PRIVACY.md','LICENSE']
out=root/'artifacts';out.mkdir(exist_ok=True);dest=out/f'dedao-longtalk-{version}.zip'
with ZipFile(dest,'w',ZIP_DEFLATED) as z:
 for name in files:z.write(root/name,f'dedao-longtalk-{version}/{name}')
digest=hashlib.sha256(dest.read_bytes()).hexdigest();(out/(dest.name+'.sha256')).write_text(f'{digest}  {dest.name}\n');print(dest);print(digest)

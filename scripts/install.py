#!/usr/bin/env python3
"""Install a per-user native host. Does not modify browser prefs or Codex auth."""
import argparse,json,os,shlex,shutil,sys
from pathlib import Path
NAME='com.baiyalab.dedao_longtalk'
ROOT=Path(__file__).resolve().parents[1]
def install(registries=None):
    if sys.platform!='darwin':raise SystemExit('本版安装脚本仅支持 macOS。')
    codex=shutil.which('codex')
    if not codex:raise SystemExit('未找到 Codex，请先安装 Codex CLI 并执行 codex login。')
    dest=Path.home()/'Library/Application Support/DedaoLongtalk/host';dest.mkdir(parents=True,exist_ok=True);dest.chmod(0o700)
    shutil.copy2(ROOT/'native/host.py',dest/'host.py')
    id=(ROOT/'extension-id.txt').read_text().strip()
    config={'codex':str(Path(codex).absolute()),'origins':[f'chrome-extension://{id}/']}
    (dest/'config.json').write_text(json.dumps(config,ensure_ascii=False));(dest/'config.json').chmod(0o600)
    launcher=dest/'run-host';launcher.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(dest/'host.py'))+' "$@"\n');launcher.chmod(0o700)
    manifest={'name':NAME,'description':'得到长谈速览本机 Codex 连接程序','path':str(launcher),'type':'stdio','allowed_origins':config['origins']}
    dirs=registries or [Path.home()/'Library/Application Support/Google/Chrome/NativeMessagingHosts']
    for directory in dirs:
        directory=Path(directory).expanduser();directory.mkdir(parents=True,exist_ok=True)
        path=directory/(NAME+'.json');path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');path.chmod(0o600);print('已注册：'+str(path))
    print('扩展目录：'+str(ROOT/'extension'))
    print('在 chrome://extensions/ 开启开发者模式，加载以上目录；再打开得到长谈文章页。')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--registry-dir',action='append',type=Path);args=parser.parse_args();install(args.registry_dir)

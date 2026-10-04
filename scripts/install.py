#!/usr/bin/env python3
"""Per-user native host installation. API users do not need this installer."""
import argparse,json,os,shlex,shutil,sys
from pathlib import Path
NAME='com.baiyalab.dedao_longtalk'
ROOT=Path(__file__).resolve().parents[1]
def locations(platform,home,environ):
    if platform=='darwin':return home/'Library/Application Support/DedaoLongtalk/host',[home/'Library/Application Support/Google/Chrome/NativeMessagingHosts']
    if platform=='win32':return Path(environ.get('LOCALAPPDATA',str(home/'AppData/Local')))/'DedaoLongtalk/host',[]
    if platform.startswith('linux'):return home/'.local/share/dedao-longtalk/host',[Path(environ.get('XDG_CONFIG_HOME',str(home/'.config')))/'google-chrome/NativeMessagingHosts']
    raise SystemExit('本机连接程序支持 Windows、macOS、Linux；其他系统可使用 API 模式。')

def executable(path,node=None):
    if not path:return None
    p=Path(path).expanduser().absolute()
    if not p.is_file():raise SystemExit('程序路径不存在：'+str(p))
    # Node shims must be resolved without passing model input through cmd.exe.
    if p.suffix.lower() in ('.cmd','.bat'):
        for candidate in [p.parent/'node_modules/@openai/codex/bin/codex.js',p.parent/'node_modules/@tencent-ai/codebuddy-code/cli.js']:
            if candidate.is_file():return executable(candidate,node)
        raise SystemExit('请指定实际 .exe 或 JavaScript CLI 入口，不能使用批处理 shim：'+str(p))
    with p.open('rb') as handle:prefix=handle.read(100)
    if p.suffix in ('.js','.mjs','.cjs') or b'node' in prefix.split(b'\n')[0]:
        runtime=node or shutil.which('node')
        if not runtime or not Path(runtime).is_file():raise SystemExit('此命令行程序需要 Node.js，请安装后重试或用 --node 指定路径。')
        return [str(Path(runtime).absolute()),str(p)]
    return [str(p)]

def find_workbuddy():
    if sys.platform=='darwin':
        candidates=[Path('/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy'),Path.home()/'Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy']
    elif sys.platform=='win32':
        candidates=[Path(os.environ.get('LOCALAPPDATA',''))/'Programs/WorkBuddy/resources/app.asar.unpacked/cli/bin/codebuddy',Path(os.environ.get('ProgramFiles','C:/Program Files'))/'WorkBuddy/resources/app.asar.unpacked/cli/bin/codebuddy']
    else:candidates=[]
    return next((str(p) for p in candidates if p.is_file()),None)

def install(registries=None,codex=None,workbuddy=None,node=None):
    dest,defaults=locations(sys.platform,Path.home(),os.environ)
    programs={'codex':executable(codex or shutil.which('codex'),node),'workbuddy':None}
    try:programs['workbuddy']=executable(workbuddy or find_workbuddy(),node)
    except SystemExit as error:
        if workbuddy or not programs['codex']:raise
        print('WorkBuddy 暂未配置：'+str(error))
    if not any(programs.values()):raise SystemExit('未找到 Codex 或 WorkBuddy 命令行。可先安装工具，或直接使用不需要本机程序的 API 模式。自定义路径使用 --codex / --workbuddy。')
    dest.mkdir(parents=True,exist_ok=True);dest.chmod(0o700)
    shutil.copy2(ROOT/'native/host.py',dest/'host.py');shutil.copy2(ROOT/'extension/analysis-spec.json',dest/'analysis-spec.json')
    id=(ROOT/'extension-id.txt').read_text().strip()
    config={**programs,'origins':[f'chrome-extension://{id}/']}
    (dest/'config.json').write_text(json.dumps(config,ensure_ascii=False),encoding='utf-8');(dest/'config.json').chmod(0o600)
    if sys.platform=='win32':
        launcher=dest/'run-host.cmd'
        # Only installer-owned paths and Chrome's origin arguments enter the launcher.
        paths=[sys.executable,str(dest/'host.py')]
        if any(any(c in p for c in '%!\r\n"') for p in paths):raise SystemExit('安装路径含有不支持的批处理字符，请换一个路径。')
        launcher.write_text('@echo off\r\nchcp 65001 >nul\r\n"'+paths[0]+'" "'+paths[1]+'" %*\r\n',encoding='utf-8')
    else:
        launcher=dest/'run-host';launcher.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(dest/'host.py'))+' "$@"\n');launcher.chmod(0o700)
    manifest={'name':NAME,'description':'得到长谈速览本机模型连接程序','path':str(launcher),'type':'stdio','allowed_origins':config['origins']}
    dirs=registries or defaults or [dest]
    for directory in dirs:
        directory=Path(directory).expanduser();directory.mkdir(parents=True,exist_ok=True)
        path=directory/(NAME+'.json');path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');path.chmod(0o600);print('已注册：'+str(path))
    if sys.platform=='win32':
        import winreg
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER,'Software\\Google\\Chrome\\NativeMessagingHosts\\'+NAME) as key:winreg.SetValueEx(key,'',0,winreg.REG_SZ,str(path))
    print('程序检测：'+', '.join(name for name,value in programs.items() if value))
    print('这只确认程序存在；请先完成所选 CLI 的登录。WorkBuddy 桌面登录可能不与 CLI 共享。')
    print('在扩展的「模型设置」选择本机工具。扩展目录：'+str(ROOT/'extension'))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--registry-dir',action='append',type=Path)
    for name in ['codex','workbuddy','node']:parser.add_argument('--'+name)
    args=parser.parse_args();install(args.registry_dir,args.codex,args.workbuddy,args.node)

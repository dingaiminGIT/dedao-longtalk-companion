"""Exercise the installed framed protocol without storing original text or raw logs."""
import json,select,struct,subprocess,time,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
host=Path.home()/'Library/Application Support/DedaoLongtalk/host/run-host'
id=(root/'extension-id.txt').read_text().strip();p=subprocess.Popen([str(host),f'chrome-extension://{id}/'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def send(m):
 data=json.dumps(m,ensure_ascii=False).encode();p.stdin.write(struct.pack('=I',len(data))+data);p.stdin.flush()
def receive(timeout=310):
 if not select.select([p.stdout],[],[],timeout)[0]:raise TimeoutError()
 header=p.stdout.read(4)
 if len(header)!=4:raise RuntimeError('Host exited')
 return json.loads(p.stdout.read(struct.unpack('=I',header)[0]))
try:
 send({'type':'hello'});print(receive(),flush=True)
 s=json.loads(Path(sys.argv[1]).read_text());s['profile']='有新观点、有具体案例，能指导行动'
 send({'type':'generate','id':'native-integration','source':s})
 start=time.monotonic()
 while True:
  r=receive();print({k:v for k,v in r.items() if k not in ['result']},flush=True)
  if r['type']=='result':
   out=root/'artifacts';out.mkdir(exist_ok=True);(out/'native-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));break
  if r['type'] in ['error','cancelled']:raise RuntimeError(r)
finally:
 p.stdin.close()
 try:p.wait(timeout=15)
 except subprocess.TimeoutExpired:p.kill()

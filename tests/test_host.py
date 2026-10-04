import importlib.util,io,json,os,struct,sys,tempfile,time,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('host',Path(__file__).resolve().parents[1]/'native/host.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
def source():return {'url':'https://www.dedao.cn/course/article?id=ExampleArticle1234','title':'测试长谈','profile':'观点、案例和行动','paragraphs':[{'id':f'P{i:04d}','text':'测试正文'*35} for i in range(1,6)]}
def result():return {'summary':'摘要','verdict':'精选段落','reason':'理由','dimensions':[{'name':x,'level':'一般','reason':'依据'} for x in ['观点启发','具体案例','行动指导']],'points':[{'insight':'观点','speaker':'嘉宾','reasoning':'问题背景与论证过程','boundary':'适用范围与局限','example':'案例','action':'尝试','actionOrigin':'由观点延伸','evidence':['P0001']} for _ in range(5)],'limitations':['基于文字稿']}
class Tests(unittest.TestCase):
 def test_source_validation(self):
  self.assertEqual(h.validate_source(source())['title'],'测试长谈')
  for change in [{'url':'https://www.dedao.cn.evil.test/course/article?id=ExampleArticle1234'},{'url':'file:///tmp/x'},{'profile':'x'*401},{'paragraphs':[]}]:
   with self.assertRaises(ValueError):h.validate_source({**source(),**change})
 def test_frame_unicode_and_partial(self):
  data=json.dumps({'message':'中文'},ensure_ascii=False).encode();self.assertEqual(h.read_frame(io.BytesIO(struct.pack('=I',len(data))+data)),{'message':'中文'})
  for data in [b'\x01',struct.pack('=I',3000000),struct.pack('=I',5)+b'{}']:
   with self.assertRaises(ValueError):h.read_frame(io.BytesIO(data))
 def test_result_references_and_schema(self):
  r=result();h.validate_result(r,source());r['points'][0]['evidence']=['P9999']
  with self.assertRaises(ValueError):h.validate_result(r,source())
  r=result();r['injected']='unexpected'
  with self.assertRaises(ValueError):h.validate_result(r,source())
 def test_detailed_schema_requires_reasoning_and_boundary(self):
  for count in [5,8,12]:
   r=result();r['points']=[dict(r['points'][0]) for _ in range(count)];h.validate_result(r,source())
  for field in ['reasoning','boundary']:
   r=result();del r['points'][0][field]
   with self.assertRaises(ValueError):h.validate_result(r,source())
  for count in [4,13]:
   r=result();r['points']=[dict(r['points'][0]) for _ in range(count)]
   with self.assertRaises(ValueError):h.validate_result(r,source())
 def test_fixed_command_no_source_as_shell(self):
  cmd=h.command('/bin/codex',Path('/tmp/test'))
  self.assertEqual(cmd[0],'/bin/codex');self.assertIn('read-only',cmd);self.assertIn('features.shell_tool=false',cmd);self.assertIn('features.code_mode_host=false',cmd);self.assertIn('--ignore-user-config',cmd);self.assertEqual(cmd[-1],'-')
 def test_errors_do_not_expose_logs(self):
  self.assertNotIn('SECRET',h.friendly_error('SECRET cookie debug'));self.assertIn('额度',h.friendly_error('429 rate limit'));self.assertIn('login',h.friendly_error('401 unauthorized'))

 def fake(self,d,delay=0,tool=False):
  p=Path(d)/'codex';output={'type':'item.completed','item':{'type':'command_execution' if tool else 'error','message':'startup diagnostic'}}
  p.write_text('#!'+sys.executable+'\nimport sys,time,json\nfrom pathlib import Path\nsys.stdin.read()\ntime.sleep('+str(delay)+')\nPath(sys.argv[sys.argv.index("--output-last-message")+1]).write_text('+repr(json.dumps(result(),ensure_ascii=False))+')\nprint('+repr(json.dumps(output))+')\n')
  p.chmod(0o700);return p
 def test_real_child_protocol_accepts_startup_diagnostic_and_cleans(self):
  with tempfile.TemporaryDirectory() as d:
   host=h.Host({'codex':str(self.fake(d))});events=[];host.send=events.append
   host.message({'type':'generate','id':'test','source':source()});host.worker.join(10)
   self.assertFalse(host.worker.is_alive());self.assertEqual(events[-1]['type'],'result');self.assertIsNone(host.process)
 def test_cancel_stops_child_and_does_not_return_result(self):
  with tempfile.TemporaryDirectory() as d:
   host=h.Host({'codex':str(self.fake(d,delay=30))});events=[];host.send=events.append
   host.message({'type':'generate','id':'test','source':source()})
   deadline=time.monotonic()+3
   while host.process is None and time.monotonic()<deadline:time.sleep(.01)
   self.assertIsNotNone(host.process);child=host.process;host.stop();host.worker.join(10)
   self.assertFalse(host.worker.is_alive());self.assertIsNotNone(child.poll());self.assertEqual(events[-1]['type'],'cancelled');self.assertNotIn('result',[e['type'] for e in events])
 def test_timeout_reports_an_error_instead_of_user_cancellation(self):
  from unittest.mock import MagicMock,patch
  process=MagicMock();process.communicate.side_effect=[h.subprocess.TimeoutExpired('codebuddy',h.GENERATION_TIMEOUT_SECONDS),('', '')]
  instance=h.Host({'workbuddy':['/bin/node','/app/codebuddy']});events=[];instance.send=events.append
  with patch.object(h.subprocess,'Popen',return_value=process),patch.object(h,'kill_process') as kill:
   instance.run('timeout',source(),'workbuddy')
  kill.assert_called_once_with(process);self.assertEqual(events[-1]['type'],'error');self.assertIn('超过 15 分钟',events[-1]['message']);self.assertEqual(process.communicate.call_args_list[0].kwargs['timeout'],900);self.assertFalse(instance.cancel.is_set())

 def test_tool_events_are_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   host=h.Host({'codex':str(self.fake(d,tool=True))});events=[];host.send=events.append
   host.message({'type':'generate','id':'test','source':source()});host.worker.join(10)
   self.assertEqual(events[-1]['type'],'error');self.assertIn('额外操作',events[-1]['message'])

if __name__=='__main__':unittest.main()

class ProviderTests(unittest.TestCase):
 def test_workbuddy_argv_has_no_tools_or_permission_bypass(self):
  cmd=h.provider_command({'workbuddy':['/bin/node','/app/codebuddy']},'workbuddy',Path('/tmp/test'),'model-name')
  self.assertEqual(cmd[:2],['/bin/node','/app/codebuddy']);self.assertEqual(cmd[cmd.index('--tools')+1],'');self.assertIn('--strict-mcp-config',cmd);self.assertIn('--no-session-persistence',cmd);self.assertNotIn('-y',cmd);self.assertEqual(cmd[cmd.index('--effort')+1],'medium');self.assertEqual(cmd[cmd.index('--output-format')+1],'stream-json');self.assertNotIn('--json-schema',cmd);self.assertIn('必须符合结构',cmd[cmd.index('--system-prompt')+1])
 def test_workbuddy_parses_structured_result_and_reports_login(self):
  self.assertEqual(h.workbuddy_result(json.dumps({'type':'result','structured_output':result()}),''),result())
  self.assertEqual(h.workbuddy_result(json.dumps({'type':'message','content':'input'})+'\n'+json.dumps({'type':'result','result':json.dumps(result())}),''),result())
  with self.assertRaisesRegex(RuntimeError,'/login'):h.workbuddy_result('Authentication required. Please use /login','')
  with self.assertRaisesRegex(ValueError,'额外操作'):h.workbuddy_result(json.dumps([{'type':'assistant','message':{'content':[{'type':'tool_use'}]}}]),'')
  for event in [{'type':'function_call'},{'type':'message','content':[{'type':'tool_use'}]}]:
   with self.assertRaisesRegex(ValueError,'额外操作'):h.workbuddy_result(json.dumps([event]),'')
  self.assertEqual(h.workbuddy_result(json.dumps({'type':'result','result':'```json\n'+json.dumps(result())+'\n```'}),''),result())
 def test_provider_and_model_cannot_inject_flags(self):
  host=h.Host({})
  for change in [{'provider':'arbitrary'},{'model':'x --tools shell'},{'model':'x\n-y'}]:
   with self.assertRaises(ValueError):host.message({'type':'generate','id':'test','source':source(),**change})
 def test_hello_reports_each_program(self):
  host=h.Host({'codex':[sys.executable],'workbuddy':['/missing/file']});events=[];host.send=events.append;host.message({'type':'hello'})
  self.assertEqual(events[0]['protocolVersion'],3);self.assertEqual(events[0]['providers'],{'codex':True,'workbuddy':False})

class InstallerTests(unittest.TestCase):
 def test_platform_locations(self):
  spec=importlib.util.spec_from_file_location('installer',Path(__file__).resolve().parents[1]/'scripts/install.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  home=Path('/users/test')
  self.assertIn('Library/Application Support',str(module.locations('darwin',home,{})[0]))
  self.assertEqual(module.locations('win32',home,{'LOCALAPPDATA':'/local'})[0],Path('/local/DedaoLongtalk/host'))
  self.assertEqual(module.locations('linux',home,{'XDG_CONFIG_HOME':'/config'})[1],[Path('/config/google-chrome/NativeMessagingHosts')])

class InstallerStandaloneTests(unittest.TestCase):
 def test_prefers_standalone_cli_over_desktop_bundle(self):
  from unittest.mock import patch
  spec=importlib.util.spec_from_file_location('installer_cli',Path(__file__).resolve().parents[1]/'scripts/install.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with patch.object(module.shutil,'which',side_effect=lambda name:'/usr/local/bin/codebuddy' if name=='codebuddy' else None):
   self.assertEqual(module.find_workbuddy(),'/usr/local/bin/codebuddy')

 def test_windows_shim_selects_its_own_package_when_both_are_installed(self):
  spec=importlib.util.spec_from_file_location('installer_shim',Path(__file__).resolve().parents[1]/'scripts/install.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);node=root/'node.exe';node.touch()
   for entry in ['@openai/codex/bin/codex.js','@tencent-ai/codebuddy-code/bin/codebuddy']:
    p=root/'node_modules'/entry;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('#!/usr/bin/env node\n')
   shim=root/'codebuddy.cmd';shim.touch()
   self.assertEqual(module.executable(shim,str(node)),[str(node),str(root/'node_modules/@tencent-ai/codebuddy-code/bin/codebuddy')])

"""Exercise the optional installer in an isolated fake macOS command environment."""
import hashlib, os, pathlib, subprocess, tempfile
script = pathlib.Path('site/install-macos.sh').resolve()
for allow, corrupt in [(False,False),(True,False),(True,True)]:
    with tempfile.TemporaryDirectory() as temp:
        root=pathlib.Path(temp); bin=root/'bin'; bin.mkdir(); home=root/'home'; home.mkdir()
        log=root/'calls'
        stub='''#!/usr/bin/python3
import sys,os,pathlib,shutil,hashlib
cmd=pathlib.Path(sys.argv[0]).name;args=sys.argv[1:]
with open(os.environ['CALLS'],'a') as f:f.write(cmd+' '+repr(args)+'\\n')
if cmd=='uname':print('Darwin')
elif cmd=='sw_vers':print('13.0')
elif cmd=='curl':
 out=pathlib.Path(args[args.index('-o')+1]);url=next(a for a in args if a.startswith('https://'))
 if url.endswith('SHA256SUMS'):
  checksum='0'*64 if os.environ['CORRUPT']=='1' else hashlib.sha256(b'dmg').hexdigest()
  out.write_text(checksum+'  PanelTag-0.5.0-macos-universal.dmg\\n')
 else:out.write_bytes(b'dmg')
elif cmd=='hdiutil' and 'attach' in args:
 app=pathlib.Path(args[args.index('-mountpoint')+1])/'PanelTag.app';app.mkdir();(app/'binary').write_text('test')
elif cmd=='ditto':shutil.copytree(args[0],args[1])
elif cmd=='pgrep':sys.exit(1)
elif cmd=='xattr' and '-dr' in args:sys.exit(1) # no attribute is a valid no-op
'''
        for name in ['uname','sw_vers','curl','hdiutil','codesign','ditto','pgrep','xattr','open']:
            p=bin/name;p.write_text(stub);p.chmod(0o755)
        env={**os.environ,'PATH':str(bin)+':'+os.environ['PATH'],'HOME':str(home),'TMPDIR':str(root),'CALLS':str(log),'CORRUPT':str(int(corrupt))}
        result=subprocess.run(['bash',str(script)]+(['--allow-unsigned'] if allow else []),env=env,capture_output=True,text=True)
        calls=log.read_text()
        if corrupt:
            assert result.returncode!=0 and 'Checksum mismatch' in result.stderr
            assert not (home/'Applications/PanelTag.app').exists()
            assert 'hdiutil [\'attach\'' not in calls
        else:
            assert result.returncode==0,(result.stdout,result.stderr)
            assert (home/'Applications/PanelTag.app/binary').read_text()=='test'
            assert ('xattr [\'-dr\'' in calls)==allow
            assert 'open [' in calls
            assert not list(home.glob('Applications/.paneltag.*'))
print('Mac installer: checksum, opt-in quarantine, installation and cleanup passed')

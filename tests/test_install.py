"""Test installer dispatch and launcher paths without touching a desktop."""
import os, subprocess, tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as d:
    d=Path(d); log=d/'log'
    stubs={
        'gnome-shell':'echo "GNOME Shell $TEST_VERSION"',
        'install':'echo "$*" >> "$TEST_LOG"',
        'id':'echo 1000',
        'gsettings':'echo "${TEST_START:-true}"',
        'gnome-extensions':'exit "${TEST_ENABLE:-0}"',
        'notify-send':'echo "$*" >> "$TEST_LOG"',
    }
    for name,code in stubs.items():
        p=d/name;p.write_text('#!/bin/sh\n'+code+'\n');p.chmod(0o755)
    env=dict(os.environ,PATH=f'{d}:/usr/bin:/bin',TEST_LOG=str(log))
    env.pop('SUDO_UID',None)
    for version,engine in [('3.36.9','legacy'),('42.9','legacy'),('46.0','modern'),('50','modern'),('51.1','modern')]:
        for action in ['configure','triggered']:
            log.write_text('')
            subprocess.run(['sh',str(root/'packaging/postinst'),action],env=dict(env,TEST_VERSION=version),check=True)
            assert f'/usr/share/paneltag/{engine}.js' in log.read_text()
    for enable,expected in [('0','enabled'),('1','Log out')]:
        log.write_text('')
        subprocess.run(['sh',str(root/'packaging/paneltag-launch')],env=dict(env,TEST_ENABLE=enable),check=True)
        assert expected in log.read_text()
    log.write_text('')
    subprocess.run(['sh',str(root/'packaging/paneltag-launch'),'--after-install'],env=dict(env,TEST_START='false'),check=True)
    assert not log.read_text()
print('Installer: legacy/modern dispatch, upgrade trigger, activation/fallback, startup opt-out passed.')

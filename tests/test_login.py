"""Exercise the login helper without touching a real desktop session."""
import os
from pathlib import Path
import subprocess
import tempfile

helper = Path(__file__).resolve().parents[1] / 'packaging/paneltag-login'
with tempfile.TemporaryDirectory() as temporary:
    folder = Path(temporary)
    scripts = {
        'gsettings': '#!/bin/sh\nprintf "%s\\n" "$PANELTAG_TEST_STATE"\n',
        'gnome-extensions': '#!/bin/sh\nprintf "%s\\n" "$*" >> "$PANELTAG_TEST_LOG"\n',
    }
    for name, source in scripts.items():
        path = folder / name
        path.write_text(source)
        path.chmod(0o755)
    for value, expected in [('true', 'enable'), ('false', 'disable')]:
        log = folder / (value + '.log')
        env = dict(os.environ, PATH=f'{folder}:/usr/bin:/bin',
                   PANELTAG_TEST_STATE=value, PANELTAG_TEST_LOG=str(log))
        subprocess.run(['sh', str(helper)], env=env, check=True)
        assert log.read_text().strip() == f'{expected} paneltag@afshinki.github.io'
print('Login helper: enable/disable preference paths passed.')

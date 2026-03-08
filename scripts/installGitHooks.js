const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const hooksDir = path.join(root, '.githooks');
const prePushFile = path.join(hooksDir, 'pre-push');

if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const script = `#!/usr/bin/env sh
set -e
npm run -s lint
node ./bin/portly.js doctor --json > /dev/null
`;

fs.writeFileSync(prePushFile, script, 'utf8');

try {
  fs.chmodSync(prePushFile, 0o755);
} catch (_) {
  // chmod can fail on Windows and that's fine.
}

try {
  execSync('git rev-parse --is-inside-work-tree', { cwd: root, stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'ignore' });
  console.log('Installed git hooks at .githooks and configured core.hooksPath');
} catch (_) {
  console.log('Created .githooks/pre-push. Run `git config core.hooksPath .githooks` inside your repo if needed.');
}

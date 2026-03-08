const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { spawn, spawnSync } = require('child_process');
const EventEmitter = require('events');

function getAssetName() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32' && arch === 'x64') return 'cloudflared-windows-amd64.exe';
  if (platform === 'win32' && arch === 'arm64') return 'cloudflared-windows-arm64.exe';
  if (platform === 'linux' && arch === 'x64') return 'cloudflared-linux-amd64';
  if (platform === 'linux' && arch === 'arm64') return 'cloudflared-linux-arm64';

  return null;
}

function canExecute(binary) {
  try {
    const res = spawnSync(binary, ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch (_) {
    return false;
  }
}

async function downloadCloudflared(targetPath) {
  const asset = getAssetName();
  if (!asset) {
    throw new Error('Auto-install for cloudflared is currently supported on Windows/Linux x64/arm64. Install cloudflared manually for this platform.');
  }

  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`;

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30_000,
    maxRedirects: 5
  });

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    response.data.pipe(file);
    file.on('finish', resolve);
    file.on('error', reject);
  });

  if (process.platform !== 'win32') {
    fs.chmodSync(targetPath, 0o755);
  }
}

async function ensureCloudflared() {
  if (canExecute('cloudflared')) {
    return 'cloudflared';
  }

  const binDir = path.join(os.homedir(), '.portly', 'bin');
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

  const binaryName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const bundledPath = path.join(binDir, binaryName);

  if (fs.existsSync(bundledPath) && canExecute(bundledPath)) {
    return bundledPath;
  }

  await downloadCloudflared(bundledPath);

  if (!canExecute(bundledPath)) {
    throw new Error('cloudflared download completed but binary is not executable.');
  }

  return bundledPath;
}

async function startCloudflaredTunnel({ port, verbose = false }) {
  const command = await ensureCloudflared();
  const emitter = new EventEmitter();

  return new Promise((resolve, reject) => {
    const args = ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'];
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let settled = false;
    let tunnelUrl = null;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch (_) {
        // ignore
      }
      reject(err);
    };

    const inspectLine = (line) => {
      if (verbose && line) {
        emitter.emit('debug', line);
      }

      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (!match || settled) return;

      settled = true;
      tunnelUrl = match[0];

      resolve({
        url: tunnelUrl,
        process: child,
        emitter
      });
    };

    const onData = (chunk) => {
      const text = String(chunk || '');
      text.split(/\r?\n/).forEach(inspectLine);
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
      emitter.emit('error', err);
      fail(err);
    });

    child.on('exit', (code, signal) => {
      if (!settled) {
        fail(new Error(`cloudflared exited before URL was issued (code=${code}, signal=${signal})`));
        return;
      }

      emitter.emit('close');
    });

    setTimeout(() => {
      if (!settled) {
        fail(new Error('Timed out waiting for cloudflared tunnel URL.'));
      }
    }, 20_000);
  });
}

module.exports = {
  ensureCloudflared,
  startCloudflaredTunnel
};

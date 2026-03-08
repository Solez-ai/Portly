const { spawnSync } = require('child_process');

function copyToClipboard(text) {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      spawnSync('clip', [], { input: text, encoding: 'utf8' });
      return true;
    }

    if (platform === 'darwin') {
      spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
      return true;
    }

    const res = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8' });
    if (!res.error) return true;

    const alt = spawnSync('xsel', ['--clipboard', '--input'], { input: text, encoding: 'utf8' });
    return !alt.error;
  } catch (_) {
    return false;
  }
}

module.exports = {
  copyToClipboard
};

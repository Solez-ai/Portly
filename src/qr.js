const qrcode = require('qrcode-terminal');

function renderQRCode(url) {
  qrcode.generate(url, { small: true });
}

module.exports = {
  renderQRCode
};
const axios = require('axios');
const os = require('os');
const { getListeningPorts } = require('./portScanner');
const { ensureCloudflared } = require('./cloudflared');

async function runDoctor() {
  const result = {
    nodeVersion: process.version,
    platform: `${os.platform()} ${os.release()}`,
    checks: []
  };

  const listeningPorts = getListeningPorts();
  result.checks.push({
    id: 'local-listening-ports',
    ok: listeningPorts.length > 0,
    detail: listeningPorts.length > 0 ? `Found ${listeningPorts.length} listening port(s)` : 'No listening TCP ports found'
  });

  try {
    const binary = await ensureCloudflared();
    result.checks.push({
      id: 'cloudflared-availability',
      ok: true,
      detail: `cloudflared available at ${binary}`
    });
  } catch (error) {
    result.checks.push({
      id: 'cloudflared-availability',
      ok: false,
      detail: error.message
    });
  }

  try {
    const res = await axios.get('https://trycloudflare.com', { timeout: 5000, validateStatus: () => true });
    result.checks.push({
      id: 'trycloudflare-reachability',
      ok: res.status < 500,
      detail: `HTTP ${res.status} from trycloudflare.com`
    });
  } catch (error) {
    result.checks.push({
      id: 'trycloudflare-reachability',
      ok: false,
      detail: error.code || error.message
    });
  }

  return result;
}

module.exports = {
  runDoctor
};

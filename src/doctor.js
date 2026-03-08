const axios = require('axios');
const os = require('os');
const { getListeningPorts } = require('./portScanner');

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
    const res = await axios.get('https://loca.lt', { timeout: 4000, validateStatus: () => true });
    result.checks.push({
      id: 'localtunnel-reachability',
      ok: res.status < 500,
      detail: `HTTP ${res.status} from loca.lt`
    });
  } catch (error) {
    result.checks.push({
      id: 'localtunnel-reachability',
      ok: false,
      detail: error.code || error.message
    });
  }

  return result;
}

module.exports = {
  runDoctor
};

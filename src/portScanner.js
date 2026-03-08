const { execSync } = require('child_process');
const axios = require('axios');

const DEFAULT_PORTS = [3000, 5173, 8080, 8000, 4200, 4000, 5000];

function parsePortsFromWindowsNetstat(output) {
  const ports = new Set();

  output.split(/\r?\n/).forEach((line) => {
    const clean = line.trim();
    if (!clean.startsWith('TCP') || !clean.includes('LISTENING')) return;

    const parts = clean.split(/\s+/);
    const localAddress = parts[1] || '';
    const portStr = localAddress.split(':').pop();
    const port = Number.parseInt(portStr, 10);

    if (Number.isInteger(port) && port > 0 && port <= 65535) ports.add(port);
  });

  return [...ports];
}

function parsePortsFromLsof(output) {
  const ports = new Set();

  output.split(/\r?\n/).forEach((line) => {
    const match = line.match(/:(\d+)\s*\(LISTEN\)/);
    if (!match) return;
    const port = Number.parseInt(match[1], 10);
    if (Number.isInteger(port)) ports.add(port);
  });

  return [...ports];
}

function getListeningPorts() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return parsePortsFromWindowsNetstat(out);
    }

    const out = execSync('lsof -iTCP -sTCP:LISTEN -n -P', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return parsePortsFromLsof(out);
  } catch (_) {
    return [];
  }
}

function detectFramework(headers, body) {
  const text = `${JSON.stringify(headers || {})} ${(body || '').slice(0, 2000)}`.toLowerCase();

  if (text.includes('vite') || text.includes('/@vite/client')) return 'Vite';
  if (text.includes('__next') || text.includes('next.js')) return 'Next.js';
  if (text.includes('react') || text.includes('reactroot')) return 'React';
  if (text.includes('__nuxt') || text.includes('nuxt')) return 'Nuxt';
  if (text.includes('ng-version') || text.includes('angular')) return 'Angular';
  if (text.includes('x-powered-by":"express') || text.includes('express')) return 'Express';

  return 'Unknown';
}

function detectRiskFlags(body) {
  const text = (body || '').toLowerCase();
  const flags = [];

  if (text.includes('login') || text.includes('sign in') || text.includes('password')) {
    flags.push('auth-surface-detected');
  }

  if (text.includes('admin') || text.includes('/admin')) {
    flags.push('admin-surface-detected');
  }

  return flags;
}

function computeConfidence({ port, framework, status, headers }) {
  const contentType = String((headers && headers['content-type']) || '').toLowerCase();
  let score = 0;

  if (framework && framework !== 'Unknown') score += 100;
  if (DEFAULT_PORTS.includes(port)) score += 30;
  if (status >= 200 && status < 300) score += 25;
  if (status >= 300 && status < 400) score += 10;
  if (contentType.includes('text/html')) score += 12;
  if (contentType.includes('application/json')) score += 6;
  if (port >= 49152 && framework === 'Unknown') score -= 35;
  if (status >= 400 && framework === 'Unknown') score -= 45;
  if (port < 1024 && !DEFAULT_PORTS.includes(port)) score -= 20;

  return score;
}

async function probePort(port, timeoutMs = 900) {
  const url = `http://127.0.0.1:${port}`;

  try {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true,
      maxRedirects: 0
    });

    const framework = detectFramework(response.headers, response.data);
    const status = response.status;
    const headers = response.headers || {};
    const confidence = computeConfidence({
      port,
      framework,
      status,
      headers
    });

    return {
      active: true,
      port,
      url,
      framework,
      status,
      riskFlags: detectRiskFlags(response.data),
      headers,
      confidence,
      likelyDevApp: confidence >= 40
    };
  } catch (error) {
    return {
      active: false,
      port,
      url,
      framework: null,
      status: null,
      riskFlags: [],
      confidence: -999,
      likelyDevApp: false,
      error: error.code || error.message
    };
  }
}

function sortCandidatePorts(ports = []) {
  const set = new Set([...DEFAULT_PORTS, ...ports]);
  return [...set].sort((a, b) => a - b);
}

async function detectRunningApps({ includeAllListening = true, timeoutMs = 900 } = {}) {
  const listening = includeAllListening ? getListeningPorts() : [];
  const candidates = sortCandidatePorts(listening);
  const results = [];

  for (const port of candidates) {
    const probe = await probePort(port, timeoutMs);
    if (probe.active) results.push(probe);
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

module.exports = {
  DEFAULT_PORTS,
  detectFramework,
  probePort,
  getListeningPorts,
  detectRunningApps
};

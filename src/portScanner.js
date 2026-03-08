const axios = require('axios');

const DEFAULT_PORTS = [3000, 5173, 8080, 8000, 4200, 4000, 5000];

function detectFramework(headers, body) {
  const haystack = `${JSON.stringify(headers || {})} ${(body || '').slice(0, 1200)}`.toLowerCase();

  if (haystack.includes('vite')) return 'Vite';
  if (haystack.includes('next.js') || haystack.includes('__next')) return 'Next.js';
  if (haystack.includes('react')) return 'React';
  if (haystack.includes('nuxt')) return 'Nuxt';
  if (haystack.includes('angular')) return 'Angular';
  if (haystack.includes('express')) return 'Express';
  return 'Unknown';
}

async function probePort(port, timeoutMs = 900) {
  try {
    const response = await axios.get(`http://127.0.0.1:${port}`, {
      timeout: timeoutMs,
      validateStatus: () => true,
      maxRedirects: 0
    });

    return {
      active: true,
      framework: detectFramework(response.headers, response.data),
      status: response.status
    };
  } catch (error) {
    return {
      active: false,
      framework: null,
      status: null,
      error: error.code || error.message
    };
  }
}

async function detectPort(ports = DEFAULT_PORTS) {
  for (const port of ports) {
    const result = await probePort(port);
    if (result.active) {
      return {
        port,
        framework: result.framework,
        status: result.status
      };
    }
  }

  return null;
}

module.exports = {
  DEFAULT_PORTS,
  detectPort,
  probePort
};
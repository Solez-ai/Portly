const localtunnel = require('localtunnel');

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

async function createTunnel({ port, subdomain, retries = 3, retryDelayMs = 1500 }) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const tunnel = await localtunnel({
        port,
        subdomain: subdomain || undefined
      });

      let closed = false;
      let closeReason = null;
      const startedAt = Date.now();
      let lastActivityAt = Date.now();

      const closeSafely = (reason) => {
        if (closed) return;
        closed = true;
        closeReason = reason;

        try {
          tunnel.close();
        } catch (_) {
          // Best effort close.
        }
      };

      tunnel.on('request', () => {
        lastActivityAt = Date.now();
      });

      const monitor = setInterval(() => {
        const now = Date.now();

        if (now - startedAt >= SESSION_TIMEOUT_MS) {
          closeSafely('session timeout after 2 hours');
          return;
        }

        if (now - lastActivityAt >= SESSION_TIMEOUT_MS) {
          closeSafely('inactive for 2 hours');
        }
      }, 15_000);

      tunnel.on('close', () => {
        clearInterval(monitor);
      });

      return {
        url: tunnel.url,
        close: closeSafely,
        getCloseReason: () => closeReason,
        tunnel
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError || new Error('Unable to create tunnel.');
}

module.exports = {
  createTunnel,
  SESSION_TIMEOUT_MS
};

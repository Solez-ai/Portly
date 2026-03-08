const localtunnel = require('localtunnel');

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

async function createTunnel({ port, subdomain }) {
  const tunnel = await localtunnel({
    port,
    subdomain: subdomain || undefined
  });

  let closed = false;
  let closeReason = null;

  const closeSafely = (reason) => {
    if (closed) return;
    closed = true;
    closeReason = reason;

    try {
      tunnel.close();
    } catch (_) {
      // Ignore close errors because we only need best-effort teardown.
    }
  };

  const startedAt = Date.now();
  let lastActivityAt = Date.now();

  const activityHandler = () => {
    lastActivityAt = Date.now();
  };

  tunnel.on('request', activityHandler);

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
}

module.exports = {
  createTunnel,
  SESSION_TIMEOUT_MS
};
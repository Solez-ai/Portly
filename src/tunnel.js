const EventEmitter = require('events');
const { startCloudflaredTunnel } = require('./cloudflared');

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

async function createTunnel({ port, retries = 3, retryDelayMs = 1500, verbose = false }) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const started = await startCloudflaredTunnel({ port, verbose });
      const tunnelEvents = new EventEmitter();

      let closed = false;
      let closeReason = null;
      let runtimeError = null;
      const startedAt = Date.now();

      const closeSafely = (reason) => {
        if (closed) return;
        closed = true;
        closeReason = reason;

        try {
          started.process.kill();
        } catch (_) {
          // best effort
        }
      };

      const monitor = setInterval(() => {
        if (Date.now() - startedAt >= SESSION_TIMEOUT_MS) {
          closeSafely('session timeout after 2 hours');
        }
      }, 15_000);

      started.emitter.on('error', (err) => {
        runtimeError = err;
        tunnelEvents.emit('error', err);
        closeSafely(`provider error: ${err && err.message ? err.message : 'unknown error'}`);
      });

      started.emitter.on('close', () => {
        clearInterval(monitor);
        tunnelEvents.emit('close');
      });

      return {
        url: started.url,
        close: closeSafely,
        getCloseReason: () => closeReason,
        getLastError: () => runtimeError,
        tunnel: tunnelEvents
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError || new Error('Unable to create tunnel with cloudflared.');
}

module.exports = {
  createTunnel,
  SESSION_TIMEOUT_MS
};

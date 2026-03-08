const { Command } = require('commander');
const ora = require('ora');
const axios = require('axios');
const {
  printHeader,
  info,
  success,
  error,
  printUrl,
  printClosing
} = require('./ui');
const { detectRunningApps, probePort } = require('./portScanner');
const { createTunnel } = require('./tunnel');
const { renderQRCode } = require('./qr');
const { generateName } = require('../utils/nameGenerator');
const { chooseTarget, confirmAction } = require('./prompt');
const { loadConfig } = require('./config');
const { copyToClipboard } = require('./clipboard');
const { runDoctor } = require('./doctor');
const {
  addSession,
  updateCurrent,
  getCurrentSession,
  listSessions,
  clearCurrent
} = require('./sessionStore');

function outputJson(enabled, payload) {
  if (!enabled) return;
  console.log(JSON.stringify(payload, null, 2));
}

function resolvePortFromArg(portArg, config) {
  if (portArg) {
    const parsed = Number.parseInt(portArg, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('Invalid port. Provide a value between 1 and 65535.');
    }

    return parsed;
  }

  if (config.defaultPort) return config.defaultPort;

  return null;
}

function parsePortList(text) {
  if (!text) return [];
  return text
    .split(',')
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isInteger(v) && v > 0 && v <= 65535);
}

function applyPortPolicies(targets, allowlistPorts, denylistPorts) {
  const allow = new Set(allowlistPorts || []);
  const deny = new Set(denylistPorts || []);

  return targets.filter((t) => {
    if (deny.has(t.port)) return false;
    if (allow.size > 0 && !allow.has(t.port)) return false;
    return true;
  });
}

async function resolveTarget({ portArg, options, config }) {
  const explicitPort = resolvePortFromArg(portArg, config);
  const timeoutMs = Number(options.timeout || config.timeoutMs || 900);
  const allowlistPorts = parsePortList(options.allowlist).length
    ? parsePortList(options.allowlist)
    : config.allowlistPorts || [];
  const denylistPorts = parsePortList(options.denylist).length
    ? parsePortList(options.denylist)
    : config.denylistPorts || [];

  if (explicitPort) {
    const probed = await probePort(explicitPort, timeoutMs);
    if (!probed.active) {
      throw new Error(`No active HTTP service found on port ${explicitPort}.`);
    }

    const filtered = applyPortPolicies([probed], allowlistPorts, denylistPorts);
    if (!filtered.length) {
      throw new Error(`Port ${explicitPort} blocked by allowlist/denylist policy.`);
    }

    return filtered[0];
  }

  const spinner = options.quiet ? null : ora('Scanning listening ports and probing local services...').start();
  let targets = await detectRunningApps({ timeoutMs, includeAllListening: true });
  targets = applyPortPolicies(targets, allowlistPorts, denylistPorts);

  if (spinner) spinner.stop();

  if (!targets.length) {
    throw new Error('No running local server detected after scanning listening ports.');
  }

  if (options.json) {
    return targets[0];
  }

  return chooseTarget(targets);
}

async function checkLocalHealth(target, timeoutMs, json) {
  const health = await probePort(target.port, timeoutMs);

  if (!health.active) {
    throw new Error(`Local health check failed for http://127.0.0.1:${target.port}`);
  }

  outputJson(json, {
    type: 'local_health',
    port: target.port,
    status: health.status,
    framework: health.framework
  });

  return health;
}

async function checkPublicReachability(url, json) {
  try {
    const res = await axios.get(url, {
      timeout: 5000,
      validateStatus: () => true
    });

    outputJson(json, {
      type: 'public_health',
      url,
      status: res.status
    });

    return res.status < 500;
  } catch (e) {
    outputJson(json, {
      type: 'public_health',
      url,
      status: 'unreachable',
      detail: e.code || e.message
    });
    return false;
  }
}

function printSessionList(sessions, asJson) {
  if (asJson) {
    outputJson(true, { sessions });
    return;
  }

  if (!sessions.length) {
    info('No sessions found.');
    return;
  }

  sessions.forEach((s, idx) => {
    const state = s.endedAt ? 'stopped' : 'active';
    console.log(`${idx + 1}. ${s.url} | port ${s.port} | ${state} | ${s.startedAt}`);
  });
}

function addCommonStartOptions(cmd) {
  return cmd
    .option('--name <subdomain>', 'Custom tunnel subdomain')
    .option('--host <host>', 'Optional host base for display URL (branding only)')
    .option('--confirm', 'Require explicit confirmation before exposing risky surfaces')
    .option('--allowlist <ports>', 'Comma-separated port allowlist, e.g. 3000,5173')
    .option('--denylist <ports>', 'Comma-separated port denylist, e.g. 9229,2375')
    .option('--json', 'JSON output mode for scripts/CI')
    .option('--quiet', 'Minimal output')
    .option('--verbose', 'Extra logs')
    .option('--timeout <ms>', 'HTTP probe timeout in milliseconds')
    .option('--copy', 'Copy the final URL to clipboard')
    .option('--no-reconnect', 'Disable auto-reconnect when tunnel drops');
}

async function startTunnelFlow(portArg, options, mode = 'start') {
  const { config } = loadConfig(process.cwd());

  if (!options.quiet && !options.json) printHeader();

  const target = await resolveTarget({ portArg, options, config });

  if (!options.quiet && !options.json) {
    success(`Selected app on port ${target.port} (${target.framework || 'Unknown'})`);
  }

  const localHealth = await checkLocalHealth(target, Number(options.timeout || config.timeoutMs || 900), options.json);

  if (localHealth.riskFlags.length > 0) {
    if (!options.quiet && !options.json) {
      info(`Warning: potential sensitive routes detected (${localHealth.riskFlags.join(', ')})`);
    }

    if (options.confirm) {
      const proceed = await confirmAction('Sensitive routes detected. Continue exposing this service?');
      if (!proceed) throw new Error('Aborted by user during confirmation.');
    }
  }

  const tunnelName = options.name || generateName();
  let tunnelHandle;
  let stopping = false;

  const establishTunnel = async () => {
    const spinner = !options.quiet && !options.json ? ora('Creating secure tunnel...').start() : null;

    tunnelHandle = await createTunnel({
      port: target.port,
      subdomain: tunnelName,
      retries: config.reconnectAttempts || 3,
      retryDelayMs: config.reconnectDelayMs || 1500
    });

    if (spinner) spinner.succeed('Tunnel established');

    const url = options.host ? `https://${tunnelName}.${options.host}` : tunnelHandle.url;
    const reachable = await checkPublicReachability(tunnelHandle.url, options.json);

    const session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pid: process.pid,
      mode,
      port: target.port,
      framework: target.framework || 'Unknown',
      providerUrl: tunnelHandle.url,
      url,
      reachable,
      startedAt: new Date().toISOString(),
      host: options.host || null
    };

    addSession(session);

    if (!options.json) {
      info(`Tunnel endpoint (provider): ${tunnelHandle.url}`);
      if (options.host && options.host.endsWith('.pages.dev')) {
        info('Note: Cloudflare Pages does not support wildcard tunnel subdomains by default.');
        info('The provider URL above is the guaranteed reachable tunnel URL.');
      }
      printUrl(url);
      info('Scan with your phone:\n');
      renderQRCode(url);

      if (options.copy && copyToClipboard(url)) {
        success('Copied URL to clipboard');
      }

      info('\nPress CTRL+C to stop');
    } else {
      outputJson(true, {
        type: 'session_started',
        ...session
      });
    }

    tunnelHandle.tunnel.on('close', async () => {
      if (stopping) return;

      if (options.reconnect) {
        if (!options.quiet && !options.json) info('Tunnel dropped. Reconnecting...');
        try {
          await establishTunnel();
          return;
        } catch (e) {
          if (!options.quiet && !options.json) error(`Reconnect failed: ${e.message}`);
        }
      }

      updateCurrent({
        endedAt: new Date().toISOString(),
        endReason: tunnelHandle.getCloseReason() || 'tunnel closed'
      });

      if (!options.json) printClosing(tunnelHandle.getCloseReason());
      clearCurrent();
      process.exit(0);
    });
  };

  await establishTunnel();

  const shutdown = (reason) => {
    stopping = true;
    if (tunnelHandle) tunnelHandle.close(reason);

    updateCurrent({
      endedAt: new Date().toISOString(),
      endReason: reason
    });

    if (!options.json) printClosing(reason);
    clearCurrent();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('interrupted by user'));
  process.on('SIGTERM', () => shutdown('terminated'));

  if (mode === 'watch') {
    let lastPort = target.port;
    const intervalMs = 5000;

    const timer = setInterval(async () => {
      try {
        const freshTargets = await detectRunningApps({ timeoutMs: Number(options.timeout || config.timeoutMs || 900) });
        if (!freshTargets.length) return;

        const primary = freshTargets[0];
        if (primary.port !== lastPort) {
          lastPort = primary.port;
          info(`Detected port change to ${lastPort}, restarting tunnel...`);

          if (tunnelHandle) tunnelHandle.close('watch restart');
          await startTunnelFlow(String(lastPort), options, 'watch');
        }
      } catch (_) {
        // Ignore polling errors while watching.
      }
    }, intervalMs);

    process.on('exit', () => clearInterval(timer));
  }
}

async function run(argv = process.argv) {
  const knownSubcommands = new Set(['start', 'watch', 'doctor', 'list', 'stop', 'dev', 'demo']);
  const args = argv.slice();
  const firstUserArg = args[2];

  if (!firstUserArg) {
    args.splice(2, 0, 'start');
  } else if (!knownSubcommands.has(firstUserArg) && firstUserArg !== '--help' && firstUserArg !== '-h' && firstUserArg !== '--version' && firstUserArg !== '-V') {
    args.splice(2, 0, 'start');
  }

  const program = new Command();

  program
    .name('portly')
    .description('Zero-config localhost tunnel for developers')
    .hook('preAction', () => {
      if (!process.env.PORTLY_NON_INTERACTIVE && process.env.CI) {
        process.env.PORTLY_NON_INTERACTIVE = '1';
      }
    });

  addCommonStartOptions(program.command('start [port]').description('Start a tunnel session'))
    .action(async (portArg, options) => {
      try {
        await startTunnelFlow(portArg, options, 'start');
      } catch (e) {
        if (options.json) outputJson(true, { type: 'error', message: e.message });
        else error(e.message || 'Unexpected error while starting Portly.');
        process.exit(1);
      }
    });

  addCommonStartOptions(program.command('watch [port]').description('Watch local apps and restart tunnel when detected port changes'))
    .action(async (portArg, options) => {
      try {
        await startTunnelFlow(portArg, options, 'watch');
      } catch (e) {
        if (options.json) outputJson(true, { type: 'error', message: e.message });
        else error(e.message || 'Watch mode failed.');
        process.exit(1);
      }
    });

  program
    .command('doctor')
    .description('Run diagnostics for local environment and connectivity')
    .option('--json', 'JSON output mode')
    .action(async (options) => {
      const report = await runDoctor();
      if (options.json) {
        outputJson(true, report);
        return;
      }

      printHeader();
      info(`Node: ${report.nodeVersion}`);
      info(`Platform: ${report.platform}`);
      report.checks.forEach((c) => {
        if (c.ok) success(`${c.id}: ${c.detail}`);
        else error(`${c.id}: ${c.detail}`);
      });
    });

  program
    .command('list')
    .description('List active/recent tunnel sessions')
    .option('--json', 'JSON output mode')
    .action((options) => {
      const sessions = listSessions();
      printSessionList(sessions, options.json);
    });

  program
    .command('stop')
    .description('Stop current active tunnel session')
    .option('--json', 'JSON output mode')
    .action((options) => {
      const current = getCurrentSession();
      if (!current) {
        const message = 'No active session found.';
        if (options.json) outputJson(true, { type: 'stop', stopped: false, message });
        else info(message);
        return;
      }

      try {
        process.kill(current.pid, 'SIGTERM');
        updateCurrent({ endedAt: new Date().toISOString(), endReason: 'stopped via command' });
        clearCurrent();
        if (options.json) outputJson(true, { type: 'stop', stopped: true, pid: current.pid });
        else success(`Sent stop signal to session PID ${current.pid}`);
      } catch (e) {
        if (options.json) outputJson(true, { type: 'stop', stopped: false, message: e.message });
        else error(`Unable to stop session PID ${current.pid}: ${e.message}`);
      }
    });

  addCommonStartOptions(program.command('dev').description('Preset alias for local development sharing'))
    .action(async (options) => {
      try {
        await startTunnelFlow(null, { ...options, verbose: true }, 'dev');
      } catch (e) {
        error(e.message || 'Dev preset failed.');
        process.exit(1);
      }
    });

  addCommonStartOptions(program.command('demo').description('Preset alias for demos with URL copy enabled'))
    .action(async (options) => {
      try {
        await startTunnelFlow(null, { ...options, copy: true, confirm: true }, 'demo');
      } catch (e) {
        error(e.message || 'Demo preset failed.');
        process.exit(1);
      }
    });

  await program.parseAsync(args);
}

module.exports = {
  run
};

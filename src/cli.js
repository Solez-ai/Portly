const { Command } = require('commander');
const ora = require('ora');
const {
  printHeader,
  info,
  success,
  error,
  printUrl,
  printClosing
} = require('./ui');
const { detectPort } = require('./portScanner');
const { createTunnel } = require('./tunnel');
const { renderQRCode } = require('./qr');
const { generateName } = require('../utils/nameGenerator');

async function resolvePort(manualPort) {
  if (manualPort) {
    const parsed = Number.parseInt(manualPort, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('Invalid port. Provide a value between 1 and 65535.');
    }

    return {
      port: parsed,
      framework: 'Manual'
    };
  }

  const spinner = ora('Scanning for running dev servers...').start();
  const detected = await detectPort();

  spinner.stop();

  if (!detected) {
    throw new Error(
      'No running local server detected on common ports (3000, 5173, 8080, 8000, 4200, 4000, 5000).'
    );
  }

  return detected;
}

async function run(argv = process.argv) {
  const program = new Command();

  program
    .name('portly')
    .description('Zero-config localhost tunnel for developers')
    .argument('[port]', 'Port to expose manually')
    .option('--name <subdomain>', 'Custom tunnel subdomain')
    .option('--host <host>', 'Optional host base for display URL (branding only)')
    .action(async (portArg, options) => {
      printHeader();

      let tunnelHandle;

      try {
        const target = await resolvePort(portArg);
        const tunnelName = options.name || generateName();

        success(`Found server on port ${target.port}${target.framework ? ` (${target.framework})` : ''}`);

        const spinner = ora('Creating secure tunnel...').start();
        tunnelHandle = await createTunnel({
          port: target.port,
          subdomain: tunnelName
        });
        spinner.succeed('Tunnel established');

        const publicUrl = options.host ? `https://${tunnelName}.${options.host}` : tunnelHandle.url;

        info(`Tunnel endpoint (provider): ${tunnelHandle.url}`);
        if (options.host && options.host.endsWith('.pages.dev')) {
          info('Note: Cloudflare Pages does not support wildcard tunnel subdomains by default.');
          info('The provider URL above is the guaranteed reachable tunnel URL.');
        }
        printUrl(publicUrl);
        info('Scan with your phone:\n');
        renderQRCode(publicUrl);
        info('\nPress CTRL+C to stop');

        const shutdown = (reason) => {
          if (tunnelHandle) {
            tunnelHandle.close(reason);
            printClosing(tunnelHandle.getCloseReason());
          }
          process.exit(0);
        };

        process.on('SIGINT', () => shutdown('interrupted by user'));
        process.on('SIGTERM', () => shutdown('terminated'));

        tunnelHandle.tunnel.on('close', () => {
          printClosing(tunnelHandle.getCloseReason());
          process.exit(0);
        });
      } catch (e) {
        error(e.message || 'Unexpected error while starting Portly.');
        process.exit(1);
      }
    });

  await program.parseAsync(argv);
}

module.exports = {
  run
};

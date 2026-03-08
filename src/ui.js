const chalk = require('chalk');

function printHeader() {
  console.log(chalk.cyan.bold('\n⚡ PORTLY\n'));
}

function printDivider() {
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')); 
}

function info(message) {
  console.log(chalk.gray(message));
}

function success(message) {
  console.log(chalk.green(`✔ ${message}`));
}

function error(message) {
  console.error(chalk.red(`✖ ${message}`));
}

function printUrl(url) {
  printDivider();
  console.log(chalk.bold.cyan('\n🌍 Public URL\n'));
  console.log(chalk.white.bold(url));
  console.log('');
  printDivider();
}

function printClosing(reason) {
  const suffix = reason ? ` (${reason})` : '';
  console.log(chalk.yellow(`\nTunnel closed${suffix}.`));
}

module.exports = {
  printHeader,
  printDivider,
  info,
  success,
  error,
  printUrl,
  printClosing
};
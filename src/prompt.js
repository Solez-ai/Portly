const readline = require('readline');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

async function chooseTarget(targets) {
  if (!process.stdin.isTTY || targets.length === 1) return targets[0];

  console.log('\nMultiple local apps detected:\n');
  targets.forEach((t, idx) => {
    console.log(`${idx + 1}. Port ${t.port} (${t.framework}) status=${t.status}`);
  });

  const answer = await ask('\nChoose app number: ');
  const selected = Number.parseInt(answer, 10);

  if (!Number.isInteger(selected) || selected < 1 || selected > targets.length) {
    return targets[0];
  }

  return targets[selected - 1];
}

async function confirmAction(promptText) {
  if (!process.stdin.isTTY) return false;
  const answer = (await ask(`${promptText} [y/N]: `)).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

module.exports = {
  chooseTarget,
  confirmAction
};

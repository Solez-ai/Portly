const adjectives = [
  'fast',
  'blue',
  'quiet',
  'iron',
  'mint',
  'silver',
  'bold',
  'rapid',
  'clever',
  'bright',
  'calm',
  'crisp',
  'lunar',
  'solar',
  'aero',
  'neon',
  'brisk',
  'solid',
  'clean',
  'prime'
];

const nouns = [
  'cat',
  'moon',
  'river',
  'fox',
  'lion',
  'falcon',
  'vector',
  'bridge',
  'node',
  'orbit',
  'spark',
  'cloud',
  'route',
  'pilot',
  'trail',
  'signal',
  'forge',
  'stream',
  'harbor',
  'anchor'
];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateName() {
  return `${pick(adjectives)}-${pick(nouns)}`;
}

module.exports = {
  generateName
};
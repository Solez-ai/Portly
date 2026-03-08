const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_CONFIG = {
  defaultPort: null,
  host: null,
  timeoutMs: 900,
  sessionTimeoutMs: 2 * 60 * 60 * 1000,
  reconnectAttempts: 3,
  reconnectDelayMs: 1500,
  allowlistPorts: [],
  denylistPorts: [],
  namePattern: 'adjective-noun'
};

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON config: ${filePath}`);
  }
}

function loadConfig(cwd = process.cwd()) {
  const globalPath = path.join(os.homedir(), '.portlyrc.json');
  const projectPath = path.join(cwd, '.portlyrc');
  const projectJsonPath = path.join(cwd, '.portlyrc.json');

  const config = {
    ...DEFAULT_CONFIG,
    ...readJsonIfExists(globalPath),
    ...readJsonIfExists(projectPath),
    ...readJsonIfExists(projectJsonPath)
  };

  return {
    config,
    paths: {
      globalPath,
      projectPath,
      projectJsonPath
    }
  };
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig
};

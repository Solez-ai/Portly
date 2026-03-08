# <img src="./logo.png" alt="Portly Logo" width="32" height="32" /> Portly

[![MIT License](https://img.shields.io/badge/License-MIT-0b4f8a.svg)](./LICENSE)
![Node](https://img.shields.io/badge/Node-%3E%3D18-125e3a.svg)
![CLI](https://img.shields.io/badge/Type-Developer%20CLI-1e3758.svg)

Portly is a zero-config localhost sharing CLI with smarter detection, safer defaults, and script-friendly automation.

```bash
npx @solez-ai/portly
```

## Features

- Scan all listening local ports (not only a fixed short list)
- Framework fingerprinting from headers + HTML signatures
- Multi-app selection when several local servers are detected
- Local health checks before tunnel startup
- Public reachability checks after tunnel startup
- Tunnel creation retry + auto-reconnect on drop
- Safer defaults: `--confirm`, auth/admin warning detection
- Port policy controls: `--allowlist`, `--denylist`
- CLI UX modes: `--json`, `--quiet`, `--verbose`, `--copy`
- Diagnostics command: `portly doctor`
- Session commands: `portly list`, `portly stop`
- Watch mode: `portly watch`
- Preset aliases: `portly dev`, `portly demo`
- Local config support (`.portlyrc`, `.portlyrc.json`, `~/.portlyrc.json`)
- NPM helper script: `npm run share`
- Optional git hook installer: `npm run hooks:install`

## Install

```bash
npm install -g @solez-ai/portly
```

Or run instantly:

```bash
npx @solez-ai/portly
```

## Core Commands

```bash
# Start tunnel
portly

# Manual port
portly 3000

# Watch mode
portly watch

# Diagnostics
portly doctor

# Sessions
portly list
portly stop

# Presets
portly dev
portly demo
```

## Useful Options

```bash
portly --json
portly --quiet
portly --verbose
portly --confirm
portly --copy
portly --allowlist 3000,5173
portly --denylist 9229
portly --host yourdomain.com
portly --no-reconnect
```

## Config

Portly merges config from:

```text
~/.portlyrc.json
./.portlyrc
./.portlyrc.json
```

Supported keys include:
- `defaultPort`
- `host`
- `timeoutMs`
- `allowlistPorts`
- `denylistPorts`
- `reconnectAttempts`
- `reconnectDelayMs`

## Docs and Links

- Docs: `https://portly-live.pages.dev`
- GitHub: `https://github.com/Solez-ai/Portly`
- npm: `https://www.npmjs.com/package/@solez-ai/portly`

## Local Development

```bash
git clone https://github.com/Solez-ai/Portly.git
cd Portly/portly
npm install
npm run share
npm run docs:serve
```

## License

MIT License. See [LICENSE](./LICENSE).

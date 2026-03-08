# <img src="./logo.png" alt="Portly Logo" width="32" height="32" /> Portly

[![MIT License](https://img.shields.io/badge/License-MIT-0b4f8a.svg)](./LICENSE)
![Node](https://img.shields.io/badge/Node-%3E%3D18-125e3a.svg)
![CLI](https://img.shields.io/badge/Type-Developer%20CLI-1e3758.svg)
![Status](https://img.shields.io/badge/MVP-Ready-0f6a45.svg)

Portly is a zero-config localhost sharing CLI.

Run one command and get a public HTTPS URL for your running dev server.

```bash
npx portly
```

## ◆ Core Promise

- `1` command
- `0` setup
- instant shareable URL + terminal QR code

## ◆ Features

- Automatic port detection (`3000`, `5173`, `8080`, `8000`, `4200`, `4000`, `5000`)
- Manual port override (`npx portly 3000`)
- Named sessions (`npx portly 3000 --name samin`)
- Clean CLI output with status states
- QR code generation for mobile opening
- Session auto timeout (2 hours)
- Inactivity timeout (2 hours)
- MIT license

## ◆ Example Output

```text
⚡ PORTLY

✔ Found server on port 5173 (Vite)
✔ Tunnel established

Tunnel endpoint (provider): https://quiet-fox.loca.lt

🌍 Public URL
https://quiet-fox.portly.dev

Scan with your phone:
[QR CODE]

Press CTRL+C to stop
```

## ◆ Installation

### Use without installing

```bash
npx portly
```

### Global install

```bash
npm install -g portly
portly
```

## ◆ CLI Usage

```bash
# Auto-detect local server
npx portly

# Manual port
npx portly 3000

# Manual port + named tunnel
npx portly 3000 --name samin

# Branded display host
npx portly --host portly.dev
```

## ◆ Project Structure

```text
portly/
├── bin/
│   └── portly.js
├── src/
│   ├── cli.js
│   ├── portScanner.js
│   ├── tunnel.js
│   ├── qr.js
│   └── ui.js
├── utils/
│   └── nameGenerator.js
├── docs-site/
│   ├── index.html
│   ├── docs.html
│   ├── install.html
│   ├── examples.html
│   ├── github.html
│   ├── favicon.png
│   └── assets/
│       ├── app.js
│       ├── logo.png
│       └── styles.css
├── logo.png
├── LICENSE
├── README.md
└── package.json
```

## ◆ Local Development

```bash
npm install
npm start
```

Serve docs locally:

```bash
npm run docs:serve
```

## ◆ Documentation Website

Premium multi-page docs site is included in `docs-site/`:

- Home
- Docs
- CLI Install
- Examples
- GitHub

Branding is wired to `logo.png` across nav + favicon + identity sections.

## ◆ Cloudflare + Domain Setup

For branded links like `https://cool-cat.portly.dev`:

1. Add your domain to Cloudflare.
2. Connect docs deployment (Vercel) to custom domain.
3. Configure wildcard DNS (`*.portly.dev`) to your tunnel routing target.
4. Set SSL/TLS mode to Full (strict).

## ◆ Security Notes

- Portly only exposes the selected local port.
- TLS is handled by tunnel provider.
- Session timeouts reduce unintended long-running exposure.

## ◆ Release Checklist

- Update version in `package.json`
- Publish to npm
- Deploy docs-site to Vercel
- Point domain/DNS through Cloudflare

## ◆ License

Licensed under [MIT](./LICENSE).
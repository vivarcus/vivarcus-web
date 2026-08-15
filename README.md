# Vivarcus Web

Web console for the [Vivarcus](https://vivarcus.com/) platform — a configurable digital platform for life sciences (eTMF, CTMS, Study Startup).

React + TypeScript + Vite. This repository is a public mirror of the frontend; the platform backend is proprietary.

## Local development

```bash
npm install
npm run dev          # starts Vite dev server; proxies /api to http://localhost:8080
```

A running Vivarcus backend is required for the console to be functional.

## Structure

| Path | Purpose |
|------|---------|
| `src/api` | Typed API client for the Vivarcus backend |
| `src/pages` | Route pages (login, TMF, CTMS, admin) |
| `src/components` | Shared UI components |
| `src/renderers` | Metadata-driven UI renderers |
| `src/theme` | Design tokens & theme |

## License

Apache License 2.0 — see [LICENSE](LICENSE).

Apache License 2.0 — see [LICENSE](LICENSE).

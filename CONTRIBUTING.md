# Contributing to firepwn

Thanks for your interest in contributing! This guide will help you get set up and keep the codebase consistent.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Code Style

This project uses [Biome](https://biomejs.dev/) for both **linting** and **formatting**. The configuration lives in [`biome.json`](biome.json).

Key style rules:
- 2-space indentation
- Double quotes
- No semicolons (unless required for disambiguation)
- 100-character line width
- Imports are auto-sorted

### Available Scripts

| Command | Description |
|---|---|
| `npm run lint` | Check for lint and formatting issues (no changes made) |
| `npm run lint:fix` | Auto-fix all fixable lint and formatting issues |
| `npm run format` | Format code only (no lint fixes) |

**Before submitting a PR**, make sure your code passes:

```bash
npm run lint
```

If there are issues, fix them with:

```bash
npm run lint:fix
```

## Editor Setup

Install the [Biome extension](https://biomejs.dev/guides/editors/first-party-extensions/) for your editor to get real-time feedback and format-on-save:

- **VS Code**: Install `biomejs.biome` from the Extensions panel
- **Other editors**: See the [Biome editor integrations](https://biomejs.dev/guides/editors/first-party-extensions/)

### Recommended VS Code Settings

Add these to your workspace or user settings for the best experience:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## Git Hook (Recommended)

We recommend setting up a pre-commit hook so formatting is applied automatically before each commit. You can do this with [lefthook](https://github.com/evilmartians/lefthook) or a simple git hook:

### Option A: Using lefthook

```bash
npm install -D lefthook
npx lefthook install
```

Then create a `lefthook.yml` in the project root:

```yaml
pre-commit:
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx,json,css}"
      run: npx biome check --fix --staged
```

### Option B: Manual git hook

Create `.git/hooks/pre-commit` and make it executable:

```bash
#!/bin/sh
npx biome check --fix --staged
```

```bash
chmod +x .git/hooks/pre-commit
```

> **Note**: Git hooks are local and not committed to the repo, so each contributor needs to set this up themselves.

## Project Structure

```
app/              # Next.js app directory (routes, layout, global styles)
components/
  firepwn/        # Application components
  ui/             # shadcn/ui components (auto-generated, do not edit manually)
hooks/            # Custom React hooks
lib/              # Utilities and context providers
public/           # Static assets
```

> `components/ui/` is excluded from linting and formatting since it contains auto-generated shadcn/ui components.

## Pull Request Guidelines

1. Fork the repo and create your branch from `main`
2. Make sure `npm run lint` passes with no errors
3. Keep PRs focused - one feature or fix per PR
4. Write clear commit messages describing what changed and why

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0 License](LICENSE).

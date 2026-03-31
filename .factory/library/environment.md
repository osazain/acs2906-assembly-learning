# Environment

## Required Environment

- **Node.js**: 18+ (for TypeScript 5.x support)
- **npm**: 9+ (for package management)
- **TypeScript**: 5.9+ (configured in project)

## Development Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## Content Validation

```bash
# Validate processed content
npm run validate:content
```

## Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Start Vite dev server |
| `build` | Type check + production build |
| `lint` | ESLint check |
| `preview` | Preview production build |
| `validate:content` | Validate processed JSON files |

## Output Directories

- `dist/` - Production build output
- `data/processed/` - Generated content JSON files
- `node_modules/` - Dependencies

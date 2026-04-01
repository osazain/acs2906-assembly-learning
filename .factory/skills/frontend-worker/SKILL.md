# Frontend Worker Skill

## Purpose
Implement UI changes for React + TypeScript + Vite applications using Tailwind CSS.

## Workflow

### 1. Read Mission Context
- Read `mission.md` for mission objectives
- Read `AGENTS.md` for implementation guidance
- Read relevant source files to understand current implementation

### 2. Implement Changes
- Make targeted edits to component files
- Follow existing code patterns and conventions
- Keep components small and focused

### 3. Verify
- Run `npm run build` to check for TypeScript errors
- Verify with `npm run lint` for linting issues

### 4. Commit
- Commit changes with descriptive message
- Push if tests pass

## Common Tasks

### Adding Theme Toggle
```tsx
// In header component:
const [theme, setTheme] = useState(() => 
  typeof window !== 'undefined' 
    ? localStorage.getItem('acs2906_theme') || 'system'
    : 'system'
);

const toggleTheme = () => {
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  setTheme(next);
  localStorage.setItem('acs2906_theme', next);
  // Apply class
  if (next === 'dark') document.documentElement.classList.add('dark');
  else if (next === 'light') document.documentElement.classList.remove('dark');
  else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
};
```

### Removing Navigation Items
In `src/routes.tsx`, find the sidebar navigation and remove items by deleting their entries from the `items` array.

### Redirecting Routes
Use TanStack Router's `redirect` function:
```tsx
// In route definition
beforeLoad: () => {
  throw redirect({ to: '/lectures' });
}
```

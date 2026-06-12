# Deployment

> Static single-page application. No backend, no database, no server-side logic.

## Build

```bash
npm install          # install dependencies
npm run type-check   # verify zero TypeScript errors
npm run lint         # verify zero lint warnings
npm run test:run     # run tests (currently no test files)
npm run build        # output to dist/
```

The `build` script runs `tsc -b && vite build` — TypeScript check is part of build.

## Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    # bundled app (~large; includes Three.js)
│   └── index-[hash].css
```

No server-side rendering. Serve `dist/` as a static directory.

## Development

```bash
npm run dev       # Vite dev server at http://localhost:5173 (default)
npm run preview   # preview production build locally
```

## Environment Variables

> [INFERRED] No `.env` files exist. No environment variables are required for the current build.

If added in the future, Vite reads `VITE_*` prefixed vars from `.env`, `.env.local`, `.env.production`.

## Hosting Options

Any static file host works. Recommended options:

| Option | Notes |
|--------|-------|
| Vercel | `vercel.json` not yet present; zero-config for Vite apps |
| Netlify | `netlify.toml` not yet present; set publish dir to `dist` |
| GitHub Pages | Requires `base` path config in `vite.config.ts` if hosted at subpath |
| Nginx | Serve `dist/` with `try_files $uri /index.html` for SPA routing |

## Nginx Config Snippet

```nginx
server {
  root /var/www/robotics-simulator/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
  add_header X-Content-Type-Options nosniff;
  add_header X-Frame-Options DENY;
  add_header Referrer-Policy no-referrer;
}
```

## CI/CD

> [INFERRED] No CI configuration files exist (no `.github/workflows/`, no `Dockerfile`, no `docker-compose.yml`).

Recommended minimal CI pipeline:

```yaml
# .github/workflows/ci.yml (not yet created)
steps:
  - run: npm ci
  - run: npm run type-check
  - run: npm run lint
  - run: npm run test:run
  - run: npm run build
```

## Browser Requirements

| Requirement | Reason |
|-------------|--------|
| WebGL 2 support | Three.js rendering |
| ES2020 | TypeScript target |
| Web Workers | Future IK/planner features |
| Gamepad API | Future gamepad input |

Tested on Chromium-based browsers. Firefox and Safari should work — [INFERRED] not explicitly tested.

## Bundle Size Considerations

Three.js is large (~1 MB gzipped in production). Consider:
- `@react-three/drei` tree-shaking (import only used helpers)
- Lazy-loading the 3D canvas if an initial 2D landing page is added
- Code-splitting workers when IK/planner are implemented (auto-handled by Vite worker syntax)

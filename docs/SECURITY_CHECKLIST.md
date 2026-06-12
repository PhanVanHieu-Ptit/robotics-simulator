# Security Checklist

> This is a static client-side application with no backend, no authentication, and no user-supplied data persistence. Security surface is minimal but not zero.

## Threat Model

| Threat | Applicability | Notes |
|--------|--------------|-------|
| SQL injection | N/A | No database |
| XSS from user input | Low | No user-generated HTML; Ant Design sanitizes inputs |
| CSRF | N/A | No authenticated server endpoints |
| Supply chain (npm) | Medium | 60+ dependencies including Three.js, React, Ant Design |
| localStorage tampering | Low | Only scene preferences stored; no secrets, no auth tokens |
| Prototype pollution | Low | No `JSON.parse` of untrusted data at runtime |
| Denial of service | Low | Single-user local app; no rate-limit concerns |
| Worker thread abuse | Low | Worker stubs never spawn; future IK/planner workers have no net access |

---

## Current Controls

| Control | Status | Notes |
|---------|--------|-------|
| TypeScript strict mode | ✅ | `strict: true` in tsconfig; catches type unsafety |
| `noUnusedLocals` / `noUnusedParameters` | ✅ | Reduces dead code surface |
| ESLint with typescript-eslint | ✅ | Catches common JS/TS anti-patterns |
| No `eval` / `new Function` | ✅ | [INFERRED] No dynamic code execution found |
| No `dangerouslySetInnerHTML` | ✅ | [INFERRED] Not used in any component |
| No sensitive data in localStorage | ✅ | Only `showGrid`, `cameraPreset`, etc. |
| No HTTP requests to external services | ✅ | Fully offline capable |
| No secrets in codebase | ✅ | No `.env` files, no API keys |

---

## Risks to Monitor

### Dependency Risk

- `three@0.170.0` — large, frequently updated; check for CVEs before upgrading
- `antd@5.23.0` — large UI library; rarely has security issues but worth auditing on major bumps
- `@react-three/fiber` and `@react-three/drei` — not widely audited for security

Run `npm audit` before any dependency update.

### Robot Config JSON (Future Risk)

If robot configs are ever loaded from user-supplied URLs or files:
- Must validate schema before passing to `FrankaArm` / `DifferentialDrive`
- Malformed DH params produce wrong physics but no code execution risk today
- [INFERRED] Currently loaded as static imports — no risk

### Web Worker Future Risk (T-001, T-016, T-017)

When IK/planner workers are implemented:
- Workers must not have `fetch` or `XMLHttpRequest` access to external URLs
- Comlink message passing is type-safe but untrusted message shapes should be validated
- Consider `Content-Security-Policy: worker-src 'self'` header at deployment

---

## Deployment Security (Static Hosting)

When deploying the Vite build output:

| Header | Recommended Value | Reason |
|--------|-------------------|--------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` | Restricts external script loading |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Referrer-Policy` | `no-referrer` | No referrer leakage |
| `Permissions-Policy` | `gamepad=()` | [INFERRED] Gamepad API may prompt; restrict if not needed |

> [INFERRED] No deployment config exists yet — these headers would be set in the hosting platform (Nginx, Vercel, Netlify config).

---

## Checklist for New Features

Before merging any new feature:

- [ ] Does it accept external input? If yes: validate schema at boundary.
- [ ] Does it make HTTP requests? If yes: restrict to known safe origins.
- [ ] Does it use `eval`, `Function`, or `innerHTML`? If yes: reject.
- [ ] Does it store user data in localStorage/sessionStorage? If yes: store only non-sensitive data.
- [ ] Does it spawn a Web Worker? If yes: verify worker has no external network access.
- [ ] Run `npm audit` — zero high/critical vulnerabilities.

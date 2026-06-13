# INC-001 — Visual Link Lengths Hardcoded Separately from DH Params

**Status**: `OPEN`
**Severity**: Low
**Backlog**: T-010

---

## Problem

The visual geometry of `FrankaArmMesh` uses a `LINK_LENGTHS` array hardcoded in the renderer. These values were manually entered to approximate the DH `d` parameters, but they are a separate copy. If `franka_panda.json` is updated (different DH params, corrected geometry), the visual representation silently diverges from the physics model.

---

## Root Cause

```ts
// src/rendering/robots/FrankaArm.tsx
const LINK_LENGTHS = [0.333, 0.316, 0.384, 0.0, 0.107, 0.088, 0.107]
```

Compare with DH `d` params in `franka_panda.json`:

```json
"dhParams": [
  { "d": 0.333, ... },
  { "d": 0.0,   ... },
  { "d": 0.316, ... },
  { "d": 0.0,   ... },
  { "d": 0.384, ... },
  { "d": 0.0,   ... },
  { "d": 0.107, ... }
]
```

The values partially overlap but are not in the same order (DH `d` parameters are along the joint z-axis, not link lengths in the visual sense). The renderer author manually rearranged and approximated them. This is fragile.

---

## Fix

Derive visual link lengths from DH params at component initialisation rather than hardcoding:

```ts
// src/rendering/robots/FrankaArm.tsx
import frankaConfig from '@config/robots/franka_panda.json'

// d-param gives joint offset along z; use it as the visual cylinder height
const LINK_LENGTHS = frankaConfig.dhParams.map((p) => p.d)
```

If the visual representation intentionally diverges from DH `d` (e.g., using `a` for horizontal links), document that reasoning in a comment so the next developer understands the mapping.

For a high-fidelity renderer, the GLB model (loaded via `RobotLoader`) is the correct source of visual geometry — DH params and visual lengths would then only need to agree on coordinate frames, not dimensions.

---

## Prevention

Never duplicate a numeric constant that already exists in config. If the visual length of a link and the DH `d` parameter represent different physical quantities, add an explicit `visualLength` field to the DH param schema rather than hardcoding a separate array.

---

## Related Files

- [src/rendering/robots/FrankaArm.tsx](../../src/rendering/robots/FrankaArm.tsx) — `LINK_LENGTHS` constant
- [src/config/robots/franka_panda.json](../../src/config/robots/franka_panda.json) — DH params (`d` and `a` fields)
- [docs/KNOWN_ISSUES.md](../KNOWN_ISSUES.md) — INC-1
- [docs/TASK_BACKLOG.md](../TASK_BACKLOG.md) — T-010

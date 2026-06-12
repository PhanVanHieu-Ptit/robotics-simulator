# Documentation Index

> Entry point for AI coding agents. Read this first.

---

## Document Directory

| Document | Purpose | Read Before Coding? | Update After Coding? |
|----------|---------|--------------------|--------------------|
| [SESSION_SUMMARY.md](SESSION_SUMMARY.md) | Current project state, key invariants, working vs. broken features | **Always** | When feature status changes |
| [TASK_BACKLOG.md](TASK_BACKLOG.md) | Prioritized work items with file pointers | **Always** | Move completed tasks; add new discoveries |
| [AI_BEHAVIOR.md](AI_BEHAVIOR.md) | Rules, conventions, and forbidden patterns for agents | **Always** | When new conventions are established |
| [API_CONTRACTS.md](API_CONTRACTS.md) | Command system, engine interface, store actions, config schemas | When touching commands, engine, or stores | When adding/changing command types or store actions |
| [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) | Zustand store shapes, data flow, subscription patterns, pitfalls | When touching stores or data flow | When store fields change |
| [COMPONENT_REGISTRY.md](COMPONENT_REGISTRY.md) | All components, their store dependencies, props, and hierarchy | When touching UI or rendering | When adding/removing/renaming components |
| [FEATURE_MAP.md](FEATURE_MAP.md) | Feature status (✅/🔶/❌) mapped to implementation files | When implementing or changing a feature | When feature status changes |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | localStorage schema, in-memory state shapes | When touching persistence or data models | When localStorage schema changes |
| [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) | Threat model, existing controls, per-feature security checklist | When adding user input, network, or workers | When new input boundaries are added |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Build commands, hosting options, CI notes, browser requirements | When building or deploying | When build process changes |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Test infrastructure, what to test, mocking notes, FK test vectors | When writing tests | When test infrastructure changes |

---

## Pre-Task Minimal Read Set

For **any** coding task, read in this order before touching code:

1. [SESSION_SUMMARY.md](SESSION_SUMMARY.md) — 2 min read, gives full situational awareness
2. [TASK_BACKLOG.md](TASK_BACKLOG.md) — confirm the task exists and is not blocked
3. [AI_BEHAVIOR.md](AI_BEHAVIOR.md) — check the rules for the relevant layer
4. The specific document for the area you're changing (see table above)

---

## After-Task Update Set

After completing any task:

1. Mark task as **Completed** in [TASK_BACKLOG.md](TASK_BACKLOG.md) with date + commit ref
2. Update **Feature status** in [FEATURE_MAP.md](FEATURE_MAP.md) if a stub was implemented
3. Update the relevant contract/schema doc if interfaces changed
4. Update [SESSION_SUMMARY.md](SESSION_SUMMARY.md) if a major blocker was resolved

---

## Existing Pre-AI Documentation

These files were created before the AI knowledge base. They contain valuable detail:

| File | Contains |
|------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed system design, component responsibilities, data flow diagrams |
| [DECISIONS.md](DECISIONS.md) | D1–D10 architectural decisions with rationale and trade-offs |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | BUG-1–4, PERF-1–6, SCALE-1–4, INC-1–3 with fix descriptions |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Tech stack table, feature state table, current vs. planned capabilities |

---

## Quick Reference

**Entry point:** `src/main.tsx` → `src/App.tsx`

**Engine singleton:** `src/hooks/useSimulation.ts` → `getEngine()`

**Add a new robot command:**
1. `src/simulation/types/Command.ts` — add to union
2. `src/simulation/systems/InputSystem.ts` — add dispatch branch
3. Update [API_CONTRACTS.md](API_CONTRACTS.md)

**Add a new ECS system:**
1. Create `src/simulation/systems/MySystem.ts` implementing `System`
2. Register in `SimulationEngine.ts` after `TrajectorySystem`
3. Update [API_CONTRACTS.md](API_CONTRACTS.md) and [FEATURE_MAP.md](FEATURE_MAP.md)

**Add a new Zustand store field:**
1. Update store interface and initial state in `src/store/*.ts`
2. Update [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

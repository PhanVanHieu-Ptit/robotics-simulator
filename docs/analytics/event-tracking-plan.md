# Event Tracking Plan — Robotics Simulator
**Platform:** PostHog  
**Last updated:** 2026-06-13  
**Author:** Product Analytics Engineering

---

## Overview

This plan covers every measurable user behaviour in the robotics simulator: a browser-based 3D physics environment featuring a 7-DOF Franka Panda arm and a differential-drive mobile base. The simulator has three distinct user modes (`manual`, `auto`, `replay`) and two control surfaces (keyboard / UI).

Events follow PostHog's `snake_case` naming convention. All events are fired via:

```ts
posthog.capture('event_name', { ...properties })
```

Global super-properties attached to every event automatically via `posthog.register()`:

| Property | Type | Value |
|---|---|---|
| `app_version` | string | from `import.meta.env.VITE_APP_VERSION` |
| `sim_mode` | `'manual' \| 'auto' \| 'replay'` | current `simulationStore.mode` |
| `platform` | string | `navigator.platform` |
| `user_agent` | string | `navigator.userAgent` |

---

## 1. User Events

Events triggered by direct user interaction.

---

### `simulation_started`
**Trigger:** User clicks **Run** button or presses `Space` when simulation is idle (`isRunning === false`).  
**Source:** `useSimulation.start()` → `simulationStore.setRunning(true)`

| Property | Type | Example | Notes |
|---|---|---|---|
| `sim_mode` | string | `'manual'` | Active mode at start time |
| `sim_speed` | number | `1` | Speed multiplier (`0.25 \| 0.5 \| 1 \| 2 \| 4`) |
| `input_method` | `'keyboard' \| 'button'` | `'keyboard'` | Infer from event origin |
| `robots_active` | string[] | `['franka_panda','diff_drive']` | IDs registered in `SimulationWorld` |
| `session_run_count` | number | `3` | How many times Run was clicked this session |

**Business purpose:** Primary activation metric. Tells us how quickly new visitors discover the simulator and how often returning users start a session.

---

### `simulation_paused`
**Trigger:** User clicks **Pause** button while simulation is running and not paused.  
**Source:** `useSimulation.pause()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `sim_time_elapsed` | number | `12.4` | `metricsStore.simTime` at pause moment (seconds) |
| `frame_time_ms` | number | `16.2` | `metricsStore.frameTime` at pause moment |
| `input_method` | `'keyboard' \| 'button'` | `'button'` | |

**Business purpose:** Identifies when users need to stop and inspect state — signals that the real-time visualisation is complex enough to need analysis pauses.

---

### `simulation_resumed`
**Trigger:** User clicks **Resume** while paused.  
**Source:** `useSimulation.resume()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `pause_duration_ms` | number | `3500` | Wall-clock time between pause and resume |
| `sim_time_elapsed` | number | `12.4` | Sim time at resume |

**Business purpose:** Paired with `simulation_paused` to compute average inspection time — longer pauses correlate with deeper engagement.

---

### `simulation_stopped`
**Trigger:** User clicks **Stop & reset** button.  
**Source:** `useSimulation.stop()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `sim_time_elapsed` | number | `45.0` | Total simulated time before stop |
| `trajectory_length_franka` | number | `873` | Ring-buffer point count for Franka arm |
| `trajectory_length_diff_drive` | number | `210` | Ring-buffer point count for mobile base |
| `joint_angles_at_stop` | number[] | `[0.1, -0.5, ...]` | `robotStore.jointAngles` snapshot (7 values) |

**Business purpose:** Measures session depth and serves as the denominator for engagement rate (sim_time / wall_time).

---

### `simulation_stepped`
**Trigger:** User clicks the **Step** (single-frame advance) button.  
**Source:** `useSimulation.step()` — only callable when paused.

| Property | Type | Example | Notes |
|---|---|---|---|
| `sim_time_before` | number | `5.32` | Sim time before the step |
| `active_panel` | string | `'arm'` | Which sidebar tab is open |

**Business purpose:** Step-through usage indicates power users doing debugging/education — a leading indicator of advanced adoption.

---

### `page_reloaded`
**Trigger:** User clicks the **Reload** button (calls `location.reload()`).  
**Source:** `Toolbar.tsx` reload button `onClick`.

| Property | Type | Example | Notes |
|---|---|---|---|
| `sim_time_elapsed` | number | `0.0` | Sim time before reload |
| `was_running` | boolean | `false` | `simulationStore.isRunning` at reload |

**Business purpose:** Distinguishes deliberate resets from browser-level errors. High reload rate with low sim time suggests onboarding confusion.

---

### `joint_angle_changed`
**Trigger:** User moves a joint slider in the **Arm** panel. Debounced — fires once per slider interaction end (300 ms idle after last `onChange`).  
**Source:** `ManipulatorControls.tsx` → `setAngle()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `joint_name` | string | `'panda_joint3'` | `joint.name` from ManipulatorSystem |
| `joint_index` | number | `2` | Zero-based index |
| `angle_deg_before` | number | `-45.0` | Angle before this drag |
| `angle_deg_after` | number | `23.5` | Angle after drag (on settle) |
| `delta_deg` | number | `68.5` | Absolute delta |
| `ee_x` | number | `0.3012` | End-effector X after move (m) |
| `ee_y` | number | `-0.1024` | End-effector Y after move (m) |
| `ee_z` | number | `0.4885` | End-effector Z after move (m) |

**Business purpose:** Identifies which joints are explored most (frequency map) and whether users are reaching meaningful end-effector poses. Feeds FK-feature engagement.

---

### `joints_reset`
**Trigger:** User clicks **Reset All** in the Arm panel.  
**Source:** `ManipulatorControls.tsx` → `resetAngles()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `angles_before` | number[] | `[10.0, -45.0, ...]` | Joint angles (deg) before reset |
| `ee_pose_before` | object | `{x, y, z}` | End-effector position before reset (m) |

**Business purpose:** Users who reset often are experimenting iteratively — a positive engagement signal. Users who reset immediately after starting may be confused.

---

### `drive_command_issued`
**Trigger:** User sends a DRIVE command via the Control Panel buttons (`onPointerDown`). Grouped by interaction — fires on pointer-up (end of sustained press).  
**Source:** `ControlPanel.tsx` → `dispatch({ type: 'DRIVE', ... })`

| Property | Type | Example | Notes |
|---|---|---|---|
| `direction` | `'forward' \| 'backward' \| 'left' \| 'right'` | `'forward'` | Derived from `{linear, angular}` |
| `input_method` | `'keyboard' \| 'button' \| 'gamepad'` | `'button'` | Source controller |
| `duration_ms` | number | `850` | Pointer-down to pointer-up duration |
| `distance_traveled_m` | number | `1.27` | Delta distance from `robotStore.basePose` |

**Business purpose:** Measures mobile-base engagement. Low usage with active arm usage = arm-only users. Cross-reference with session cohorts.

---

### `camera_preset_changed`
**Trigger:** User changes camera preset in Config panel.  
**Source:** `ConfigPanel.tsx` → `setCameraPreset()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `from_preset` | string | `'perspective'` | Previous preset |
| `to_preset` | string | `'top'` | New preset |
| `sim_running` | boolean | `true` | Whether simulation was running during switch |

**Business purpose:** Top-view usage correlates with 2D path analysis; front/side with kinematics inspection. Informs which camera angles to default for different user segments.

---

### `sim_speed_changed`
**Trigger:** User changes speed multiplier in Config panel.  
**Source:** `ConfigPanel.tsx` → `setSpeed()`

| Property | Type | Example | Notes |
|---|---|---|---|
| `from_speed` | number | `1` | Previous multiplier |
| `to_speed` | number | `4` | New multiplier (`0.25 \| 0.5 \| 1 \| 2 \| 4`) |
| `sim_time_elapsed` | number | `8.3` | Sim time at change moment |

**Business purpose:** 0.25× usage = slow-motion analysis (education). 4× usage = quick iteration (engineering). Segment these users differently.

---

### `scene_toggle_changed`
**Trigger:** User toggles any scene visualisation switch (Grid, Coord frames, Trajectory, Bounding boxes).  
**Source:** `ConfigPanel.tsx` toggle `Switch` components.

| Property | Type | Example | Notes |
|---|---|---|---|
| `toggle_name` | `'grid' \| 'coordinate_frames' \| 'trajectory' \| 'bounding_boxes'` | `'trajectory'` | |
| `new_state` | boolean | `true` | On or off |
| `sim_running` | boolean | `true` | Context of toggle |

**Business purpose:** Trajectory toggle = user cares about path history. Coordinate-frames toggle = engineering intent. Guides which overlays to enable by default.

---

### `sidebar_tab_switched`
**Trigger:** User clicks a tab in the Sidebar (`Arm`, `Joints`, `Drive`, `Hierarchy`, `Config`, `Telemetry`, `Perf`).  
**Source:** `Sidebar.tsx` Tabs `onChange`.

| Property | Type | Example | Notes |
|---|---|---|---|
| `from_tab` | string | `'arm'` | Previous active tab |
| `to_tab` | string | `'telemetry'` | New active tab |
| `dwell_ms` | number | `4200` | Time spent on previous tab |
| `sim_running` | boolean | `true` | |

**Business purpose:** Tab-dwell heatmap reveals which panels are valuable. Very short dwell = accidental click or confusion. Long dwell on Telemetry = data-oriented user.

---

### `hierarchy_node_expanded`
**Trigger:** User expands a node in the Hierarchy panel tree view.  
**Source:** `HierarchyPanel.tsx` Tree `onExpand`.

| Property | Type | Example | Notes |
|---|---|---|---|
| `node_type` | string | `'Bone'` | `Mesh \| Bone \| Group \| SkinnedMesh \| Object3D` |
| `node_name` | string | `'panda_link3'` | |
| `depth` | number | `3` | Depth in scene graph |
| `is_joint_candidate` | boolean | `true` | Whether node was flagged as joint |

**Business purpose:** Signals debugging intent — users exploring the model hierarchy are likely developers or researchers integrating their own robot URDF/GLB.

---

## 2. Conversion Events

High-value milestones that indicate a user has gotten real value from the product.

---

### `first_simulation_run`
**Trigger:** First time `simulation_started` fires in a browser session (or ever for an identified user).  
**Implementation:** Check `posthog.get_distinct_id()` + person property `first_sim_run_at` is unset, then set it.

| Property | Type | Example |
|---|---|---|
| `time_to_first_run_ms` | number | `12500` |
| `panel_open_at_first_run` | string | `'arm'` |
| `scroll_depth_before_run` | number | `0` |

**Business purpose:** Core activation metric. Goal: < 60 s from page load to first Run click. Drives onboarding optimisation.

---

### `trajectory_observed`
**Trigger:** User enables **Trajectory** toggle while simulation has been running for ≥ 5 s AND the trajectory ring-buffer has ≥ 50 points.

| Property | Type | Example |
|---|---|---|
| `sim_time_when_observed` | number | `18.2` |
| `trajectory_points` | number | `312` |
| `robot_id` | string | `'franka_panda'` |

**Business purpose:** User has discovered the core kinematic-trail feature — a strong signal they understand the product's value proposition.

---

### `end_effector_pose_read`
**Trigger:** User navigates to the **Arm** tab and the `EndEffectorDisplay` renders with `isReady === true` for the first time.

| Property | Type | Example |
|---|---|---|
| `ee_x` | number | `0.301` |
| `ee_y` | number | `-0.102` |
| `ee_z` | number | `0.489` |
| `joints_moved_before_read` | number | `3` |

**Business purpose:** FK data is the core numerical output of the arm simulator. A user reading EE pose has found the quantitative result — key conversion point for engineering users.

---

### `multi_robot_session`
**Trigger:** Within a single simulation session (between `simulation_started` and `simulation_stopped`), the user issues at least one `SET_JOINT` command AND at least one `DRIVE` command.

| Property | Type | Example |
|---|---|---|
| `sim_time_elapsed` | number | `30.5` |
| `joint_commands_count` | number | `12` |
| `drive_commands_count` | number | `5` |

**Business purpose:** Users interacting with both robots in the same session represent the highest-value cohort — they are exploring the full capability of the simulator.

---

## 3. Funnel Events

Ordered sequence of events defining the user activation funnel.

```
Step 1: app_loaded
Step 2: sidebar_tab_switched  (to 'arm')          ← discovers arm panel
Step 3: joint_angle_changed                        ← first interaction
Step 4: simulation_started                         ← runs the sim
Step 5: trajectory_observed                        ← sees the value
Step 6: end_effector_pose_read                     ← quantitative result
```

---

### `app_loaded`
**Trigger:** `App.tsx` mounts (React tree initialised, 3D scene canvas ready). This is the funnel entry point.  
**Implementation:** `useEffect` in `AppLayout` on first render.

| Property | Type | Example |
|---|---|---|
| `load_time_ms` | number | `1240` | `performance.now()` at mount |
| `webgl_supported` | boolean | `true` | `!!window.WebGLRenderingContext` |
| `three_renderer_ready` | boolean | `true` | Set `true` once `useSimulationFrame` first fires |

**Business purpose:** Funnel entry point. Monitors cold-start performance and WebGL availability across devices.

---

### `arm_panel_first_opened`
**Trigger:** User visits the **Arm** tab for the first time in a session (`from_tab` is not `arm`, fired as part of `sidebar_tab_switched`).

| Property | Type | Example |
|---|---|---|
| `time_since_app_load_ms` | number | `3200` |
| `joint_count` | number | `7` |

**Business purpose:** Step 2 of funnel. Measures discoverability of the primary panel.

---

### `first_joint_interaction`
**Trigger:** First `joint_angle_changed` event in a session.

| Property | Type | Example |
|---|---|---|
| `time_since_app_load_ms` | number | `5800` |
| `first_joint_touched` | string | `'panda_joint1'` |

**Business purpose:** Step 3 of funnel. Measures time-to-first-interaction.

---

### `simulation_run_after_interaction`
**Trigger:** `simulation_started` fires after at least one `joint_angle_changed` or `drive_command_issued` in the session.

| Property | Type | Example |
|---|---|---|
| `interactions_before_run` | number | `4` |
| `time_from_first_interaction_ms` | number | `8200` |

**Business purpose:** Captures the crucial "try it → run it" journey. Drop-off here means users interact but don't close the loop with simulation.

---

### `funnel_completed`
**Trigger:** Synthetic event fired when all five steps (`app_loaded` → `end_effector_pose_read`) occur within a single session.

| Property | Type | Example |
|---|---|---|
| `total_funnel_time_ms` | number | `185000` |
| `steps_completed` | number | `6` |
| `sim_mode` | string | `'manual'` |

**Business purpose:** Overall funnel conversion rate. Target: > 20% of `app_loaded` events reach `funnel_completed`.

---

## 4. Retention Events

Events indicating a user has returned or is deeply engaged.

---

### `returning_session_started`
**Trigger:** `app_loaded` fires AND PostHog person property `first_sim_run_at` is already set (user has run the sim before, detected via `posthog.get_feature_flag` or person props).

| Property | Type | Example |
|---|---|---|
| `days_since_first_use` | number | `7` |
| `total_prior_sessions` | number | `3` |
| `last_mode_used` | string | `'manual'` |

**Business purpose:** Day-7 and Day-30 retention cohorts. Early engineering target: ≥ 40% D7 retention.

---

### `long_session`
**Trigger:** `simulation_stopped` fires with `sim_time_elapsed ≥ 120` seconds (2 full simulated minutes).

| Property | Type | Example |
|---|---|---|
| `sim_time_s` | number | `185.0` |
| `wall_time_ms` | number | `240000` |
| `speed_multiplier` | number | `1` |
| `panels_visited` | string[] | `['arm','telemetry','config']` |

**Business purpose:** Deep engagement proxy. Users in long sessions are most likely to return and most likely to recommend the tool.

---

### `advanced_feature_used`
**Trigger:** User uses any of: `simulation_stepped`, `hierarchy_node_expanded`, or sets speed to `0.25×` or `4×`. Fires once per feature per session.

| Property | Type | Example |
|---|---|---|
| `feature` | `'step_frame' \| 'hierarchy_inspect' \| 'speed_0.25x' \| 'speed_4x'` | `'step_frame'` |
| `session_run_count` | number | `2` |

**Business purpose:** Distinguishes casual users from power users. Power users have higher retention and are better candidates for advanced feature announcements (IK, collision, path planning).

---

### `daily_active_use`
**Trigger:** Fired once per calendar day when `simulation_started` fires and the user's last `simulation_started` was on a different UTC date.  
**Implementation:** Compare `localStorage.getItem('last_run_date')` to `new Date().toISOString().slice(0,10)`.

| Property | Type | Example |
|---|---|---|
| `consecutive_days` | number | `5` |
| `total_active_days` | number | `12` |

**Business purpose:** DAU metric. Streak data informs habit formation and feature announcement timing.

---

### `trajectory_buffer_saturated`
**Trigger:** The Franka arm trajectory ring-buffer reaches its maximum capacity (2000 points, per `SimulationConfig.maxTrajectoryLength`).

| Property | Type | Example |
|---|---|---|
| `sim_time_when_saturated_s` | number | `66.7` |
| `speed_multiplier` | number | `1` |

**Business purpose:** Users who run long enough to saturate the buffer are deeply engaged. Also flags whether the 2000-point cap needs raising.

---

## 5. Error Events

Events tracking failures, degraded states, and unexpected conditions.

---

### `performance_degraded`
**Trigger:** `PerformanceMonitor` detects FPS < 30 for three or more consecutive frames (tracked via `metricsStore.subscribe`).  
**Source:** `PerformanceMonitor.tsx` — already applies red colouring below 30 fps.

| Property | Type | Example |
|---|---|---|
| `fps_observed` | number | `18` |
| `frame_time_ms` | number | `55.2` |
| `sim_speed` | number | `4` |
| `draw_calls` | number | `142` |
| `triangle_count` | number | `48000` |
| `duration_frames` | number | `5` | Consecutive low-FPS frames |

**Business purpose:** Identifies device tiers that struggle with the renderer. Informs LOD strategy and whether heavy sim speeds need a framerate cap warning.

---

### `ik_solver_error`
**Trigger:** `solveIK()` throws its `'IK solver not yet implemented'` error. Capture in a `try/catch` wrapper added to the call site.  
**Source:** `src/simulation/kinematics/InverseKinematics.ts`

| Property | Type | Example |
|---|---|---|
| `error_message` | string | `'IK solver not yet implemented'` |
| `target_pose` | object | `{x, y, z, qx, qy, qz, qw}` |
| `current_angles` | number[] | `[0.1, -0.5, ...]` |
| `robot_id` | string | `'franka_panda'` |

**Business purpose:** Tracks how many users attempt IK before the feature ships. Directly justifies prioritising the IK implementation milestone.

---

### `collision_detection_stub_hit`
**Trigger:** `CollisionSystem.tick()` is called while `world.obstacles` has entries — the system is called but does nothing. Fire once per session.  
**Source:** `CollisionSystem.ts`

| Property | Type | Example |
|---|---|---|
| `obstacle_count` | number | `2` |
| `robot_ids` | string[] | `['franka_panda']` |

**Business purpose:** Analogous to `ik_solver_error` — quantifies demand for collision detection before it ships.

---

### `path_planner_stub_hit`
**Trigger:** `PathPlannerSystem.tick()` is called while a path goal is pending. Fire once per session.  
**Source:** `PathPlannerSystem.ts`

| Property | Type | Example |
|---|---|---|
| `goal_pose` | object | `{x, y, theta}` |
| `robot_id` | string | `'diff_drive'` |

**Business purpose:** Quantifies demand for the RRT/PRM path planner before it ships.

---

### `webgl_context_lost`
**Trigger:** `canvas.addEventListener('webglcontextlost', ...)` fires.  
**Implementation:** Add listener in `SceneRoot.tsx`.

| Property | Type | Example |
|---|---|---|
| `sim_time_elapsed` | number | `42.1` |
| `triangle_count` | number | `65000` |
| `was_running` | boolean | `true` |

**Business purpose:** WebGL context loss causes a complete blank screen — a critical UX failure. Monitors frequency and correlates with heavy scenes.

---

### `joint_limit_clamped`
**Trigger:** `FrankaArm.applyCommand()` clamps an incoming angle to its joint limit. Fire when `|requested_angle - clamped_angle| > 0.01 rad`. Debounced to once per joint per 500 ms.  
**Source:** `FrankaArm.ts:45`

| Property | Type | Example |
|---|---|---|
| `joint_index` | number | `3` |
| `requested_deg` | number | `210.0` |
| `clamped_deg` | number | `166.0` |
| `limit_min_deg` | number | `-166.0` |
| `limit_max_deg` | number | `166.0` |

**Business purpose:** Determines whether joint limits are discovered and understood. High clamping rate on specific joints may indicate UX friction (slider range should show limits visually).

---

### `simulation_engine_error`
**Trigger:** Any uncaught exception inside `SimulationEngine.tick()` — wrap the tick body in a `try/catch`.  
**Source:** `SimulationEngine.ts`

| Property | Type | Example |
|---|---|---|
| `error_message` | string | `'Cannot read properties of undefined'` |
| `stack_trace` | string | `'at FrankaArm.step...'` |
| `sim_time` | number | `7.3` |
| `dt` | number | `0.0167` |
| `systems_registered` | string[] | `['InputSystem','KinematicsSystem','TrajectorySystem']` |

**Business purpose:** Production crash detection. These should be zero in steady state. Any spike triggers an alert.

---

## Implementation Notes

### PostHog Initialisation

```ts
// src/main.tsx
import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: { maskAllInputs: false }, // sliders are safe to record
  autocapture: false, // all events are explicit — no click noise
})

// Super-properties set once at init
posthog.register({
  app_version: import.meta.env.VITE_APP_VERSION ?? 'dev',
  platform: navigator.platform,
})
```

### Recommended Feature Flags

| Flag | Purpose |
|---|---|
| `show_ik_controls` | Gate IK panel UI before solver ships |
| `show_path_planner_ui` | Gate path planning controls |
| `enable_collision_debug` | Enable collision system visualisation |
| `trajectory_buffer_size` | A/B test 1000 vs 2000 vs 5000 cap |

### Dashboards to Build First

1. **Activation funnel** — `app_loaded` → `funnel_completed` conversion rate
2. **Feature engagement** — event counts for `joint_angle_changed`, `drive_command_issued`, `trajectory_observed`
3. **Performance health** — `performance_degraded` frequency by FPS bucket and device
4. **Stub demand** — `ik_solver_error` + `path_planner_stub_hit` by week (roadmap signal)
5. **Retention** — D1/D7/D30 cohorts based on `returning_session_started`

import { useCallback } from 'react'
import { SimulationEngine } from '@simulation/core/SimulationEngine'
import { SimulationClock }  from '@simulation/core/SimulationClock'
import { SimulationWorld }  from '@simulation/world/SimulationWorld'
import { EventBus }         from '@simulation/core/EventBus'
import type { SimulationEvents } from '@simulation/core/EventBus'
import { InputSystem }      from '@simulation/systems/InputSystem'
import { KinematicsSystem } from '@simulation/systems/KinematicsSystem'
import { TrajectorySystem } from '@simulation/systems/TrajectorySystem'
import { DifferentialDrive }  from '@simulation/robots/DifferentialDrive'
import { FrankaArm }          from '@simulation/robots/FrankaArm'
import { useRobotStore }      from '@store/robotStore'
import { useSimulationStore } from '@store/simulationStore'
import { metricsStore }       from '@store/metricsStore'
import frankaConfig    from '@config/robots/franka_panda.json'
import diffDriveConfig from '@config/robots/differential_drive.json'
import { validateFrankaConfig, validateDiffDriveConfig } from '@config/validateRobotConfig'

// ---------------------------------------------------------------------------
// Module-level singletons — one engine and one event bus for the app lifetime.
// Exposed via getEngine() / getEventBus() so other modules can subscribe to
// simulation events without causing React re-renders.
// ---------------------------------------------------------------------------
let _engine: SimulationEngine | null = null
const _bus = new EventBus<SimulationEvents>()

export function getEngine(): SimulationEngine | null {
  return _engine
}

export function getEventBus(): EventBus<SimulationEvents> {
  return _bus
}

function createEngine(): SimulationEngine {
  const world = new SimulationWorld()
  const clock = new SimulationClock()

  world.addRobot(new FrankaArm(validateFrankaConfig(frankaConfig)))
  world.addRobot(new DifferentialDrive(validateDiffDriveConfig(diffDriveConfig)))

  return new SimulationEngine(
    world,
    clock,
    [new InputSystem(), new KinematicsSystem(), new TrajectorySystem()],
    (snapshot) => {
      useRobotStore.getState().applySnapshot(snapshot)
      if (useSimulationStore.getState().isRunning) {
        metricsStore.update(snapshot.simTime, snapshot.frameTime, snapshot.wallDeltaSec)
      }
    },
    _bus,
  )
}

// Ensure the engine exists — idempotent, safe to call during render.
function ensureEngine(): SimulationEngine {
  _engine ??= createEngine()
  return _engine
}

// ---------------------------------------------------------------------------
// Hook — only subscribes to the two boolean fields it actually needs.
// Components that call this will NOT re-render when simTime/frameTime change.
// ---------------------------------------------------------------------------
export function useSimulation() {
  ensureEngine()

  // Fine-grained selectors: re-render only when these two booleans change.
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isPaused  = useSimulationStore((s) => s.isPaused)

  const start = useCallback(
    () => useSimulationStore.setState({ isRunning: true, isPaused: false }),
    [],
  )

  const pause  = useCallback(() => useSimulationStore.setState({ isPaused: true }),  [])
  const resume = useCallback(() => useSimulationStore.setState({ isPaused: false }), [])

  const stop = useCallback(() => {
    getEngine()?.reset()
    useSimulationStore.setState({ isRunning: false, isPaused: false })
    useRobotStore.getState().resetAll()
  }, [])

  const step = useCallback(() => {
    getEngine()?.step()
  }, [])

  return { isRunning, isPaused, start, pause, resume, stop, step }
}

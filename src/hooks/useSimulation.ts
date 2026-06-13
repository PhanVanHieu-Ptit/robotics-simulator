import { useCallback } from 'react'
import { SimulationEngine } from '@simulation/core/SimulationEngine'
import { SimulationClock }  from '@simulation/core/SimulationClock'
import { SimulationWorld }  from '@simulation/world/SimulationWorld'
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

// ---------------------------------------------------------------------------
// Module-level singleton — one engine for the entire app lifetime.
// Exposed via getEngine() so other hooks can access it without subscribing
// to the Zustand store (and without causing React re-renders).
// ---------------------------------------------------------------------------
let _engine: SimulationEngine | null = null

export function getEngine(): SimulationEngine | null {
  return _engine
}

function createEngine(): SimulationEngine {
  const world = new SimulationWorld()
  const clock = new SimulationClock()

  world.addRobot(
    new FrankaArm({
      id: frankaConfig.id,
      dhParams: frankaConfig.dhParams,
      jointLimits: frankaConfig.jointLimits,
      initialAngles: frankaConfig.initialAngles,
    }),
  )

  world.addRobot(
    new DifferentialDrive({
      id: diffDriveConfig.id,
      wheelBase: diffDriveConfig.wheelBase,
      wheelRadius: diffDriveConfig.wheelRadius,
      maxLinearVel: diffDriveConfig.maxLinearVel,
      maxAngularVel: diffDriveConfig.maxAngularVel,
    }),
  )

  return new SimulationEngine(
    world,
    clock,
    [new InputSystem(), new KinematicsSystem(), new TrajectorySystem()],
    (snapshot) => {
      useRobotStore.getState().applySnapshot(snapshot)
      if (useSimulationStore.getState().isRunning) {
        metricsStore.update(snapshot.simTime, snapshot.frameTime)
      }
    },
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

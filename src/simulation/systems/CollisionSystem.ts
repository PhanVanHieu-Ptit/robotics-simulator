import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'

/**
 * Stub — collision detection not yet implemented.
 *
 * Future plan:
 *  1. Assign OBB/sphere bounding volumes to each link (from robot config).
 *  2. BVH broadphase against world.obstacles each tick.
 *  3. Emit EventBus 'collision' events consumed by InputSystem to stop motion.
 *  4. Optionally back with @react-three/rapier for contact forces.
 */
export class CollisionSystem implements System {
  tick(_world: SimulationWorld, _dt: number): void {
    // TODO: implement broadphase BVH collision detection
  }
}

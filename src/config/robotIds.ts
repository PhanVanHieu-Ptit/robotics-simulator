import frankaConfig from './robots/franka_panda.json'
import diffDriveConfig from './robots/differential_drive.json'

/** Single source of truth for robot IDs — always matches the JSON config files. */
export const FRANKA_ID: string = frankaConfig.id
export const DIFF_DRIVE_ID: string = diffDriveConfig.id

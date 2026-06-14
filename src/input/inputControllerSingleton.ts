import type { KeyboardController } from './KeyboardController'
import type { GamepadController } from './GamepadController'

let _kb: KeyboardController | null = null
let _gp: GamepadController | null = null

export function setInputControllers(kb: KeyboardController, gp: GamepadController): void {
  _kb = kb
  _gp = gp
}

export function clearInputControllers(): void {
  _kb = null
  _gp = null
}

export function getKeyboardController(): KeyboardController | null {
  return _kb
}

export function getGamepadController(): GamepadController | null {
  return _gp
}

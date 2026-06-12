export interface RawInput {
  forward:  boolean
  backward: boolean
  left:     boolean
  right:    boolean
  // Future: tool0..tool5 for joint control
}

const EMPTY_INPUT: RawInput = { forward: false, backward: false, left: false, right: false }

export class KeyboardController {
  private _input: RawInput = { ...EMPTY_INPUT }
  private readonly handlers: { down: (e: KeyboardEvent) => void; up: (e: KeyboardEvent) => void }

  constructor() {
    this.handlers = {
      down: (e) => this.onKeyDown(e),
      up:   (e) => this.onKeyUp(e),
    }
  }

  get input(): Readonly<RawInput> {
    return this._input
  }

  mount(): void {
    window.addEventListener('keydown', this.handlers.down)
    window.addEventListener('keyup',   this.handlers.up)
  }

  unmount(): void {
    window.removeEventListener('keydown', this.handlers.down)
    window.removeEventListener('keyup',   this.handlers.up)
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.updateKey(e.code, true)
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.updateKey(e.code, false)
  }

  private updateKey(code: string, pressed: boolean): void {
    switch (code) {
      case 'KeyW': case 'ArrowUp':    this._input = { ...this._input, forward:  pressed }; break
      case 'KeyS': case 'ArrowDown':  this._input = { ...this._input, backward: pressed }; break
      case 'KeyA': case 'ArrowLeft':  this._input = { ...this._input, left:     pressed }; break
      case 'KeyD': case 'ArrowRight': this._input = { ...this._input, right:    pressed }; break
    }
  }
}

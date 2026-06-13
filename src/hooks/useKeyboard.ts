import { useCallback, useEffect, useRef } from 'react'

export interface UseKeyboardOptions {
  onKeyDown?: (code: string, event: KeyboardEvent) => void
  onKeyUp?: (code: string, event: KeyboardEvent) => void
  target?: EventTarget | null
}

export interface UseKeyboardReturn {
  isKeyPressed: (code: string) => boolean
  pressedKeys: () => ReadonlySet<string>
}

export function useKeyboard(options: UseKeyboardOptions = {}): UseKeyboardReturn {
  const pressedRef   = useRef<Set<string>>(new Set())
  const onKeyDownRef = useRef(options.onKeyDown)
  const onKeyUpRef   = useRef(options.onKeyUp)

  // Keep callback refs current without re-attaching listeners
  useEffect(() => { onKeyDownRef.current = options.onKeyDown }, [options.onKeyDown])
  useEffect(() => { onKeyUpRef.current   = options.onKeyUp   }, [options.onKeyUp])

  useEffect(() => {
    const target = options.target !== undefined ? options.target : window
    if (target === null) return

    const handleDown = (e: Event) => {
      const ke = e as KeyboardEvent
      pressedRef.current.add(ke.code)
      onKeyDownRef.current?.(ke.code, ke)
    }

    const handleUp = (e: Event) => {
      const ke = e as KeyboardEvent
      pressedRef.current.delete(ke.code)
      onKeyUpRef.current?.(ke.code, ke)
    }

    target.addEventListener('keydown', handleDown)
    target.addEventListener('keyup',   handleUp)

    return () => {
      target.removeEventListener('keydown', handleDown)
      target.removeEventListener('keyup',   handleUp)
      pressedRef.current.clear()
    }
  }, [options.target])

  const isKeyPressed = useCallback((code: string) => pressedRef.current.has(code), [])
  const pressedKeys  = useCallback((): ReadonlySet<string> => pressedRef.current, [])

  return { isKeyPressed, pressedKeys }
}

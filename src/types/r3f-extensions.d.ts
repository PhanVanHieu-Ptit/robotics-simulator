// Module augmentation for @react-three/fiber — must be a MODULE (has export {})
// so that `declare module` is additive rather than ambient (replacing).
export {}

declare module '@react-three/fiber' {
  interface ThreeElements {
    line: import('@react-three/fiber').Object3DNode<
      import('three').Line,
      typeof import('three').Line
    >
  }
}

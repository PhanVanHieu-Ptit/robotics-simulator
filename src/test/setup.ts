import '@testing-library/jest-dom'

// Minimal WebGL mock so Three.js doesn't throw in jsdom
class MockWebGLRenderingContext {}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: (type: string) => {
    if (type === 'webgl' || type === 'webgl2') {
      return new MockWebGLRenderingContext()
    }
    return null
  },
})

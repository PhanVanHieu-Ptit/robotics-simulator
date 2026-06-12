/// <reference types="vite/client" />

// Allow JSON config imports
declare module '*.json' {
  const value: unknown
  export default value
}

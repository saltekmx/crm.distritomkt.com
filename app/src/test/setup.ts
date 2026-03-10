// Global test setup for vitest + jsdom
import '@testing-library/jest-dom/vitest'

// Stub localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    for (const key of Object.keys(store)) delete store[key]
  },
  get length() {
    return Object.keys(store).length
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Stub crypto.randomUUID
if (!globalThis.crypto?.randomUUID) {
  let counter = 0
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `test-uuid-${++counter}`,
    },
  })
}

// Stub import.meta.env
if (!(globalThis as any).import) {
  ;(globalThis as any).import = { meta: { env: {} } }
}

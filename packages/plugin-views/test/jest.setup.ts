// Jest setup file for the plugin-views package. This file is executed before running the tests, allowing us to set up any necessary mocks or configurations.

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

(
  global as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }
).ResizeObserver = ResizeObserverMock;

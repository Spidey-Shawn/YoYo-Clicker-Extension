// Jest setup file
require('@testing-library/jest-dom');

// Mock chrome API for browser extension testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`)
  }
};

// Mock window.visualViewport with addEventListener
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    scale: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

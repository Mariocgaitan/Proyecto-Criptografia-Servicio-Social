// frontend/src/__tests__/setup.js
import "@testing-library/jest-dom";

// Mock import.meta.env
if (!import.meta.env.VITE_API_BASE_URL) {
  import.meta.env.VITE_API_BASE_URL = "";
}

// Global fetch mock (tests override per-case)
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  })
);

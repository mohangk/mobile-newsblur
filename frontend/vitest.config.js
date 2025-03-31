import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Use jsdom for DOM simulation
    globals: true, // Make Vitest globals available without importing
    setupFiles: ['./js/vitest.setup.js'] // Specify setup file relative to config
  },
});

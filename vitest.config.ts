import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Keeps Vitest pointed at gearup-api/tsconfig.json instead of the Expo
  // workspace tsconfig in the repository root.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});

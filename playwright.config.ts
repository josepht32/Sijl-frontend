import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = mkdtempSync(path.join(tmpdir(), 'sijil-pw-'));
const backendDir = path.join(frontendDir, '..', 'backend');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx nest start',
      cwd: backendDir,
      url: 'http://127.0.0.1:3100/api/health',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ...process.env,
        PORT: '3100',
        SKIP_DEMO_SEED: 'true',
        DATABASE_PATH: path.join(dataDir, 'cases.sqlite'),
        UPLOADS_DIR: path.join(dataDir, 'uploads'),
        JWT_SECRET: 'e2e-secret',
      },
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort',
      cwd: frontendDir,
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        API_PROXY: 'http://127.0.0.1:3100',
      },
    },
  ],
});

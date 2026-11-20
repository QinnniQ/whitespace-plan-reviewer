import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const python = process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python';
const baseURL = 'http://127.0.0.1:18743';
export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL, viewport: { width: 1360, height: 900 } },
  webServer: {
    command: `"${resolve(python)}" -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 18743`,
    url: baseURL + '/api/plans',
    timeout: 30000,
  },
});

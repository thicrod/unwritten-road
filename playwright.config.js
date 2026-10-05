// End-to-end tests: the real server in mock-DM mode, driven by a real browser.
// Locally you can point at an installed Chromium with PW_CHROMIUM=/path/to/chrome.
import { defineConfig } from "@playwright/test";
const PORT = 4173;
export default defineConfig({
  testDir: "tests/e2e", timeout: 120000, fullyParallel: false, workers: 1, reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 860 },
    launchOptions: { args: ["--no-sandbox"], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) } },
  webServer: { command: "node tools/build.js && node server/index.js", url: `http://localhost:${PORT}/api/health`, reuseExistingServer: false, timeout: 60000,
    env: { MOCK_DM: "1", PORT: String(PORT), HOST_GRACE_MS: "2500", ADMIN_KEY: "test-admin" } },
});

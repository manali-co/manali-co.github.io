import { defineConfig, devices } from "@playwright/test";

/* End-to-end tests for the What Should We Watch link pages (wsww.app/f/<token>). They run against
   a production build (`npm run build` first) served by `next start`, with the app's API replaced
   by e2e/mock-api.mjs: the page calls the API from the server, where the browser can't intercept.
   Ports stay clear of the ones local development uses (3000, 3107, 7071, 8081). */
const PORT = Number(process.env.E2E_PORT || 3117);
const MOCK_PORT = Number(process.env.MOCK_API_PORT || 7199);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the mock API keeps one request log; tests reset and read it in turn
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 },
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/__log`,
      env: { MOCK_API_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}/robots.txt`,
      env: { WSWW_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`, NEXT_PUBLIC_SITE_URL: "https://manali.page" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

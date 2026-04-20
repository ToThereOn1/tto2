import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from default ".env.local" file.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // We need serial execution for the 6-week time travel
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Force 1 worker to ensure serial API calls
    reporter: 'html',
    timeout: 120000, // 2 minutes per test to allow for slow LLM generations
    expect: {
        timeout: 30000,
    },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true, // Always reuse if dev server is already running
        timeout: 300 * 1000, // 5 minutes — allows for cold .next cache rebuild
    },
});

import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 90000,
    env: {
      e2eEmail: process.env.CYPRESS_E2E_EMAIL,
      e2ePassword: process.env.CYPRESS_E2E_PASSWORD,
    },
  },
})

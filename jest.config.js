/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testTimeout: 30000,
    forceExit: true,
    clearMocks: true,
    verbose: true,
};

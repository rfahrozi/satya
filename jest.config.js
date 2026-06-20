/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    testTimeout: 30000,
    forceExit: true,
    clearMocks: true,
    verbose: true,
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/src/config/redis\\.js$',
        '/src/config/minio\\.js$',
        '/src/emailWorker\\.js$',
        '/src/worker-app\\.js$',
        '/src/scheduler\\.js$',
        '/src/debug-env\\.js$',
        '/src/test-email\\.js$',
    ],
};

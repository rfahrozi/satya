module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setupMocks.js'],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/app.js',
    '!src/worker-app.js',
    '!src/test-email.js',
    '!src/debug-env.js',
    '!src/emailWorker.js',
    '!src/scheduler.js'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/frontend/']
};

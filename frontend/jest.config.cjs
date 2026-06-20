module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.(test|spec).(js|jsx)'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)'
  ],
  collectCoverageFrom: [
    'src/pages/Dashboard.jsx',
    'src/pages/SatkerPortal.jsx',
    'src/lib/axios.js',
    'src/hooks/useFocusTrap.js',
    'src/components/ConfirmDialog.jsx',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};

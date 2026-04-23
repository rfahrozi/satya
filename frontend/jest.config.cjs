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
};

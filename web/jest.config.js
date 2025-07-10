module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(test|spec).[jt]s?(x)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { configFile: './.babelrc.jest' }
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react|@mantine|@tabler|@tanstack|next)/)'
  ],
};

export default {
  displayName: 'ngrx-openapi-gen',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/ngrx-openapi-gen',
  transformIgnorePatterns: [
    'node_modules/(?!(change-case)/)',
  ],
};

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.integration.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  testTimeout: 60000,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@get-down/shared$": "<rootDir>/../../packages/shared/dist/index.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          paths: {},
          rootDir: ".",
        },
      },
    ],
  },
};

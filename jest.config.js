module.exports = {
    "roots": [
        "src",
        "tests",
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(test_.*)|(test_.*\\.ts)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx"
    ],
    "moduleDirectories": ["node_modules", "."],
    "testEnvironment": "jsdom",
    // The port should be the same as the one that the Django Docker container exposes.
    "testURL": "http://localhost:9000",

    collectCoverage: true,
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};

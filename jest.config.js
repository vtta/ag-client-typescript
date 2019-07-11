module.exports = {
    "roots": [
        "<rootDir>/src",
        "<rootDir>/tests",
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testMatch": ["**/test_*.ts", "test_*.ts"],
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx"
    ],
    "moduleDirectories": ["node_modules", "."],
    "testEnvironment": "jsdom",
    // The port should be the same as the one that the Django Docker container exposes.
    // IMPORTANT: The http client test script servers must listen on this port too!!
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

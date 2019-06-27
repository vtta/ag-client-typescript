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
    "testURL": "http://localhost:9000",

    collectCoverage: true,
    collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
    coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/src/http_client.ts"],
    coverageThreshold: {
        global: {
            branches: 95,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};

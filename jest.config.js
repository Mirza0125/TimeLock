// jest.config.js
//
// jest-expo preset (Jest 29, paired via `npx expo install jest-expo jest`).
// Ignores generated native trees and planning docs so Jest never tries to
// collect test files from android/, ios/, .planning/, or a local module's
// generated android/ subtree.
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.planning/',
    '/modules/[^/]+/android/',
  ],
};

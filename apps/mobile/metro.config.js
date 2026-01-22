const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Handle Bun's nested .bun directory structure
config.resolver.unstable_enablePackageExports = true;

// 4. Ensure shared package is resolved correctly
config.resolver.extraNodeModules = {
  "@voicefit/shared": path.resolve(monorepoRoot, "packages/shared"),
};

module.exports = withNativeWind(config, { input: "./global.css" });

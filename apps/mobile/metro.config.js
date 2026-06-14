// Metro-Konfiguration für npm-workspaces-Monorepo (Expo-Doku: "Working with monorepos").
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Metro soll das gesamte Monorepo beobachten (für packages/shared).
config.watchFolders = [workspaceRoot];

// Module aus App- und Root-node_modules auflösen (npm-Hoisting).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

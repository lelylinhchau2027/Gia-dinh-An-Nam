const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite uses a WebAssembly worker when the same app is previewed on web.
config.resolver.assetExts.push('wasm');

module.exports = config;

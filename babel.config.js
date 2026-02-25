const nativewindPreset = require('nativewind/babel');

module.exports = function (api) {
  api.cache(true);

  // `nativewind/babel` is a preset that includes Reanimated by default.
  // We remove it here so we can ensure Reanimated runs last (per its docs).
  function nativewindWithoutReanimatedPreset(...args) {
    const presetConfig = nativewindPreset(...args) ?? {};
    const presetPlugins = Array.isArray(presetConfig.plugins) ? presetConfig.plugins : [];

    return {
      ...presetConfig,
      plugins: presetPlugins.filter((p) => p !== 'react-native-reanimated/plugin'),
    };
  }

  const plugins = ['react-native-reanimated/plugin'];

  // Strip console.log/warn/debug/info in production builds.
  // console.error is intentionally kept so real errors are still reported.
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      { exclude: ['error'] },
    ]);
  }

  return {
    presets: ['babel-preset-expo', nativewindWithoutReanimatedPreset],
    plugins,
  };
}; 
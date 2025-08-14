module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily disable NativeWind to isolate babel plugin issues
      // 'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
}; 
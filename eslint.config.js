// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { files: ['scripts/**/*.js', 'tests/**/*.cjs'], languageOptions: { globals: { process: 'readonly', __dirname: 'readonly', Buffer: 'readonly', module: 'readonly', require: 'readonly' } } },
  {
    ignores: ['dist/**', '.tamagui/**', 'supabase/**', 'mealscanner-video/**', 'ios/**', 'android/**'],
  },
]);

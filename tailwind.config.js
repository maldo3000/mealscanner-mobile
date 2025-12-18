/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Helvetica Neue', 'Helvetica', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'sans-serif'],
        'helvetica': ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        primaryGreen: '#10B981',
        primaryGreenDark: '#059669',
        bgLight: '#F6F7FB',
        bgSoft: '#ECFDF5',
        textMain: '#0F172A',
        textMuted: '#64748B',
        accentYellow: '#FACC15',
        accentCoral: '#FB7185',
        accentSky: '#38BDF8',
        accentLavender: '#A855F7',
      },
    },
  },
  plugins: [],
};


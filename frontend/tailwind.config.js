/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./*.html",        // Looks for classes in index.html (in frontend/)
      "./js/**/*.js",    // Looks for classes in JS files within frontend/js/
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
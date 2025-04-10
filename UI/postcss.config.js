module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {}, // Minifies your CSS for production
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ], 
  },
};

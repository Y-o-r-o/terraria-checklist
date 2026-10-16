const CopyWebpackPlugin = require('copy-webpack-plugin')
const crypto = require('crypto')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/index.tsx',
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData: '@import "src/style/theme.scss";',
            },
          },
        ],
      },
      {
        test: /\.(js|jsx|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: './src/image/icon/favicon.png',
      template: './src/index.html',
    }),
    new webpack.DefinePlugin({
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
      // Changes the gear data URL whenever its content changes, so browsers don't use a stale cache
      __GEAR_VERSION__: JSON.stringify(
        crypto
          .createHash('md5')
          .update(fs.readFileSync('./src/data/gear.json'))
          .digest('hex')
          .slice(0, 8),
      ),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/image', to: 'image' },
        { from: 'src/data', to: 'data' },
      ],
    }),
  ],
  output: {
    filename: 'main.[contenthash:8].js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'image/icon/[name][ext][query]',
  },
}

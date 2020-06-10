const path = require('path')
const HTMLWebpackPlugin = require('html-webpack-plugin')

const projectRoot = path.resolve(__dirname, '../')

module.exports = {
  mode: 'development',
  devtool: 'eval-source-map',
  entry: {
    main: path.resolve(projectRoot, 'example/main.js')
  },
  output: {
    path: path.resolve(projectRoot, 'example/dist'),
    /* lazy loading时此选项对应输入目录的公开URL，默认为根目录 */
    publicPath: '/public/',
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        include: [__dirname, path.join(projectRoot, 'src')]
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              /* https://www.webpackjs.com/loaders/css-loader/#importloaders */
              importLoaders: 1
            }
          },
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'img',
              publicPath: '/public/img'
            }
          }
        ]
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'font',
              publicPath: '/public/font'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HTMLWebpackPlugin({
      filename: 'index.html',
      template: path.join(__dirname, 'index.html'),
      favicon: path.join(__dirname, 'favicon.ico'),
      inject: true,
    })
  ],
  watch: true,
  watchOptions: {
    /* 将多个更改聚合到单个重构建(rebuild) */
    aggregateTimeout: 500,
    ignored: path.resolve(__dirname, '..', 'node_modules')
  }
}

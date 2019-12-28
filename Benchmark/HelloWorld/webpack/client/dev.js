const { join } = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');

const common = require('./common');

module.exports = merge(common, {
    mode: 'development',
    entry: [
        'webpack-hot-middleware/client',
        join(__dirname, '../../src/client/index'),
    ],
    devtool: 'cheap-eval-module-source-map',
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
    ],
});

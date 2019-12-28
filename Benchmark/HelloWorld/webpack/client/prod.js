const { join } = require('path');
const merge = require('webpack-merge');
const StatsWebpackPlugin = require('stats-webpack-plugin');

const common = require('./common');

module.exports = merge(common, {
    mode: 'production',
    entry: [
        join(__dirname, '../../src/client/index'),
    ],
    devtool: 'source-map',
    plugins: [
        new StatsWebpackPlugin('stats.json'),
    ],
});

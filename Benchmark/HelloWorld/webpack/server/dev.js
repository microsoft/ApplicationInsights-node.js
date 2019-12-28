const merge = require('webpack-merge');

const common = require('./common');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'cheap-eval-module-source-map',
});

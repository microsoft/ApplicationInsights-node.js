const merge = require('webpack-merge');

const common = require('./common');

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
});

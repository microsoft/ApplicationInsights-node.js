const merge = require('webpack-merge');
const common = require('../common');
const ExtractCssChunksPlugin = require('extract-css-chunks-webpack-plugin');

module.exports = merge(common, {
    name: 'client',
    target: 'web',
    output: {
        filename: 'app.client.js',
        chunkFilename: '[name].chunk.js',
    },
    module: {
        rules: [
            {
                test: /\.styl$/,
                exclude: /node_modules/,
                use: [
                    ExtractCssChunksPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            localIdentName: '[name]__[local]--[hash:base64:5]'
                        },
                    },
                    'postcss-loader',
                    'stylus-loader',
                ],
            },
        ],
    },
    optimization: {
        runtimeChunk: {
            name: 'bootstrap',
        },
        splitChunks: {
            chunks: 'initial',
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                },
            },
        },
    },
    plugins: [
        new ExtractCssChunksPlugin(),
    ],
});

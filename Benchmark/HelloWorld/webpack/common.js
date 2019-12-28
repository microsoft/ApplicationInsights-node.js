const { join } = require('path');
const WebpackBar = require('webpackbar');

module.exports = {
    output: {
        path: join(__dirname, '../public/assets'),
        publicPath: '/',
    },
    resolve: {
        extensions: ['.js'],
        modules: [
            join(__dirname, '../node_modules'),
            join(__dirname, '../src')
        ],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: 'babel-loader'
            },
        ],
    },
    plugins: [
        new WebpackBar(),
    ],
};

import express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { log } from 'winston';

/**
 * Configures hot reloading and assets paths for local development environment.
 * Use the `npm start` command to start the local development server.
 *
 * @param app Express app
 */
const configureDevelopment = (app) => {
    const clientConfig = require('../webpack/client/dev');
    const serverConfig = require('../webpack/server/dev');
    const { publicPath, path } = clientConfig.output;

    const multiCompiler = require('webpack')([clientConfig, serverConfig]);
    const clientCompiler = multiCompiler.compilers[0];

    app.use(require('webpack-dev-middleware')(multiCompiler, { publicPath }));
    app.use(require('webpack-hot-middleware')(clientCompiler));

    app.use(publicPath, express.static(path));

    app.use(require('webpack-hot-server-middleware')(multiCompiler, {
        serverRendererOptions: { outputPath: path },
    }));
};

/**
 * Configures assets paths for production environment.
 * This environment is used in deployment and inside the docker container.
 * Use the `npm run build` command to create a production build.
 *
 * @param app Express app
 */
const configureProduction = (app) => {
    const clientStats = require('./assets/stats.json');
    const serverRender = require('./assets/app.server.js').default;
    const publicPath = '/';
    const outputPath = join(__dirname, 'assets');

    app.use(publicPath, express.static(outputPath));
    app.use(serverRender({
        clientStats,
        outputPath,
    }));
};

const app = express();

const isDevelopment = process.env.NODE_ENV === 'development';

log('info', `Configuring server for environment: ${process.env.NODE_ENV}...`);
app.use(helmet());
app.set('port', process.env.PORT || 3000);

if (isDevelopment) {
    configureDevelopment(app);
} else {
    configureProduction(app);
}

app.listen(app.get('port'), () => log('info', `Server listening on port ${app.get('port')}...`));

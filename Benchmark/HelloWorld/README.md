> Cloned from [template-react-ssr](https://github.com/rherwig/template-react-ssr).

# React SSR Template
This project provides a template for React 16 (Fiber) using server
side rendering.

*Important:* The master branch is only supposed to contain the bare-bone template.
There are different branches containing more advanced features, like streaming and
more to come in the future. Those are documented in the Branches section.

*The template has been renamed to `template-react-ssr` since it will upgrade to newer versions of React, as soon
as they are stable.*

## Table of contents

* [Features](#features)
* [Branches](#branches)
    * [Streaming](#streaming-(feature/streaming))
    * [React Router](#react-router-integration-(feature/react-router))
    * [Express Routing](#express-routing-/-api-(feature/express-routing))
    * [Redux](#redux-(feature/redux))
* [Development](#development)
* [Building for production](#building-for-production)
* [Debugging](#debugging)
    * [VSCode](#vscode)
* [Changelog](#changelog)
* [Planned features](#planned-features)
* [License](#license)
* [Contributing](#contributing)

## Features
* Universal rendering using ExpressJS and EJS
* Hot reloading of styles and scripts
* ESNext ready
* powered by webpack

## Branches
The following, more advanced, features are pushed to dedicated branches.
Either checkout a specific branch or fork the repository and merge the branches to
get the features you need. You might as well just use them as a resource to learn, how
the specific technologies are implemented.

### Streaming (feature/streaming)
Since React 16, we have the possibility to render to a node stream. This improves the time to first byte (TTBF),
since the browser can display the app in an iterative manner. The dedicated branch provides the basic streaming
implementation.

### React-Router Integration (feature/react-router)
For a template using [react-router](https://github.com/ReactTraining/react-router) you can make use of this branch.
It features routing on client and server side as well as basic routes.

Thanks to [@crabbits](https://github.com/crabbits) for contributing this example.

### Express Routing / API (feature/express-routing)
This example shows how to configure routing ExpressJS. This can be used to create
an API to work alongside your frontend application.

### Redux (feature/redux)
This example shows how to integrate [redux](https://redux.js.org) along with server-side rendering
as well as hot-reloading. It features a simple store with preloaded state
from the server as well as state hydration on the client.

## Development
To start development, follow these steps:

```
$ git clone https://github.com/rherwig/template-react-ssr.git
$ cd template-react-ssr
$ npm i
$ npm start
```

This fires up the development server on port `3000`.

You can now choose to either start developing your react application or
to enhance the express server according to your needs.

The react app's entry point is `src/shared/App.js` and the express
server is started from `src/index.js`.

For more information on how the specific parts of the application work,
please refer to the documentation in the code.

## Testing
The general testing engine used by this project consists of jest and react-test-renderer.
You can run the tests by using the following command:
```
$ npm test
```

## Linting
To run eslint, execute the following command:
```
$ npm run lint
```

**Please note:** Linting is only available via this command and not integrated
via webpack. This is done on purpose, as eslint is somewhat biased on the preference
of the creator of the config.

## Building for Production
In order to build for production and run the finished project, execute
the following:

```
$ npm run build
$ node public/index
```

This bundles and optimizes your app and runs it from the `public/`
directory.

## Debugging
This section explains how to debug server and client side of the app in
various IDEs.

### VSCode
In order to debug with VSCode, you want to create a debug configuration.
This is configured via the `launch.json` file located inside the `.vscode`
directory of your project.

Use the following `launch.json` for debugging:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug",
            "program": "${workspaceFolder}/src/index.js",
            "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/babel-node",
            "runtimeArgs": ["--nolazy"],
            "env": {
                "NODE_ENV": "development"
            }
        }
    ]
}
```

After setting up the configuration, start debugging by either selecting
`Debug > Start Debugging` in the main menu bar or by pressing `F5` on your
keyboard.

## Changelog
For a detailed changelog, please refer to the [CHANGELOG.md](CHANGELOG.md).

## Planned features
The following features are planned for future upgrades of the template.
If there are any request, feel free to open an issue or a pull request.

- [ ] Provide service worker template branch
- [ ] Provide fully features PWA example in a separate repository
- [ ] Extend this list ;-)

## License
MIT

## Contributing
If there are any ideas or optimizations to improve this template,
feel free to submit a pull request including your documented changes.

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2019-04-12
### Added
* Changelog as a seperate file, based on [keepachangelog](https://keepachangelog.com/de/1.0.0/)

### Changed
* Update all packages to their latest version
* Update babel to include polyfills based on usage
* Restructure webpack configuration files to remove redundant code

### Removed
* Removed `shrink-ray` library, due to it needing node-gyp which caused
many problems interfering with the ease-of-use of this template

## [3.0.0] - 2018-09-28
### Added
* Introduces PostCSS to enable autoprefixer, since support of older browser (looking at you IE) is still important.
* Implement eslint and basic configuration.
* Implements basic test engine using jest.

### Changed
* Switched from EJS for templating to basic HTML using template string interpolation.
This change allows for much more flexibility, i.e. with [react-helmet](https://github.com/nfl/react-helmet)
and dynamically requiring content, such as styles.
* Improves production build by executing steps in parallel.

## [2.5.0] - 2018-09-16
### Changed
* Switched to babel 7
* Switched to nodemon for watch mode

## [2.4.0] - 2018-06-07
### Added
* CSS chunking is back, thanks to the now webpack 4 compliant version of [extract-css-chunks-webpack-plugin](https://github.com/faceyspacey/extract-css-chunks-webpack-plugin)
  * Special thanks to [@zackljackson](https://github.com/zackljackson) for making this possible

## [2.3.0] - 2018-05-31
### Added
* Implements server-side compression via [shrink-ray](https://github.com/aickin/shrink-ray)
  * Compression is only enabled in production mode
  * Thanks to [@zackljackson](https://github.com/zackljackson) for the hint on shrink-ray
* Implements [helmet](https://github.com/helmetjs/helmet) for security-relevant response headers

## [2.2.1] - 2018-05-26
### Changed
* Exclude the node_modules directory from babel-transpilation to avoid errors when using other libraries like material-ui

## [2.2.0] - 2018-05-17
### Added
* Implements code-splitting via [react-universal-component](https://github.com/faceyspacey/react-universal-component)
as well as an example for using it.
* Implements configuration for [babel-preset-env](https://babeljs.io/docs/plugins/preset-env) to make actual use of the preset

### Changed
* Replaces [stage-0](https://babeljs.io/docs/plugins/preset-stage-0/) with [stage-2](https://babeljs.io/docs/plugins/preset-stage-2/) babel-plugin
due to it being a more advanced and stable spec

### Removed
* Removes `cssHash` from the application, since the [extract-css-chunks-webpack-plugin](https://github.com/faceyspacey/extract-css-chunks-webpack-plugin)
is no longer implemented since version 2.0.0 of this template
  * There are plans to switch to [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin),
  but since it does not yet support HMR, I am gonna wait on that a little

Thanks to [@arkhamRejek](https://github.com/arkhamRejek) for contributing the code-splitting feature 
as well as the babel-preset changes!

## [2.1.0] - 2018-05-02
### Added
* Implements [react-helmet](https://github.com/nfl/react-helmet) to provide improved handling for document meta information

## [2.0.0] - 2018-04-17
### Changed
* Upgraded to webpack 4
* Upgraded to React 16.3

### Removed
* Removed extract-css-chunks plugin in favor of extract-text-webpack-plugin,
since the former is not supported with webpack 4 anymore
* Removes extract plugins for styles in development, to improve hot-reloading 


[Unreleased]: https://github.com/rherwig/template-react-ssr/compare/3.1.0...HEAD
[3.1.0]: https://github.com/rherwig/template-react-ssr/compare/3.0.0...3.1.0
[3.0.0]: https://github.com/rherwig/template-react-ssr/compare/2.5.0...3.0.0
[2.5.0]: https://github.com/rherwig/template-react-ssr/compare/2.4.0...2.5.0
[2.4.0]: https://github.com/rherwig/template-react-ssr/compare/2.3.0...2.4.0
[2.3.0]: https://github.com/rherwig/template-react-ssr/compare/2.2.0...2.3.0
[2.2.1]: https://github.com/rherwig/template-react-ssr/compare/2.2.0...2.2.1
[2.2.0]: https://github.com/rherwig/template-react-ssr/compare/2.1.0...2.2.0
[2.1.0]: https://github.com/rherwig/template-react-ssr/compare/2.0.0...2.1.0
[2.0.0]: https://github.com/rherwig/template-react-ssr/compare/1.0.0...2.0.0

@echo off

:: Note: this is not possible from an msbuild Exec task because of the way environment variables are handled
set /p package-version=<package-version
npm install %package-version%

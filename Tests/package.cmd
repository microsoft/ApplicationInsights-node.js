@echo off

:: Note: this is not possible from an msbuild Exec task because of the way environment variables are handled
set /p package=<temp.txt
npm install %package%

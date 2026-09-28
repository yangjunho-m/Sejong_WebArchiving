@echo off
cd /d "%~dp0"
echo.
echo Starting local server...
echo Open: http://localhost:8080/
start "" /b py -m http.server 8080
timeout /t 2 /nobreak > nul
start "" http://localhost:8080/
echo.
echo The site is running at http://localhost:8080/
echo Keep this window open while you use the site.
pause

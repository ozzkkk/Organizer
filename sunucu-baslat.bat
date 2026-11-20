@echo off
REM Pazarkule KIBA - yerel test sunucusu (Windows)
REM Bu dosyaya cift tiklayin, ardindan tarayicidan http://localhost:8000 adresini acin.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    python -m http.server 8000
) else (
    echo Python bulunamadi. Python 3 kurun veya dosyalari GitHub Pages uzerinden acin.
    pause
)

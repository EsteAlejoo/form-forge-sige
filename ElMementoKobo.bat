@echo off
chcp 65001 >nul
title ElMemento Kobo
cd /d "%~dp0"
set PORT=5173
set URL=http://127.0.0.1:%PORT%/

rem 1) Si el servidor ya esta encendido, solo abrir la app.
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if %errorlevel%==0 goto abrir

rem 2) Encender el servidor en una ventana minimizada (no cerrarla mientras uses la app).
echo Encendiendo ElMemento Kobo...
start "ElMemento Kobo (servidor, no cerrar)" /min cmd /c "cd /d %~dp0 && corepack pnpm dev --host 127.0.0.1 --port %PORT% --strictPort"

rem 3) Esperar hasta 90 segundos a que el servidor responda.
set /a intentos=0
:esperar
curl -s -o nul http://127.0.0.1:%PORT%/
if %errorlevel%==0 goto calentar
set /a intentos+=1
if %intentos% GEQ 90 (
  echo El servidor no respondio. Cierra esta ventana e intenta de nuevo.
  pause
  exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto esperar

:calentar
rem 4) Precalentar: la primera vez tarda 1-2 minutos; asi el navegador no queda en blanco.
echo Preparando la aplicacion (la primera vez puede tardar 1 a 2 minutos, no cierres esta ventana)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ElMementoKobo-calentar.ps1" -Base "http://127.0.0.1:%PORT%"

:abrir
start "" "%URL%"
exit /b 0

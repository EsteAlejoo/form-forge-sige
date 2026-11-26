@echo off
chcp 65001 >nul
set PORT=5173
set /a cerrados=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
  set /a cerrados+=1
)
if %cerrados%==0 (echo ElMemento Kobo no estaba encendido.) else (echo ElMemento Kobo detenido.)
timeout /t 2 >nul

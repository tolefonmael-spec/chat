@echo off
title Chat Platform - Serveur
color 0A

echo.
echo ╔════════════════════════════════════════╗
echo ║       CHAT PLATFORM - DEMARRAGE       ║
echo ╚════════════════════════════════════════╝
echo.

REM Vérifier Node.js
echo [1/4] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installe !
    echo.
    echo Telechargez Node.js sur: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js installe
echo.

REM Vérifier les dépendances
echo [2/4] Verification des dependances...
if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation
        pause
        exit /b 1
    )
)
echo ✓ Dependances OK
echo.

REM Libérer le port 3000
echo [3/4] Liberation du port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo ✓ Port 3000 disponible
echo.

REM Créer le dossier data
if not exist "data" mkdir data

REM Démarrer le serveur
echo [4/4] Demarrage du serveur...
echo.
echo ════════════════════════════════════════
echo.

REM Ouvrir le navigateur après 2 secondes
start /min cmd /c "timeout /t 2 >nul & start http://localhost:3000"

REM Démarrer le serveur
npm start

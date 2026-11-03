@echo off
title Conector Local WhatsApp - Loja de Eletronicos
cd /d "%~dp0"
if not exist "node_modules" (
  echo Instalando dependencias do conector WhatsApp pela primeira vez...
  call npm install
)
echo Iniciando Conector Local em http://localhost:3001 ...
node server.mjs
pause

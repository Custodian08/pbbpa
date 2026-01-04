@echo off
setlocal EnableExtensions

REM Запуск сервера и клиента в отдельных окнах CMD.
REM Запускать из корня репозитория (двойной клик или через CMD).

set "ROOT=%~dp0"

REM --- Сервер (порт 3000) ---
start "PBBPA Server" cmd /k "cd /d ^\"%ROOT%server^\" && npm install && npx prisma migrate deploy && npx prisma generate && npm run start:dev"

REM --- Клиент (порт 5173) ---
start "PBBPA Client" cmd /k "cd /d ^\"%ROOT%client^\" && npm install && npm run dev"

echo Открыты два окна: сервер и клиент. Закройте их, чтобы остановить процессы.
exit /b 0

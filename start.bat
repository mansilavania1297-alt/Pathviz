@echo off
echo Starting Pathviz...

echo Starting Backend...
start cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --reload"

timeout /t 3 /nobreak

echo Starting Frontend...
start cmd /k "cd /d %~dp0frontend && npm start"

timeout /t 5 /nobreak

echo Opening Pathviz in browser...
start http://localhost:3000

echo Pathviz is running.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
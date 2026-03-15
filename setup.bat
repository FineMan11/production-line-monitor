@echo off
echo ================================================
echo  Production Monitor - First Time Setup
echo ================================================
echo.

echo Installing Python packages...
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To start the server, run:  python app.py
echo Then open browser at:      http://localhost:5000
echo.
pause

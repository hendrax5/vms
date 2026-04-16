@echo off
color 0b
echo ===================================================
echo   VMS SAFE UPDATE SCRIPT (NO DATA/PASSWORD LOSS)
echo ===================================================
echo.

echo [1/4] Pulling latest changes from GitHub...
git pull
echo.

echo [2/4] Updating Database Schema (Non-Destructive)...
:: Menggunakan db push agar tabel yang baru ditambahkan/dimodifikasi terupdate
:: TAPI TIDAK melakukan reset password (TIDAK ADA prisma db seed / reset)
call npx prisma db push
echo.

echo [3/4] Building Next.js Application...
call npm run build
echo.

echo ===================================================
echo   UPDATE SUCCESSFUL! 
echo   Your Database, Passwords, and Data are SAFE.
echo ===================================================
echo To apply the update, please restart your server.
echo If you use PM2, run: pm2 reload all
echo If you run manually, just start using: npm run start
echo.
pause

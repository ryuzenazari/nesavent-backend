@echo off
echo =======================================
echo NesaVent - Menjalankan Semua Pengujian
echo =======================================

echo.
echo [1/4] Menjalankan pengujian tipe tiket...
call npm run test:tickets
echo.

echo [2/4] Menjalankan pengujian manajemen tiket...
call npm run test:ticket-management
echo.

echo [3/4] Menjalankan pengujian komprehensif...
call npm run test:comprehensive
echo.

echo [4/4] Menjalankan pengujian API...
call npm run test:api
echo.

echo =======================================
echo Semua pengujian telah selesai dijalankan
echo =======================================
pause 
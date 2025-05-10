#!/bin/bash

# CATATAN: Untuk menggunakan script ini di Linux/macOS:
# 1. Pastikan file memiliki izin eksekusi: chmod +x run-tests.sh
# 2. Jalankan dengan: ./run-tests.sh

echo "======================================="
echo "NesaVent - Menjalankan Semua Pengujian"
echo "======================================="

echo
echo "[1/4] Menjalankan pengujian tipe tiket..."
npm run test:tickets
echo

echo "[2/4] Menjalankan pengujian manajemen tiket..."
npm run test:ticket-management
echo

echo "[3/4] Menjalankan pengujian komprehensif..."
npm run test:comprehensive
echo

echo "[4/4] Menjalankan pengujian API..."
npm run test:api
echo

echo "======================================="
echo "Semua pengujian telah selesai dijalankan"
echo "=======================================" 
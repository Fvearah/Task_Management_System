# Task Management System - Backend API

RESTful API menggunakan Golang, Gin, dan MySQL (Raw SQL). Project untuk tugas Praktik Kerja Lapangan (PKL).

# Teknologi
* **Bahasa :** Golang
* **Framework :** Gin HTTP Framework
* **Database :** MySQL (via `database/sql` & `go-sql-driver/mysql`)
* **Autentikasi :** JWT & bcrypt

# Prasyarat
* Go 1.20+
* MySQL (XAMPP / Laragon)
* Git
* Postman (Untuk pengujian API)

# Cara Menjalankan Server
1. Clone repository ini.
2. Buat database `task_management` di MySQL dan jalankan script SQL di folder `migrations/`.
3. Salin file `.env.example` menjadi `.env` dan sesuaikan kredensial database Anda.
4. Unduh dependensi:
   ```bash
   go mod tidy

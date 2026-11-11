package config

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

func ConnectDB() *sql.DB {
	// Sesuaikan username (root) dan password sesuai konfigurasi Laragon/XAMPP
	dsn := "root:@tcp(127.0.0.1:3306)/task_management?parseTime=true"
	
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Gagal membuka koneksi database: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Gagal terhubung ke MySQL: %v", err)
	}

	// Konfigurasi connection pool sesuai best practice
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Koneksi MySQL berhasil!")
	return db
}
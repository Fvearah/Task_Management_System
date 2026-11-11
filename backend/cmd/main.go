package main

import (
	"log"
	"task-management/config"
	"task-management/routes"
)

func main() {
	db := config.ConnectDB()
	defer db.Close()

	router := routes.SetupRouter(db)

	log.Println("Server berjalan di http://localhost:8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}

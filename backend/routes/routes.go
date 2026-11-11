package routes

import (
	"database/sql"
	"net/http"
	"task-management/internal/handler"
	"task-management/internal/middleware"
	"task-management/internal/repository"
	"task-management/internal/service"

	"github.com/gin-gonic/gin"
)

// corsMiddleware mengizinkan frontend (Vite dev server) memanggil API dari origin berbeda.
// Tanpa ini, browser memblokir request dari localhost:5173 ke localhost:8080.
func corsMiddleware() gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		"http://localhost:5173": true,
		"http://127.0.0.1:5173": true,
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}

		// Preflight: browser mengirim OPTIONS sebelum POST/PUT/DELETE dengan header Authorization.
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func SetupRouter(db *sql.DB) *gin.Engine {
	router := gin.Default()
	router.Use(corsMiddleware())

	// Setup Auth Dependency
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo)
	authHandler := handler.NewAuthHandler(authService)

	// Setup Task Dependency
	taskRepo := repository.NewTaskRepository(db)
	taskService := service.NewTaskService(taskRepo)
	taskHandler := handler.NewTaskHandler(taskService)

	// Setup Category Dependency
	categoryRepo := repository.NewCategoryRepository(db)
	categoryService := service.NewCategoryService(categoryRepo)
	categoryHandler := handler.NewCategoryHandler(categoryService)

	// Setup Dashboard Dependency
	dashboardRepo := repository.NewDashboardRepository(db)
	dashboardService := service.NewDashboardService(dashboardRepo)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)

	api := router.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Rute Terproteksi (Wajib Token JWT)
		protected := api.Group("/")
		protected.Use(middleware.JWTAuthMiddleware())
		{
			protected.GET("/tasks", taskHandler.GetTasks)
			protected.POST("/tasks", taskHandler.CreateTask)
			protected.GET("/tasks/:id", taskHandler.GetTaskByID)
			protected.PUT("/tasks/:id", taskHandler.UpdateTask)
			protected.DELETE("/tasks/:id", taskHandler.DeleteTask)

			protected.POST("/categories", categoryHandler.CreateCategory)
			protected.GET("/categories", categoryHandler.GetCategories)
			protected.GET("/categories/:id", categoryHandler.GetCategoryByID)
			protected.PUT("/categories/:id", categoryHandler.UpdateCategory)
			protected.DELETE("/categories/:id", categoryHandler.DeleteCategory)

			protected.GET("/dashboard", dashboardHandler.GetDashboardSummary)
		}
	}

	return router
}

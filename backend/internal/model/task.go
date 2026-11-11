package model

import "time"

type Task struct {
	ID          int64
	UserID      int64
	CategoryID  *int64 // Pointer karena nullable (bisa diset NULL)
	Title       string
	Description string
	Priority    string
	Status      string
	DueDate     *string // Pointer agar mendukung NULL
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

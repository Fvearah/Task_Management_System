package repository

import (
	"context"
	"database/sql"
	"task-management/internal/dto"
	"task-management/internal/model"
)

type DashboardRepository interface {
	GetDashboardSummary(ctx context.Context, userID int64) (dto.DashboardResponse, error)
}

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepository{db}
}

func (r *dashboardRepository) GetDashboardSummary(ctx context.Context, userID int64) (dto.DashboardResponse, error) {
	var summary dto.DashboardResponse

	// 1. Agregasi Total dan Kalkulasi Status
	queryStats := `
		SELECT 
			COUNT(id) AS total,
			COALESCE(SUM(CASE WHEN status = 'TODO' THEN 1 ELSE 0 END), 0) AS todo,
			COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress,
			COALESCE(SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END), 0) AS done
		FROM tasks 
		WHERE user_id = ?
	`
	err := r.db.QueryRowContext(ctx, queryStats, userID).Scan(
		&summary.TotalTask, &summary.TodoTask, &summary.InProgressTask, &summary.DoneTask,
	)
	if err != nil {
		return summary, err
	}

	// 2. Ambil 5 Tugas dengan deadline terdekat yang belum selesai
	queryUpcoming := `
		SELECT id, user_id, category_id, title, description, priority, status, due_date, created_at, updated_at 
		FROM tasks 
		WHERE user_id = ? AND status != 'DONE' AND due_date IS NOT NULL 
		ORDER BY due_date ASC 
		LIMIT 5
	`
	rows, err := r.db.QueryContext(ctx, queryUpcoming, userID)
	if err != nil {
		return summary, err
	}
	defer rows.Close()

	summary.UpcomingTasks = []model.Task{}
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.Title, &t.Description,
			&t.Priority, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return summary, err
		}
		summary.UpcomingTasks = append(summary.UpcomingTasks, t)
	}

	return summary, nil
}

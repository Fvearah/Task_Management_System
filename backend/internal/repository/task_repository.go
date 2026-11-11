package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"task-management/internal/dto"
	"task-management/internal/model"
)

// 1. Interface HANYA berisi nama fungsi (signature)
type TaskRepository interface {
	CreateTask(ctx context.Context, task *model.Task) error
	GetTaskByID(ctx context.Context, id int64, userID int64) (*model.Task, error)
	UpdateTask(ctx context.Context, id int64, userID int64, task *model.Task) error
	DeleteTask(ctx context.Context, id int64, userID int64) error
	GetTasks(ctx context.Context, userID int64, req dto.GetTasksRequest) ([]model.Task, int, error)
}

// 2. Struct repository
type taskRepository struct {
	db *sql.DB
}

// 3. Constructor
func NewTaskRepository(db *sql.DB) TaskRepository {
	return &taskRepository{db}
}

// 4. Implementasi CreateTask
func (r *taskRepository) CreateTask(ctx context.Context, task *model.Task) error {
	query := `
		INSERT INTO tasks (user_id, category_id, title, description, priority, status, due_date) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	if task.Priority == "" {
		task.Priority = "MEDIUM"
	}
	if task.Status == "" {
		task.Status = "TODO"
	}

	result, err := r.db.ExecContext(ctx, query,
		task.UserID, task.CategoryID, task.Title, task.Description,
		task.Priority, task.Status, task.DueDate,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err == nil {
		task.ID = id
	}
	return nil
}

// 5. Implementasi GetTasks
func (r *taskRepository) GetTasks(ctx context.Context, userID int64, req dto.GetTasksRequest) ([]model.Task, int, error) {
	baseQuery := ` FROM tasks WHERE user_id = ?`
	args := []interface{}{userID}

	if req.Search != "" {
		baseQuery += ` AND title LIKE ?`
		args = append(args, "%"+req.Search+"%")
	}
	if req.Status != "" {
		baseQuery += ` AND status = ?`
		args = append(args, req.Status)
	}
	if req.Priority != "" {
		baseQuery += ` AND priority = ?`
		args = append(args, req.Priority)
	}
	if req.CategoryID != nil {
		baseQuery += ` AND category_id = ?`
		args = append(args, *req.CategoryID)
	}

	var total int
	countQuery := `SELECT COUNT(id)` + baseQuery
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	validSortColumns := map[string]string{
		"created_at": "created_at",
		"due_date":   "due_date",
		"title":      "title",
	}
	sortBy := "created_at"
	if col, ok := validSortColumns[req.SortBy]; ok {
		sortBy = col
	}

	sortOrder := "DESC"
	if strings.ToUpper(req.SortOrder) == "ASC" {
		sortOrder = "ASC"
	}

	baseQuery += fmt.Sprintf(` ORDER BY %s %s`, sortBy, sortOrder)

	offset := (req.Page - 1) * req.Limit
	baseQuery += ` LIMIT ? OFFSET ?`
	args = append(args, req.Limit, offset)

	dataQuery := `SELECT id, user_id, category_id, title, description, priority, status, due_date, created_at, updated_at` + baseQuery
	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []model.Task
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.CategoryID, &t.Title, &t.Description,
			&t.Priority, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		tasks = append(tasks, t)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}
func (r *taskRepository) GetTaskByID(ctx context.Context, id int64, userID int64) (*model.Task, error) {
	query := `SELECT id, user_id, category_id, title, description, priority, status, due_date, created_at, updated_at 
	          FROM tasks WHERE id = ? AND user_id = ?`

	row := r.db.QueryRowContext(ctx, query, id, userID)
	var t model.Task
	err := row.Scan(
		&t.ID, &t.UserID, &t.CategoryID, &t.Title, &t.Description,
		&t.Priority, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *taskRepository) UpdateTask(ctx context.Context, id int64, userID int64, task *model.Task) error {
	query := `UPDATE tasks SET category_id = ?, title = ?, description = ?, priority = ?, status = ?, due_date = ? 
	          WHERE id = ? AND user_id = ?`

	result, err := r.db.ExecContext(ctx, query,
		task.CategoryID, task.Title, task.Description, task.Priority, task.Status, task.DueDate,
		id, userID,
	)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *taskRepository) DeleteTask(ctx context.Context, id int64, userID int64) error {
	query := `DELETE FROM tasks WHERE id = ? AND user_id = ?`
	result, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

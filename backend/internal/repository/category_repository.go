package repository

import (
	"context"
	"database/sql"
	"task-management/internal/model"
)

type CategoryRepository interface {
	CreateCategory(ctx context.Context, category *model.Category) error
	GetCategories(ctx context.Context, userID int64) ([]model.Category, error)
	GetCategoryByID(ctx context.Context, id int64, userID int64) (*model.Category, error)
	UpdateCategory(ctx context.Context, id int64, userID int64, name string) error
	DeleteCategory(ctx context.Context, id int64, userID int64) error
}

type categoryRepository struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) CategoryRepository {
	return &categoryRepository{db}
}

func (r *categoryRepository) CreateCategory(ctx context.Context, category *model.Category) error {
	query := `INSERT INTO categories (user_id, name) VALUES (?, ?)`
	result, err := r.db.ExecContext(ctx, query, category.UserID, category.Name)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	category.ID = id
	return nil
}

func (r *categoryRepository) GetCategories(ctx context.Context, userID int64) ([]model.Category, error) {
	query := `SELECT c.id, c.user_id, c.name, c.created_at, c.updated_at, COUNT(t.id)
          FROM categories c
          LEFT JOIN tasks t ON t.category_id = c.id AND t.user_id = c.user_id
          WHERE c.user_id = ?
          GROUP BY c.id
          ORDER BY c.name ASC`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []model.Category
	for rows.Next() {
		var c model.Category
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt, &c.UpdatedAt, &c.TaskCount); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *categoryRepository) GetCategoryByID(ctx context.Context, id int64, userID int64) (*model.Category, error) {
	query := `SELECT id, user_id, name, created_at, updated_at FROM categories WHERE id = ? AND user_id = ?`
	var c model.Category
	err := r.db.QueryRowContext(ctx, query, id, userID).Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *categoryRepository) UpdateCategory(ctx context.Context, id int64, userID int64, name string) error {
	query := `UPDATE categories SET name = ? WHERE id = ? AND user_id = ?`
	result, err := r.db.ExecContext(ctx, query, name, id, userID)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *categoryRepository) DeleteCategory(ctx context.Context, id int64, userID int64) error {
	query := `DELETE FROM categories WHERE id = ? AND user_id = ?`
	result, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

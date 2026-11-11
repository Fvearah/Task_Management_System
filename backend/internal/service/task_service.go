package service

import (
	"context"
	"errors"
	"math"
	"task-management/internal/dto"
	"task-management/internal/model"
	"task-management/internal/repository"
)

// 1. Interface HANYA berisi nama, parameter, dan nilai kembalian (tanpa isi logika)
type TaskService interface {
	GetTaskByID(ctx context.Context, id int64, userID int64) (*model.Task, error)
	UpdateTask(ctx context.Context, id int64, userID int64, req dto.UpdateTaskRequest) error
	DeleteTask(ctx context.Context, id int64, userID int64) error
	CreateTask(ctx context.Context, userID int64, req dto.CreateTaskRequest) error
	GetTasks(ctx context.Context, userID int64, req dto.GetTasksRequest) (dto.PaginatedResponse, error)
}

// 2. Struct untuk layer service
type taskService struct {
	repo repository.TaskRepository
}

// 3. Constructor
func NewTaskService(repo repository.TaskRepository) TaskService {
	return &taskService{repo}
}

// 4. Implementasi CreateTask (berada di luar interface)
func (s *taskService) CreateTask(ctx context.Context, userID int64, req dto.CreateTaskRequest) error {
	task := &model.Task{
		UserID:      userID,
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Status:      req.Status,
		DueDate:     req.DueDate,
	}
	return s.repo.CreateTask(ctx, task)
}

// 5. Implementasi GetTasks (berada di luar interface)
func (s *taskService) GetTasks(ctx context.Context, userID int64, req dto.GetTasksRequest) (dto.PaginatedResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 {
		req.Limit = 10
	}

	tasks, total, err := s.repo.GetTasks(ctx, userID, req)
	if err != nil {
		return dto.PaginatedResponse{}, err
	}

	if tasks == nil {
		tasks = []model.Task{}
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.Limit)))

	return dto.PaginatedResponse{
		Data:       tasks,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}
func (s *taskService) GetTaskByID(ctx context.Context, id int64, userID int64) (*model.Task, error) {
	task, err := s.repo.GetTaskByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("data tidak ditemukan atau anda tidak memiliki akses")
	}
	return task, nil
}

func (s *taskService) UpdateTask(ctx context.Context, id int64, userID int64, req dto.UpdateTaskRequest) error {
	// Pastikan task ada dan dimiliki user
	existing, err := s.GetTaskByID(ctx, id, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("data tidak ditemukan")
	}

	updateData := &model.Task{
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Status:      req.Status,
		DueDate:     req.DueDate,
	}

	return s.repo.UpdateTask(ctx, id, userID, updateData)
}

func (s *taskService) DeleteTask(ctx context.Context, id int64, userID int64) error {
	// Pastikan task ada dan dimiliki user sebelum dihapus
	existing, err := s.GetTaskByID(ctx, id, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("data tidak ditemukan")
	}

	return s.repo.DeleteTask(ctx, id, userID)
}

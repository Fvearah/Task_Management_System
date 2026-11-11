package service

import (
	"context"
	"errors"
	"task-management/internal/dto"
	"task-management/internal/model"
	"task-management/internal/repository"
)

type CategoryService interface {
	CreateCategory(ctx context.Context, userID int64, req dto.CreateCategoryRequest) error
	GetCategories(ctx context.Context, userID int64) ([]model.Category, error)
	GetCategoryByID(ctx context.Context, id int64, userID int64) (*model.Category, error)
	UpdateCategory(ctx context.Context, id int64, userID int64, req dto.UpdateCategoryRequest) error
	DeleteCategory(ctx context.Context, id int64, userID int64) error
}

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo}
}

func (s *categoryService) CreateCategory(ctx context.Context, userID int64, req dto.CreateCategoryRequest) error {
	return s.repo.CreateCategory(ctx, &model.Category{UserID: userID, Name: req.Name})
}

func (s *categoryService) GetCategories(ctx context.Context, userID int64) ([]model.Category, error) {
	categories, err := s.repo.GetCategories(ctx, userID)
	if categories == nil {
		categories = []model.Category{}
	}
	return categories, err
}

func (s *categoryService) GetCategoryByID(ctx context.Context, id int64, userID int64) (*model.Category, error) {
	cat, err := s.repo.GetCategoryByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if cat == nil {
		return nil, errors.New("kategori tidak ditemukan")
	}
	return cat, nil
}

func (s *categoryService) UpdateCategory(ctx context.Context, id int64, userID int64, req dto.UpdateCategoryRequest) error {
	cat, err := s.GetCategoryByID(ctx, id, userID)
	if err != nil || cat == nil {
		return errors.New("kategori tidak ditemukan")
	}
	return s.repo.UpdateCategory(ctx, id, userID, req.Name)
}

func (s *categoryService) DeleteCategory(ctx context.Context, id int64, userID int64) error {
	cat, err := s.GetCategoryByID(ctx, id, userID)
	if err != nil || cat == nil {
		return errors.New("kategori tidak ditemukan")
	}
	return s.repo.DeleteCategory(ctx, id, userID)
}

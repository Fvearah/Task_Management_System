package service

import (
	"context"
	"task-management/internal/dto"
	"task-management/internal/repository"
)

type DashboardService interface {
	GetDashboardSummary(ctx context.Context, userID int64) (dto.DashboardResponse, error)
}

type dashboardService struct {
	repo repository.DashboardRepository
}

func NewDashboardService(repo repository.DashboardRepository) DashboardService {
	return &dashboardService{repo}
}

func (s *dashboardService) GetDashboardSummary(ctx context.Context, userID int64) (dto.DashboardResponse, error) {
	return s.repo.GetDashboardSummary(ctx, userID)
}

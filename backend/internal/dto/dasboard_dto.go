package dto

import "task-management/internal/model"

type DashboardResponse struct {
	TotalTask      int          `json:"total_task"`
	TodoTask       int          `json:"todo_task"`
	InProgressTask int          `json:"in_progress_task"`
	DoneTask       int          `json:"done_task"`
	UpcomingTasks  []model.Task `json:"upcoming_tasks"`
}

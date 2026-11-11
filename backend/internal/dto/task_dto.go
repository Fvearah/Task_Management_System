package dto

type CreateTaskRequest struct {
	CategoryID  *int64  `json:"category_id"`
	Title       string  `json:"title" binding:"required,max=200"`
	Description string  `json:"description"`
	Priority    string  `json:"priority" binding:"omitempty,oneof=LOW MEDIUM HIGH"`
	Status      string  `json:"status" binding:"omitempty,oneof=TODO IN_PROGRESS DONE"`
	DueDate     *string `json:"due_date"`
}

type GetTasksRequest struct {
	Page       int    `form:"page,default=1"`
	Limit      int    `form:"limit,default=10"`
	Search     string `form:"search"`
	Status     string `form:"status"`
	Priority   string `form:"priority"`
	CategoryID *int64 `form:"category_id"`
	SortBy     string `form:"sort_by,default=created_at"`
	SortOrder  string `form:"sort_order,default=desc"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}
type UpdateTaskRequest struct {
	CategoryID  *int64  `json:"category_id"`
	Title       string  `json:"title" binding:"required,max=200"`
	Description string  `json:"description"`
	Priority    string  `json:"priority" binding:"omitempty,oneof=LOW MEDIUM HIGH"`
	Status      string  `json:"status" binding:"omitempty,oneof=TODO IN_PROGRESS DONE"`
	DueDate     *string `json:"due_date"`
}

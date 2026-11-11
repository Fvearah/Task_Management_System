package dto

type CreateCategoryRequest struct {
	Name string `json:"name" binding:"required,max=100"`
}

type UpdateCategoryRequest struct {
	Name string `json:"name" binding:"required,max=100"`
}

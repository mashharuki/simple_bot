variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast1"
}

variable "telegram_bot_token" {
  description = "Telegram Bot Token"
  type        = string
  sensitive   = true
}

variable "telegram_chat_id" {
  description = "Telegram Chat ID"
  type        = string
}

variable "repo_name" {
  description = "Artifact Registry Repository Name"
  type        = string
  default     = "simple-bot-repo"
}

variable "image_name" {
  description = "Container Image Name (e.g. simple-bot)"
  type        = string
  default     = "simple-bot"
}

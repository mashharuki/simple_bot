# Artifact Registry Repository
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = var.repo_name
  description   = "Docker repository for Simple Bot"
  format        = "DOCKER"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "default" {
  name     = var.image_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # リソーステンプレート
  template {
    containers {
      # コンテナイメージ
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repo_name}/${var.image_name}:latest"
      # 環境変数を読み込み
      env {
        name  = "TELEGRAM_BOT_TOKEN"
        value = var.telegram_bot_token
      }
      env {
        name  = "TELEGRAM_CHAT_ID"
        value = var.telegram_chat_id
      }
      # Cloud Runで常時CPU割り当てを有効にする場合
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
       }
       cpu_idle = false # trueならリクエスト時のみ、falseなら常時
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated invocations (if needed for health checks)
resource "google_cloud_run_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.default.location
  service  = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

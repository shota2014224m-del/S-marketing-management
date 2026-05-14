export type ProjectStatus = "active" | "archived";
export type ScriptStatus = "draft" | "approved" | "in_production" | "completed";
export type AssetStatus = "pending" | "generating" | "completed" | "failed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type PostStatus = "scheduled" | "posted" | "failed" | "cancelled";
export type Platform = "tiktok" | "youtube" | "instagram" | "twitter";

export type ImageService =
  | "dall-e-3"
  | "stable-diffusion"
  | "midjourney"
  | "adobe-firefly"
  | "other";

export type VideoService =
  | "d-id"
  | "heygen"
  | "runway"
  | "pika"
  | "kling"
  | "other";

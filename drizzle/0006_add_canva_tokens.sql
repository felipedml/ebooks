CREATE TABLE IF NOT EXISTS `canva_tokens` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL DEFAULT 'admin',
  `access_token` text NOT NULL,
  `refresh_token` text,
  `expires_at` integer,
  `scope` text,
  `token_type` text DEFAULT 'Bearer',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_canva_tokens_user_id` ON `canva_tokens`(`user_id`);

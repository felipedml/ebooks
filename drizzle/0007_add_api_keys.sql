CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nome` text NOT NULL,
  `provider` text NOT NULL,
  `key_encriptada` text NOT NULL,
  `ativa` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_api_keys_provider` ON `api_keys`(`provider`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_api_keys_ativa` ON `api_keys`(`ativa`);

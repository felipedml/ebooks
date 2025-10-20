CREATE TABLE IF NOT EXISTS `sessoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL UNIQUE,
	`fluxo_id` integer NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'em_andamento' NOT NULL,
	`current_step_index` integer DEFAULT 0,
	`contact_data` text,
	`metadata` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`last_interaction_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`fluxo_id`) REFERENCES `fluxos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sessoes_session_id` ON `sessoes`(`session_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sessoes_user_id` ON `sessoes`(`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sessoes_status` ON `sessoes`(`status`);

CREATE TABLE IF NOT EXISTS `configuracao_visual` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cor_background` text DEFAULT '#f3f4f6' NOT NULL,
	`cor_balao_bot` text DEFAULT '#ffffff' NOT NULL,
	`cor_balao_user` text DEFAULT '#10b981' NOT NULL,
	`cor_texto_bot` text DEFAULT '#374151' NOT NULL,
	`cor_texto_user` text DEFAULT '#ffffff' NOT NULL,
	`imagem_logo` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert default configuration
INSERT INTO `configuracao_visual` (id) VALUES (1);

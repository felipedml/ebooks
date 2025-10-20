CREATE TABLE `livros` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`titulo` text NOT NULL,
	`subtitulo` text,
	`resumo` text NOT NULL,
	`idioma` text DEFAULT 'PORTUGUÊS DO BRASIL' NOT NULL,
	`autor` text NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`valor` real DEFAULT 49.9 NOT NULL,
	`conteudo` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`livro_id` integer NOT NULL,
	`valor` real NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`plataforma` text,
	`transacao_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`livro_id`) REFERENCES `livros`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `perguntas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`livro_id` integer NOT NULL,
	`pergunta` text NOT NULL,
	`resposta` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`livro_id`) REFERENCES `livros`(`id`) ON UPDATE no action ON DELETE no action
);

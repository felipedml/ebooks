CREATE TABLE `fluxos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`ativo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `respostas_fluxo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fluxo_id` integer NOT NULL,
	`step_id` integer NOT NULL,
	`sessao_id` text NOT NULL,
	`resposta` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`fluxo_id`) REFERENCES `fluxos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`step_id`) REFERENCES `steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fluxo_id` integer NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	`tipo` text NOT NULL,
	`conteudo` text NOT NULL,
	`condicoes` text,
	`proximo_step` integer,
	`ativo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`fluxo_id`) REFERENCES `fluxos`(`id`) ON UPDATE no action ON DELETE cascade
);

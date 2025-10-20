-- Script para criar um fluxo de exemplo
-- Execute com: sqlite3 sqlite.db < scripts/seed-example-flow.sql

-- Criar fluxo MASTER de exemplo
INSERT INTO fluxos (nome, descricao, ativo, master) 
VALUES (
  'Geração de Livro Automática', 
  'Fluxo completo para gerar livros com IA',
  1,
  1
);

-- Pegar o ID do fluxo criado
-- No SQLite, last_insert_rowid() retorna o ID da última inserção
-- Vamos assumir que é o ID 1 para os steps abaixo

-- Steps do fluxo
INSERT INTO steps (fluxo_id, ordem, tipo, conteudo, ativo) VALUES
(1, 0, 'texto', '{"texto": "Olá! Sou o Bruno, seu assistente de criação de livros 📚", "delayMs": 600}', 1),
(1, 1, 'texto', '{"texto": "Vou te ajudar a criar um livro completo em menos de 1 hora!", "delayMs": 800}', 1),
(1, 2, 'texto', '{"texto": "Primeiro, me conta: sobre o que você quer escrever?", "delayMs": 700}', 1),
(1, 3, 'input', '{"placeholder": "Digite o tema do seu livro...", "inputType": "textarea", "variavel": "tema"}', 1),
(1, 4, 'texto', '{"texto": "Excelente escolha! Agora me diga qual é o seu objetivo com este livro?", "delayMs": 600}', 1),
(1, 5, 'botoes', '{"botoes": [{"id": "1", "label": "Compartilhar conhecimento", "value": "knowledge"}, {"id": "2", "label": "Contar uma história", "value": "story"}, {"id": "3", "label": "Gerar renda passiva", "value": "income"}]}', 1),
(1, 6, 'texto', '{"texto": "Perfeito! Qual público você quer alcançar?", "delayMs": 500}', 1),
(1, 7, 'input', '{"placeholder": "Ex: empreendedores, estudantes, profissionais de TI...", "inputType": "text", "variavel": "publico"}', 1),
(1, 8, 'texto', '{"texto": "Ótimo! Agora vou gerar um sumário personalizado para você...", "delayMs": 700}', 1),
(1, 9, 'texto', '{"texto": "📝 Gerando sumário com base nas suas respostas...", "delayMs": 2000}', 1),
(1, 10, 'texto', '{"texto": "Sumário pronto! Seu livro terá 12 capítulos estratégicos.", "delayMs": 600}', 1),
(1, 11, 'texto', '{"texto": "Para prosseguir com a geração completa, o investimento é de R$ 97", "delayMs": 700}', 1),
(1, 12, 'botoes', '{"botoes": [{"id": "1", "label": "Gerar meu livro agora!", "value": "generate"}, {"id": "2", "label": "Ver exemplo primeiro", "value": "example"}, {"id": "3", "label": "Tenho dúvidas", "value": "questions"}]}', 1);

-- Desmarcar outros fluxos como master (garantir apenas um)
UPDATE fluxos SET master = 0 WHERE id != 1;

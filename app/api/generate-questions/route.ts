import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
});

const questionPrompt = PromptTemplate.fromTemplate(`
Você é um especialista em criação de livros e conteúdo. Baseado no briefing inicial do usuário, crie EXATAMENTE 3 perguntas de múltipla escolha para personalizar melhor o livro.

Briefing atual: {briefing}

Crie perguntas que ajudem a:
- Entender melhor o público-alvo
- Definir o escopo do conteúdo
- Identificar necessidades específicas
- Estabelecer o tom e estilo apropriado

TODAS as perguntas devem ser do tipo "multiple_choice" com 4 opções claras e específicas.

Formate a resposta como um JSON válido com a seguinte estrutura:
{{
  "questions": [
    {{
      "id": "pergunta_1",
      "question": "Quem é o público-alvo principal deste livro?",
      "type": "multiple_choice",
      "options": ["Iniciantes no assunto", "Profissionais experientes", "Estudantes universitários", "Público geral"]
    }},
    {{
      "id": "pergunta_2",
      "question": "Qual é o objetivo principal do livro?",
      "type": "multiple_choice",
      "options": ["Ensinar conceitos básicos", "Resolver problemas práticos", "Inspirar e motivar", "Aprofundar conhecimento técnico"]
    }},
    {{
      "id": "pergunta_3",
      "question": "Que tipo de conteúdo você prefere incluir?",
      "type": "multiple_choice",
      "options": ["Teoria com exemplos", "Exercícios práticos", "Casos de estudo reais", "Guias passo a passo"]
    }}
  ]
}}

REGRAS OBRIGATÓRIAS:
- SEMPRE 3 perguntas
- SEMPRE tipo "multiple_choice"
- SEMPRE 4 opções por pergunta
- Use português brasileiro
- Opções devem ser específicas e úteis para criação do livro
- Foque em aspectos que realmente impactam o conteúdo final
`);

export async function POST(request: NextRequest) {
  try {
    const { briefing } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      );
    }

    const chain = questionPrompt.pipe(llm);
    const response = await chain.invoke({ briefing });

    // Tentar fazer parse do JSON da resposta
    let questions;
    try {
      // Extrair JSON da resposta (remover markdown se houver)
      const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      // Fallback para perguntas padrão
      questions = {
        questions: [
          {
            id: "pergunta_1",
            question: "Qual é o seu nível de conhecimento no assunto?",
            type: "multiple_choice",
            options: ["Iniciante", "Intermediário", "Avançado", "Especialista"]
          },
          {
            id: "pergunta_2",
            question: "Qual é o objetivo principal do livro?",
            type: "multiple_choice",
            options: ["Educar", "Entreter", "Inspirar", "Resolver problemas"]
          },
          {
            id: "pergunta_3",
            question: "Qual formato de conteúdo você prefere?",
            type: "multiple_choice",
            options: ["Teórico", "Prático", "Casos de estudo", "Misturado"]
          }
        ]
      };
    }

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Erro na API de geração de perguntas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

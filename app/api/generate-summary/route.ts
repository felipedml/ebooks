import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini'
});

const summaryPrompt = PromptTemplate.fromTemplate(`
Você é um especialista em estruturação de livros e criação de sumários. Com base no briefing completo do usuário, crie um sumário detalhado e bem estruturado para um livro de aproximadamente 100 páginas.

Briefing do usuário:
- Tema: {tema}
- Público: {publico}
- Tom: {tom}
- Informações adicionais: {additionalInfo}

INSTRUÇÕES PARA CRIAR O SUMÁRIO:

1. **Estrutura Geral**: Crie um sumário com 10-15 capítulos principais
2. **Progressão Lógica**: Os capítulos devem seguir uma progressão natural do conhecimento
3. **Relevância**: Cada capítulo deve ser diretamente relevante para o tema e público
4. **Tom Adequado**: Mantenha o tom consistente com a preferência do usuário
5. **Profundidade**: Considere o nível do público-alvo na complexidade dos tópicos
6. **Valor Prático**: Inclua elementos práticos quando apropriado

Formate a resposta como um texto estruturado, não como JSON. Use formatação clara com numeração e títulos descritivos.

EXEMPLO DE FORMATO:
Sumário sugerido (tom {tom}, para {publico}):

1. Introdução ao {tema}
   - Apresentação do conceito
   - Importância atual
   - Benefícios para o leitor

2. Fundamentos Essenciais
   - Conceitos básicos
   - Terminologia importante
   - Estrutura fundamental

[Continue com os demais capítulos...]

IMPORTANTE:
- Use português brasileiro
- Mantenha títulos concisos mas descritivos
- Inclua subtópicos relevantes para cada capítulo
- Garanta que o conteúdo seja original e valioso
- Considere a extensão aproximada de cada capítulo (~8-12 páginas)
`);

export async function POST(request: NextRequest) {
    try {
        const { tema, publico, tom, additionalInfo } = await request.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'OpenAI API key não configurada' },
                { status: 500 }
            );
        }

        const chain = summaryPrompt.pipe(llm);
        const response = await chain.invoke({
            tema,
            publico,
            tom,
            additionalInfo: additionalInfo || 'Nenhuma informação adicional fornecida'
        });

        const summary = response.content.toString();

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Erro na API de geração de sumário:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

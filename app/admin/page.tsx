'use client';

import { useState, useEffect } from 'react';

interface Livro {
  id: number;
  nome: string;
  titulo: string;
  subtitulo: string;
  resumo: string;
  idioma: string;
  autor: string;
  email: string;
  whatsapp: string;
  status: string;
  valor: number;
  createdAt: string;
}

export default function AdminPage() {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLivros();
  }, []);

  const fetchLivros = async () => {
    try {
      const response = await fetch('/api/livros');
      const data = await response.json();
      
      if (data.success) {
        setLivros(data.livros);
      } else {
        setError('Erro ao carregar livros');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (error) return <div className="p-8 text-red-600">Erro: {error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Painel Administrativo - Livros</h1>
      
      <div className="grid gap-6">
        {livros.length === 0 ? (
          <p className="text-gray-600">Nenhum livro encontrado.</p>
        ) : (
          livros.map((livro) => (
            <div key={livro.id} className="border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{livro.titulo}</h3>
                  {livro.subtitulo && (
                    <p className="text-gray-600 mb-2">{livro.subtitulo}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>Autor:</strong> {livro.autor} | <strong>Idioma:</strong> {livro.idioma}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>Cliente:</strong> {livro.nome} ({livro.email})
                  </p>
                  {livro.whatsapp && (
                    <p className="text-sm text-gray-500 mb-2">
                      <strong>WhatsApp:</strong> {livro.whatsapp}
                    </p>
                  )}
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Resumo:</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {livro.resumo}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        livro.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        livro.status === 'pago' ? 'bg-green-100 text-green-800' :
                        livro.status === 'gerando' ? 'bg-blue-100 text-blue-800' :
                        livro.status === 'concluído' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {livro.status}
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        R$ {livro.valor.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      <strong>Criado em:</strong> {new Date(livro.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">ID: {livro.id}</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(livro.email)}
                      className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Copiar Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-8 text-center">
        <button 
          onClick={fetchLivros}
          className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700"
        >
          Atualizar Lista
        </button>
      </div>
    </div>
  );
}

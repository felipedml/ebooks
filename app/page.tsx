"use client";

import { useState, useEffect } from "react";
import { Play, Settings, Link2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface Flow {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const response = await fetch('/api/fluxos');
      const data = await response.json();
      
      if (data.success) {
        setFlows(data.fluxos.filter((f: Flow) => f.ativo));
      }
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair?')) return;
    
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logout */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Fluxos Disponíveis</h1>
          <p className="text-gray-600">
            Cada fluxo possui um link único para acesso direto
          </p>
        </div>

        {flows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Play className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Nenhum fluxo ativo</h2>
            <p className="text-gray-600 mb-6">
              Configure seus fluxos na página de configuração
            </p>
            <a 
              href="/config" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              Ir para Configurações
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flows.map((flow) => (
              <div 
                key={flow.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-2">{flow.nome}</h3>
                <p className="text-gray-600 mb-4">{flow.descricao}</p>
                
                <div className="space-y-3">
                  <a
                    href={`/flow/${flow.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    <Play className="h-5 w-5" />
                    Iniciar Fluxo
                  </a>
                  
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <code className="text-xs text-gray-600 truncate flex-1">
                      {typeof window !== 'undefined' ? `${window.location.origin}/flow/${flow.id}` : `/flow/${flow.id}`}
                    </code>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/flow/${flow.id}`;
                        navigator.clipboard.writeText(url);
                        alert('Link copiado!');
                      }}
                      className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors whitespace-nowrap"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a 
            href="/config" 
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
            Gerenciar Fluxos
          </a>
        </div>
      </div>
    </div>
  );
}

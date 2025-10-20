"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import FlowRunner from '@/components/FlowRunner';

export default function FlowPage() {
  const params = useParams();
  const flowId = params.id ? parseInt(params.id as string) : null;
  
  const [fluxo, setFluxo] = useState<{ id: number; nome: string; ativo: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (flowId) {
      loadFluxo(flowId);
    } else {
      setError('ID do fluxo não fornecido');
      setLoading(false);
    }
  }, [flowId]);

  const loadFluxo = async (id: number) => {
    try {
      const response = await fetch(`/api/fluxos/${id}`);
      const data = await response.json();
      
      if (data.success && data.fluxo) {
        setFluxo(data.fluxo);
      } else {
        setError(data.error || 'Fluxo não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar fluxo:', error);
      setError('Erro ao carregar fluxo');
    } finally {
      setLoading(false);
    }
  };

  const handleFluxoComplete = (responses: Record<string, unknown>) => {
    console.log('Fluxo completado com respostas:', responses);
    // Aqui você pode fazer algo com as respostas, como enviar para uma API
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !fluxo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Fluxo não encontrado'}
          </p>
          <a 
            href="/config" 
            className="text-emerald-600 hover:underline"
          >
            Ir para configurações
          </a>
        </div>
      </div>
    );
  }

  if (!fluxo.ativo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Fluxo Inativo</h1>
          <p className="text-gray-600 mb-4">
            Este fluxo está atualmente inativo.
          </p>
          <a 
            href="/config" 
            className="text-emerald-600 hover:underline"
          >
            Ir para configurações
          </a>
        </div>
      </div>
    );
  }

  return (
    <FlowRunner
      key={fluxo.id}
      flowId={fluxo.id}
      onComplete={handleFluxoComplete}
    />
  );
}

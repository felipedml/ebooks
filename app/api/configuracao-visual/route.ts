import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { configuracaoVisual } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    // Check database connection
    if (!db) {
      console.error('[API] Database not initialized');
      return corsResponse(
        { 
          success: false,
          error: 'Erro de configuração do banco de dados',
          details: 'Database connection not available'
        },
        { status: 500, origin }
      );
    }

    const config = await db
      .select()
      .from(configuracaoVisual)
      .where(eq(configuracaoVisual.id, 1))
      .limit(1);

    if (config.length === 0) {
      // Create default config if none exists
      console.log('[API] Creating default visual configuration');
      const newConfig = await db
        .insert(configuracaoVisual)
        .values({ id: 1 })
        .returning();
      
      return corsResponse(
        { 
          success: true, 
          configuracao: newConfig[0] 
        },
        { origin }
      );
    }

    return corsResponse(
      { 
        success: true, 
        configuracao: config[0] 
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Error fetching visual configuration:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    
    return corsResponse(
      { 
        success: false, 
        error: 'Failed to fetch visual configuration',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    const data = await request.json();

    const updated = await db
      .update(configuracaoVisual)
      .set({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .where(eq(configuracaoVisual.id, 1))
      .returning();

    if (updated.length === 0) {
      // Create if doesn't exist
      console.log('[API] Creating visual configuration during update');
      const created = await db
        .insert(configuracaoVisual)
        .values({
          id: 1,
          ...data
        })
        .returning();
      
      return corsResponse(
        { 
          success: true, 
          configuracao: created[0] 
        },
        { origin }
      );
    }

    return corsResponse(
      { 
        success: true, 
        configuracao: updated[0] 
      },
      { origin }
    );
  } catch (error) {
    console.error('[API] Error updating visual configuration:', error);
    
    if (error instanceof Error) {
      console.error('[API] Error name:', error.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    
    return corsResponse(
      { 
        success: false, 
        error: 'Failed to update visual configuration',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500, origin }
    );
  }
}

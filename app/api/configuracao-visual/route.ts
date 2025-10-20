import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { configuracaoVisual } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const config = await db
      .select()
      .from(configuracaoVisual)
      .where(eq(configuracaoVisual.id, 1))
      .limit(1);

    if (config.length === 0) {
      // Create default config if none exists
      const newConfig = await db
        .insert(configuracaoVisual)
        .values({ id: 1 })
        .returning();
      
      return NextResponse.json({ 
        success: true, 
        configuracao: newConfig[0] 
      });
    }

    return NextResponse.json({ 
      success: true, 
      configuracao: config[0] 
    });
  } catch (error) {
    console.error('Error fetching visual configuration:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch visual configuration',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
      const created = await db
        .insert(configuracaoVisual)
        .values({
          id: 1,
          ...data
        })
        .returning();
      
      return NextResponse.json({ 
        success: true, 
        configuracao: created[0] 
      });
    }

    return NextResponse.json({ 
      success: true, 
      configuracao: updated[0] 
    });
  } catch (error) {
    console.error('Error updating visual configuration:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update visual configuration',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}

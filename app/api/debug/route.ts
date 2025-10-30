import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fluxos } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { corsResponse, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  console.log('[API /debug] 🔍 Iniciando debug...');
  console.log('[API /debug] NODE_ENV:', process.env.NODE_ENV);
  console.log('[API /debug] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado');
  
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseConfigured: !!process.env.DATABASE_URL,
    tests: {}
  };

  try {
    // Test 1: Raw SQL query
    console.log('[API /debug] Test 1: SELECT 1');
    try {
      const rawTest = await db.run(sql`SELECT 1 as test`);
      debugInfo.tests.rawSql = { success: true, result: rawTest };
      console.log('[API /debug] ✅ Raw SQL OK');
    } catch (e) {
      debugInfo.tests.rawSql = { 
        success: false, 
        error: e instanceof Error ? e.message : String(e) 
      };
      console.error('[API /debug] ❌ Raw SQL failed:', e);
    }

    // Test 2: List tables
    console.log('[API /debug] Test 2: List tables');
    try {
      const tables = await db.run(sql`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `);
      debugInfo.tests.listTables = { success: true, tables };
      console.log('[API /debug] ✅ Tables:', tables);
    } catch (e) {
      debugInfo.tests.listTables = { 
        success: false, 
        error: e instanceof Error ? e.message : String(e) 
      };
      console.error('[API /debug] ❌ List tables failed:', e);
    }

    // Test 3: Describe fluxos table
    console.log('[API /debug] Test 3: Describe fluxos table');
    try {
      const columns = await db.run(sql`PRAGMA table_info(fluxos)`);
      debugInfo.tests.fluxosSchema = { success: true, columns };
      console.log('[API /debug] ✅ Fluxos columns:', columns);
    } catch (e) {
      debugInfo.tests.fluxosSchema = { 
        success: false, 
        error: e instanceof Error ? e.message : String(e) 
      };
      console.error('[API /debug] ❌ Describe fluxos failed:', e);
    }

    // Test 4: Simple SELECT from fluxos (raw SQL)
    console.log('[API /debug] Test 4: SELECT * FROM fluxos LIMIT 1');
    try {
      const rawFluxos = await db.run(sql`SELECT * FROM fluxos LIMIT 1`);
      debugInfo.tests.rawSelectFluxos = { success: true, data: rawFluxos };
      console.log('[API /debug] ✅ Raw SELECT fluxos:', rawFluxos);
    } catch (e) {
      debugInfo.tests.rawSelectFluxos = { 
        success: false, 
        error: e instanceof Error ? e.message : String(e) 
      };
      console.error('[API /debug] ❌ Raw SELECT fluxos failed:', e);
    }

    // Test 5: Drizzle query
    console.log('[API /debug] Test 5: Drizzle SELECT');
    try {
      const drizzleFluxos = await db.select().from(fluxos).limit(1);
      debugInfo.tests.drizzleSelect = { 
        success: true, 
        count: drizzleFluxos.length,
        data: drizzleFluxos 
      };
      console.log('[API /debug] ✅ Drizzle SELECT:', drizzleFluxos);
    } catch (e) {
      debugInfo.tests.drizzleSelect = { 
        success: false, 
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      };
      console.error('[API /debug] ❌ Drizzle SELECT failed:', e);
    }

    return corsResponse(
      {
        success: true,
        debug: debugInfo
      },
      { origin }
    );

  } catch (error) {
    console.error('[API /debug] ❌ Critical error:', error);
    return corsResponse(
      {
        success: false,
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : String(error),
        debug: debugInfo
      },
      { status: 500, origin }
    );
  }
}

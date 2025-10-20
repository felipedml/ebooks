import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/app/src/inngest/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, data } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: 'Missing event name or data' },
        { status: 400 }
      );
    }

    // Send event to Inngest
    await inngest.send({
      name,
      data
    });

    return NextResponse.json({ 
      success: true,
      message: `Event ${name} sent successfully` 
    });
  } catch (error) {
    console.error('Error triggering Inngest event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger event',
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

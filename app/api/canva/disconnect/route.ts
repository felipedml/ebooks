/**
 * Canva OAuth - Disconnect/Remove authentication
 * POST /api/canva/disconnect
 */

import { NextResponse } from 'next/server';
import { deleteCanvaToken } from '@/lib/canva-token';

export async function POST() {
    try {
        const userId = 'admin'; // TODO: Get from session

        const success = await deleteCanvaToken(userId);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Canva disconnected successfully'
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Failed to disconnect' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Canva Disconnect] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to disconnect' },
            { status: 500 }
        );
    }
}

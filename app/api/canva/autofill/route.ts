/**
 * Canva API - Create autofill design from Brand Template
 * POST /api/canva/autofill
 * Body: { access_token, brandTemplateId, fields: { headline, subtitle, ... } }
 * 
 * This endpoint creates an autofill job and polls for completion (max 30s)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Check autofill job status
 */
async function checkJobStatus(jobId: string, accessToken: string) {
  const response = await fetch(`https://api.canva.com/rest/v1/autofills/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check job status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Poll job status until completion or timeout
 */
async function pollJobStatus(jobId: string, accessToken: string, maxWaitMs: number = 30000) {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const jobData = await checkJobStatus(jobId, accessToken);
    const status = jobData.job?.status;

    console.log(`[Canva Autofill] Job ${jobId} status: ${status}`);

    if (status === 'success') {
      return {
        success: true,
        status: 'success',
        design: jobData.job.result?.design
      };
    }

    if (status === 'failed') {
      return {
        success: false,
        status: 'failed',
        error: jobData.job.error
      };
    }

    // Status is 'in_progress', wait and try again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  return {
    success: false,
    status: 'timeout',
    error: {
      code: 'timeout',
      message: `Job did not complete within ${maxWaitMs / 1000} seconds`
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, brandTemplateId, fields } = body;

    if (!access_token || !brandTemplateId) {
      return NextResponse.json(
        { success: false, error: 'Access token and brandTemplateId required' },
        { status: 400 }
      );
    }

    // Step 1: Create autofill job
    console.log('[Canva Autofill] Creating autofill job for template:', brandTemplateId);
    const response = await fetch('https://api.canva.com/rest/v1/autofills', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandTemplateId,
        input: {
          fields: fields || {}
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Canva API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const jobId = data.job?.id;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'No job ID returned from Canva' },
        { status: 500 }
      );
    }

    console.log('[Canva Autofill] Job created:', jobId);

    // Step 2: Poll for job completion (max 30 seconds)
    const result = await pollJobStatus(jobId, access_token, 30000);

    if (result.success) {
      console.log('[Canva Autofill] Job completed successfully:', result.design?.id);
      return NextResponse.json({
        success: true,
        jobId,
        status: 'success',
        design: result.design
      });
    } else {
      console.error('[Canva Autofill] Job failed or timeout:', result.error);
      return NextResponse.json({
        success: false,
        jobId,
        status: result.status,
        error: result.error
      }, { status: result.status === 'timeout' ? 408 : 500 });
    }

  } catch (error) {
    console.error('[Canva Autofill] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create autofill' },
      { status: 500 }
    );
  }
}

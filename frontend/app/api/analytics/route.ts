import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

function getAnalyticsFallback(
  action: string,
  channel?: string | null,
  outcome?: string | null,
  limit: string = '20'
) {
  try {
    const backendDir = path.resolve(process.cwd(), '../backend');
    let pyCode = `import json; from memory.service import MemoryService; print(json.dumps(MemoryService.get_call_analytics_summary()))`;
    if (action === 'calls') {
      pyCode = `import json; from memory.service import MemoryService; print(json.dumps(MemoryService.list_recent_calls(limit=${limit}, channel="${channel || ''}", outcome="${outcome || ''}")))`;
    }

    const output = execSync(`uv run python -c "${pyCode}"`, {
      cwd: backendDir,
      encoding: 'utf-8',
      timeout: 4000,
    });
    const parsed = JSON.parse(output.trim());
    if (action === 'calls') {
      return { success: true, calls: parsed };
    }
    return { success: true, summary: parsed };
  } catch (err) {
    console.error('Analytics fallback error:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const channel = searchParams.get('channel');
    const outcome = searchParams.get('outcome');
    const limit = searchParams.get('limit') || '20';

    const ports = ['8088', '8080'];

    for (const port of ports) {
      try {
        const backendApiUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${port}`;
        let targetUrl = `${backendApiUrl}/api/analytics/summary`;

        if (action === 'calls') {
          const params = new URLSearchParams();
          if (channel) params.append('channel', channel);
          if (outcome) params.append('outcome', outcome);
          params.append('limit', limit);
          targetUrl = `${backendApiUrl}/api/analytics/calls?${params.toString()}`;
        }

        const res = await fetch(targetUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }
      } catch (err: any) {
        // Continue loop or use fallback below
      }
    }

    // Secondary direct SQLite fallback via Python service
    const fallbackData = getAnalyticsFallback(action, channel, outcome, limit);
    if (fallbackData) {
      return NextResponse.json(fallbackData);
    }

    if (action === 'calls') {
      return NextResponse.json({ success: true, calls: [] });
    }
    return NextResponse.json({
      success: true,
      summary: {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        success_rate: 0,
        failure_categories: {},
        channels: {},
        triage_breakdown: {},
        avg_duration_seconds: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

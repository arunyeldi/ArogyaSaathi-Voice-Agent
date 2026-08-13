import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ refId: string }> }) {
  try {
    const { refId } = await params;
    const ports = ['8088', '8080'];

    for (const port of ports) {
      try {
        const backendApiUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${port}`;
        const res = await fetch(`${backendApiUrl}/api/escalations/${refId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }
      } catch {
        // try next port
      }
    }

    return NextResponse.json({ success: false, message: 'Escalation not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ refId: string }> }) {
  try {
    const { refId } = await params;
    const body = await request.json();
    const { action, status } = body;

    const ports = ['8088', '8080'];

    for (const port of ports) {
      try {
        const backendApiUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${port}`;
        const endpoint =
          action === 'callback'
            ? `${backendApiUrl}/api/escalations/${refId}/callback`
            : `${backendApiUrl}/api/escalations/${refId}/status`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      } catch {
        // try next port
      }
    }

    return NextResponse.json(
      { success: false, message: 'Backend service unavailable' },
      { status: 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

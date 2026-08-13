import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const ports = ['8088', '8080'];
    let lastErr: any = null;

    for (const port of ports) {
      try {
        const backendApiUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${port}`;
        const url = status
          ? `${backendApiUrl}/api/escalations?status=${encodeURIComponent(status)}`
          : `${backendApiUrl}/api/escalations`;

        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: res.status });
        }
      } catch (err: any) {
        lastErr = err;
      }
    }

    return NextResponse.json({ success: true, escalations: [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

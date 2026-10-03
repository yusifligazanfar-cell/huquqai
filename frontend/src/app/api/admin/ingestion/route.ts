import { NextResponse } from 'next/server';
import { ingestionWorker } from '@/lib/ingestion/worker';

export async function GET() {
  try {
    const status = ingestionWorker.getStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'batch';
    const batchSize = body.batchSize || 10;
    const startId = body.startId || ingestionWorker.getStatus().currentDocumentId;

    if (action === 'batch') {
      const result = await ingestionWorker.runBatch(startId, batchSize);
      const updatedStatus = ingestionWorker.getStatus();
      return NextResponse.json({ success: true, result, status: updatedStatus });
    }

    return NextResponse.json({ success: false, message: 'Naməlum əməliyyat' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

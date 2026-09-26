import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const cameraId = url.searchParams.get('camera_id') || 'BOP12-CAM04';
    const bopId = url.searchParams.get('bop_id') || 'BOP-12';

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No frame uploaded' }, { status: 400 });
    }

    const mlFormData = new FormData();
    mlFormData.append('file', file);

    const mlTargetUrl = `${ML_SERVICE_URL}/analyze/frame?camera_id=${encodeURIComponent(cameraId)}&bop_id=${encodeURIComponent(bopId)}`;

    const response = await fetch(mlTargetUrl, {
      method: 'POST',
      body: mlFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: `ML Service error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Could not contact ML inference service', details: err.message },
      { status: 502 }
    );
  }
}

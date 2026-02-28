import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  return NextResponse.json({ message: 'Test API working' })
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const body = await request.json()
    return NextResponse.json({
      message: 'POST test successful',
      receivedData: body,
    })
  } catch (error) {
    return NextResponse.json({
      error: 'JSON parse failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Test API working' })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({ 
      message: 'POST test successful',
      receivedData: body,
      headers: Object.fromEntries(request.headers.entries())
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'JSON parse failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Test webhook received:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook received successfully',
      received_data: body,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
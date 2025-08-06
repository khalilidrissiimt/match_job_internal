import { NextResponse } from 'next/server'
import { extractSkills } from '@/lib/ai'

export async function GET() {
  try {
    const testDescription = "We are looking for a React developer with TypeScript experience and knowledge of Node.js"
    const skills = await extractSkills(testDescription)
    
    return NextResponse.json({
      success: true,
      skills,
      message: 'AI integration is working correctly'
    })
  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'AI integration failed'
      },
      { status: 500 }
    )
  }
} 
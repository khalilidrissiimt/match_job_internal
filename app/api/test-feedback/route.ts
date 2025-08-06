import { NextRequest, NextResponse } from 'next/server'
import { analyzeFeedback } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    // Test with feedback that includes a 'raw' field like in the original Python code
    const testFeedback = {
      "raw": "The candidate demonstrates excellent technical skills with strong problem-solving abilities. They communicate clearly and show high confidence throughout the interview. Their motivation is genuine and they align well with our company values. The candidate provides specific examples of their achievements and shows strong leadership potential. Overall, this is an outstanding candidate who would be a valuable addition to our team.",
      "confidence": "The candidate presents themselves with a high level of confidence. Their tone is assertive and they share specific accomplishments with quantifiable impact.",
      "motivation": "The candidate conveys genuine enthusiasm for the role and company mission. They articulate a clear vision for their career goals.",
      "communication": "The candidate communicates exceptionally clearly and concisely. They structure their responses well and articulate complex technical concepts effectively.",
      "final_assessment": "The candidate presents as an outstanding individual with excellent technical skills and a positive, professional attitude. They are highly suitable for the role."
    }

    const result = await analyzeFeedback(testFeedback)

    return NextResponse.json({
      success: true,
      feedback_analysis: result,
      test_feedback: testFeedback
    })

  } catch (error) {
    console.error('Feedback test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
} 
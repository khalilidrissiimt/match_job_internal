import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    googleAiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    pdfcoKey: !!process.env.PDFCO_API_KEY,
  }

  const missingVars = Object.entries(envCheck)
    .filter(([_, exists]) => !exists)
    .map(([key]) => key)

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      ...envCheck
    },
    missingVariables: missingVars,
    message: missingVars.length > 0 
      ? `Missing environment variables: ${missingVars.join(', ')}`
      : 'All required environment variables are set'
  })
} 
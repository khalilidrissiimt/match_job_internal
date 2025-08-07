import { NextRequest, NextResponse } from 'next/server'
import { extractSkills, summarizeSkills, analyzeFeedback } from '@/lib/ai'
import { fetchCandidatesPaginated, matchCandidates } from '@/lib/supabase'
import { generatePDFReport } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_description, extra_notes = '' } = body

    if (!job_description) {
      return NextResponse.json(
        { error: 'job_description is required' },
        { status: 400 }
      )
    }

    // Extract skills from job description
    const jobSkills = await extractSkills(`${job_description}\n\n${extra_notes}`)
    
    if (!jobSkills.length) {
      return NextResponse.json(
        { error: 'No skills could be extracted from the job description' },
        { status: 400 }
      )
    }

    // Fetch candidates and match them
    const candidates = await fetchCandidatesPaginated()
    const matches = matchCandidates(jobSkills, candidates)

    if (!matches.length) {
      return NextResponse.json(
        { error: 'No candidates matched the job requirements' },
        { status: 404 }
      )
    }

    // Process top 10 matches
    const topMatches = matches.slice(0, 10)
    const processedCandidates = []

    for (const match of topMatches) {
      // Analyze feedback
      let feedback = match.feedback
      if (typeof feedback === 'string') {
        try {
          feedback = JSON.parse(feedback)
        } catch {
          feedback = { raw: feedback }
        }
      }

      const feedbackAnalysis = await analyzeFeedback(feedback)
      const skillSummary = await summarizeSkills(match.all_skills)

      processedCandidates.push({
        candidate_name: match.candidate_name,
        match_count: match.match_count,
        matched_skills: match.matched_skills,
        summary: skillSummary,
        feedback_review: feedbackAnalysis,
        transcript: match.transcript,
        feedback: feedback, // Include the feedback data
        email: match.Email, // Include the Email field (mapped to email for PDF)
        cv_resume: match['CV/Resume'] // Include the CV/Resume data with correct property name
      })
    }

    // Generate PDF report
    const pdfBuffer = await generatePDFReport(processedCandidates)
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    return NextResponse.json({
      candidates: processedCandidates,
      pdf_base64: pdfBase64,
      extracted_skills: jobSkills
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
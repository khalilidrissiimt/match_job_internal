import { NextRequest, NextResponse } from 'next/server'
import { extractSkills, summarizeSkills, analyzeFeedback } from '@/lib/ai'
import { generatePDFReport } from '@/lib/pdf-generator'
import { extractTextFromPDF } from '@/lib/pdf-extractor'
import { fetchCandidatesPaginated, matchCandidates } from '@/lib/supabase'
import { fetchPDFContent, extractPDFUrls } from '@/lib/pdf-fetcher'

export async function POST(request: NextRequest) {
  try {
    // Check if it's a multipart form data (PDF file) or JSON
    const contentType = request.headers.get('content-type') || ''
    
    let jobDescription = ''
    let extraNotes = ''
    let uploadedPdfBuffer: Buffer | null = null

    if (contentType.includes('multipart/form-data')) {
      // Handle PDF file upload from n8n
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { error: 'No PDF file provided' },
          { status: 400 }
        )
      }

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      uploadedPdfBuffer = Buffer.from(arrayBuffer)
      
      // Extract text from PDF - convert Buffer to ArrayBuffer
      const extractedText = await extractTextFromPDF(arrayBuffer)
      if (!extractedText) {
        return NextResponse.json(
          { error: 'Failed to extract text from PDF' },
          { status: 400 }
        )
      }
      
      jobDescription = extractedText
      extraNotes = formData.get('extra_notes') as string || ''
      
    } else {
      // Handle JSON payload
      const body = await request.json()
      jobDescription = body.job_description || ''
      extraNotes = body.extra_notes || ''
      
      if (!jobDescription) {
        return NextResponse.json(
          { error: 'job_description is required' },
          { status: 400 }
        )
      }
    }

    // Extract skills from job description
    const jobSkills = await extractSkills(`${jobDescription}\n\n${extraNotes}`)
    
    if (!jobSkills.length) {
      return NextResponse.json(
        { error: 'No skills could be extracted from the job description' },
        { status: 400 }
      )
    }

    // Fetch candidates from Supabase database
    const allCandidates = await fetchCandidatesPaginated()
    
    if (!allCandidates.length) {
      return NextResponse.json(
        { error: 'No candidates found in database' },
        { status: 404 }
      )
    }

    // Match candidates with job skills
    const matches = matchCandidates(jobSkills, allCandidates)
    
    if (!matches.length) {
      return NextResponse.json(
        { error: 'No matching candidates found' },
        { status: 404 }
      )
    }

    // Take top 10 matches
    const topMatches = matches.slice(0, 10)
    
    // Process candidates with AI analysis and fetch resume PDFs
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

      // Ensure we have a valid summary
      const candidateSummary = skillSummary && skillSummary.trim() 
        ? skillSummary 
        : `Professional with skills in ${(match.all_skills || []).slice(0, 5).join(', ')} and additional expertise.`;

      // Extract and fetch PDF content from resume data
      let cvResumePdf: Uint8Array | undefined
      let resumeStatus = 'No resume data'
      
      if (match['CV/Resume']) {
        try {
          const pdfUrls = extractPDFUrls(match['CV/Resume'])
          console.log(`📄 Candidate ${match.candidate_name}: Found ${pdfUrls.length} PDF URLs`)
          
          if (pdfUrls.length > 0) {
            console.log(`🔄 Fetching PDF from: ${pdfUrls[0]}`)
            const pdfContent = await fetchPDFContent(pdfUrls[0])
            if (pdfContent) {
              cvResumePdf = pdfContent
              resumeStatus = `Resume PDF fetched (${pdfContent.length} bytes)`
              console.log(`✅ Resume PDF fetched for ${match.candidate_name}: ${pdfContent.length} bytes`)
            } else {
              resumeStatus = 'Failed to fetch PDF content'
              console.log(`❌ Failed to fetch PDF for ${match.candidate_name}`)
            }
          } else {
            resumeStatus = 'No PDF URLs found in resume data'
            console.log(`⚠️ No PDF URLs found for ${match.candidate_name}`)
          }
        } catch (error) {
          resumeStatus = `PDF fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(`❌ Error fetching PDF for ${match.candidate_name}:`, error)
        }
      } else {
        resumeStatus = 'No resume data in database'
        console.log(`ℹ️ No resume data for ${match.candidate_name}`)
      }
      
      console.log(`📋 ${match.candidate_name}: ${resumeStatus}`)

      processedCandidates.push({
        candidate_name: match.candidate_name,
        match_count: match.match_count,
        matched_skills: match.matched_skills,
        summary: candidateSummary,
        feedback_review: feedbackAnalysis,
        transcript: match.transcript,
        feedback: feedback, // Include the feedback data
        email: match.Email, // Include the Email field (mapped to email for PDF)
        cv_resume: match['CV/Resume'], // Include the CV/Resume data with correct property name
        cv_resume_pdf: cvResumePdf // Include the actual PDF content
      })
    }

    // Generate PDF report with embedded resumes
    console.log('🔄 Generating PDF report for webhook with embedded resumes...')
    
    // Log summary of resume status
    const candidatesWithResumes = processedCandidates.filter(c => c.cv_resume_pdf)
    const candidatesWithoutResumes = processedCandidates.filter(c => !c.cv_resume_pdf)
    
    console.log(`📊 Resume Summary:`)
    console.log(`   ✅ Candidates with resumes: ${candidatesWithResumes.length}`)
    console.log(`   ❌ Candidates without resumes: ${candidatesWithoutResumes.length}`)
    console.log(`   📄 Total candidates: ${processedCandidates.length}`)
    
    if (candidatesWithResumes.length > 0) {
      console.log(`   📋 Candidates with resumes: ${candidatesWithResumes.map(c => c.candidate_name).join(', ')}`)
    }
    if (candidatesWithoutResumes.length > 0) {
      console.log(`   📋 Candidates without resumes: ${candidatesWithoutResumes.map(c => c.candidate_name).join(', ')}`)
    }
    
    // Generate individual PDFs for each candidate
    const candidatePDFs = []
    
    for (const candidate of processedCandidates) {
      try {
        const pdfBuffer = await generatePDFReport([candidate]) // Pass single candidate
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
        
        candidatePDFs.push({
          candidate_name: candidate.candidate_name,
          pdf_base64: pdfBase64,
          match_count: candidate.match_count,
          matched_skills: candidate.matched_skills
        })
        
        console.log(`✅ Generated PDF for ${candidate.candidate_name}`)
      } catch (error) {
        console.error(`❌ Failed to generate PDF for ${candidate.candidate_name}:`, error)
        candidatePDFs.push({
          candidate_name: candidate.candidate_name,
          pdf_base64: null,
          error: 'PDF generation failed',
          match_count: candidate.match_count,
          matched_skills: candidate.matched_skills
        })
      }
    }

    console.log('✅ All candidate PDFs generated successfully for webhook')

    // Prepare response data
    const responseData = {
      success: true,
      candidates: processedCandidates,
      candidate_pdfs: candidatePDFs,
      extracted_skills: jobSkills,
      processed_at: new Date().toISOString(),
      total_candidates_found: allCandidates.length,
      matching_candidates_count: matches.length,
      top_candidates_returned: processedCandidates.length
    }

    // Send response back to n8n webhook
    try {
      const n8nResponse = await fetch('https://kkii.app.n8n.cloud/webhook-test/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      })

      if (!n8nResponse.ok) {
        console.error('Failed to send response to n8n:', n8nResponse.status)
      }
    } catch (n8nError) {
      console.error('Error sending to n8n:', n8nError)
      // Don't fail the request if n8n is unreachable
    }

    // Return the response data
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Webhook API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 
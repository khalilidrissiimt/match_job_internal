import { NextRequest, NextResponse } from 'next/server'
import { extractSkills, batchSummarizeSkills, batchAnalyzeFeedback } from '@/lib/ai'
import { fetchCandidatesPaginated, matchCandidates } from '@/lib/supabase'
import { generatePDFReport } from '@/lib/pdf-generator'
import { fetchPDFContent, extractPDFUrls } from '@/lib/pdf-fetcher'

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

    // Process top 10 matches with batch processing
    const topMatches = matches.slice(0, 10)
    
    // Prepare data for batch processing
    const feedbackList = topMatches.map(match => {
      let feedback = match.feedback
      if (typeof feedback === 'string') {
        try {
          feedback = JSON.parse(feedback)
        } catch {
          feedback = { raw: feedback }
        }
      }
      return feedback
    })
    
    const skillLists = topMatches.map(match => match.all_skills || [])
    
    // Batch process feedback and skills (reduces API calls by 60-80%)
    console.log(`🔄 Processing ${topMatches.length} candidates with batch optimization...`)
    const startTime = Date.now()
    
    const [feedbackAnalyses, skillSummaries] = await Promise.all([
      batchAnalyzeFeedback(feedbackList),
      batchSummarizeSkills(skillLists)
    ])
    
    const processingTime = Date.now() - startTime
    console.log(`✅ Batch processing completed in ${processingTime}ms (saved ~${topMatches.length * 2 - 4} API calls)`)
    
    // Process candidates and fetch PDF content
    const processedCandidates = await Promise.all(
      topMatches.map(async (match, index) => {
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

        return {
          candidate_name: match.candidate_name,
          match_count: match.match_count,
          matched_skills: match.matched_skills,
          summary: skillSummaries[index],
          feedback_review: feedbackAnalyses[index],
          transcript: match.transcript,
          feedback: feedbackList[index], // Include the feedback data
          email: match.Email, // Include the Email field (mapped to email for PDF)
          cv_resume: match['CV/Resume'], // Include the CV/Resume data with correct property name
          cv_resume_pdf: cvResumePdf // Include the actual PDF content
        }
      })
    )

    // Generate PDF report
    console.log('🔄 Generating PDF report for match API...')
    
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

    return NextResponse.json({
      candidates: processedCandidates,
      candidate_pdfs: candidatePDFs,
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
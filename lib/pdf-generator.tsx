import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import path from 'path'

export interface PDFCandidate {
  candidate_name: string
  match_count: number
  matched_skills: string[]
  summary: string
  feedback_review: string
  transcript: string
  feedback?: any // Add feedback field for JSONB data
  email?: string // Add email field
  cv_resume?: string // Add CV/Resume field
  cv_resume_pdf?: Uint8Array // Add actual PDF content
}

// Register fonts for better Unicode support
Font.register({
  family: 'Amiri',
  src: path.join(process.cwd(), 'fonts', 'Amiri-Regular.ttf'),
})

// Use Helvetica font (built-in, reliable) for English text
Font.register({
  family: 'Helvetica',
  src: 'Helvetica',
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fafafa',
    padding: 40,
    fontSize: 10,
  },
  header: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  candidateSection: {
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 25,
    shadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1 solid #e8e8e8',
  },
  candidateName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: 'Helvetica',
    color: '#2c3e50',
    borderBottom: '2 solid #3498db',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Helvetica',
    color: '#34495e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 10,
    marginBottom: 6,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
    color: '#2c3e50',
  },
  arabicText: {
    fontSize: 10,
    marginBottom: 6,
    fontFamily: 'Amiri',
    lineHeight: 1.5,
    textAlign: 'right',
    color: '#2c3e50',
  },
  skillsList: {
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  skill: {
    fontSize: 9,
    marginBottom: 4,
    fontFamily: 'Helvetica',
    color: '#495057',
    paddingLeft: 8,
  },
  email: {
    fontSize: 10,
    marginTop: 12,
    fontFamily: 'Helvetica',
    color: '#3498db',
    fontWeight: 'bold',
  },
  feedbackSection: {
    marginTop: 15,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 6,
  },
  feedbackItem: {
    fontSize: 9,
    marginBottom: 12,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    border: '1 solid #e9ecef',
  },
  matchScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#27ae60',
    backgroundColor: '#d5f4e6',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
    marginBottom: 15,
  },
  summaryBox: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 6,
    border: '1 solid #bee5eb',
    marginBottom: 15,
  },
  analysisBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    border: '1 solid #ffeaa7',
    marginBottom: 15,
  },
  transcriptBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    border: '1 solid #e9ecef',
    marginBottom: 15,
  },
  feedbackHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    fontFamily: 'Helvetica',
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
})

// Helper function to detect Arabic text
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

// Helper function to format feedback with proper structure
function formatFeedback(feedback: any): string {
  if (!feedback) return 'No feedback available'
  
  if (typeof feedback === 'string') {
    return feedback
  }
  
  if (typeof feedback === 'object') {
    try {
      return Object.entries(feedback)
        .map(([key, value]) => {
          // Format the key to be more readable
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `${formattedKey}:\n${value}`
        })
        .join('\n\n')
    } catch (error) {
      return JSON.stringify(feedback)
    }
  }
  
  return String(feedback)
}

// Helper function to truncate text (only for very long texts to prevent PDF overflow)
function truncateText(text: string, maxLength: number = 10000): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '... (truncated due to length)'
}

// Helper function to wrap long text for PDF
function wrapTextForPDF(text: string, maxWidth: number = 80): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + ' ' + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}



// Create PDF Document component
function PDFDocumentComponent({ candidates }: { candidates: PDFCandidate[] }) {
  // Debug logging for missing data
  candidates.forEach((candidate, index) => {
    if (!candidate.summary || !candidate.summary.trim()) {
      console.warn(`⚠️ Candidate ${index + 1} (${candidate.candidate_name}) has no summary:`, {
        summary: candidate.summary,
        hasSummary: !!candidate.summary,
        summaryLength: candidate.summary?.length || 0
      });
    }
    
    if (!candidate.transcript || !candidate.transcript.trim()) {
      console.warn(`⚠️ Candidate ${index + 1} (${candidate.candidate_name}) has no transcript:`, {
        transcript: candidate.transcript,
        hasTranscript: !!candidate.transcript,
        transcriptLength: candidate.transcript?.length || 0
      });
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.header}>Candidate Matching Report</Text>
          
          {candidates.map((candidate, index) => (
            <View key={index} style={styles.candidateSection}>
                             <Text style={styles.candidateName}>
                 Candidate {index + 1}: {candidate.candidate_name}
               </Text>
               
               
               
                              <Text style={styles.sectionTitle}>Match Score</Text>
               <View style={styles.matchScore}>
                 <Text style={[styles.text, { color: '#27ae60', fontWeight: 'bold' }]}>
                   Matched {candidate.match_count} skills
                 </Text>
               </View>
              
              <Text style={styles.sectionTitle}>Matched Skills</Text>
              <View style={styles.skillsList}>
                {candidate.matched_skills.map((skill, skillIndex) => (
                  <Text key={skillIndex} style={styles.skill}>
                    • {skill}
                  </Text>
                ))}
              </View>
              
                             <Text style={styles.sectionTitle}>Summary</Text>
               <View style={styles.summaryBox}>
                 <Text style={styles.text}>
                   {candidate.summary && candidate.summary.trim() ? candidate.summary : 'Skill summary not available - please check candidate data'}
                 </Text>
               </View>
              
                             <Text style={styles.sectionTitle}>Feedback Analysis</Text>
               <View style={styles.analysisBox}>
                 <Text style={styles.text}>
                   {candidate.feedback_review || 'No analysis available'}
                 </Text>
               </View>
              
              <Text style={styles.sectionTitle}>Feedback</Text>
              <View style={styles.feedbackSection}>
                {formatFeedback(candidate.feedback).split('\n\n').map((section, sectionIndex) => {
                  if (!section.trim()) return null;
                  
                  const lines = section.split('\n');
                  const title = lines[0];
                  const content = lines.slice(1).join('\n');
                  
                                     return (
                     <View key={sectionIndex} style={styles.feedbackItem}>
                       <Text style={styles.feedbackHeader}>
                         {title}
                       </Text>
                       <Text style={[styles.text, { fontSize: 9 }]}>
                         {wrapTextForPDF(content, 70)}
                       </Text>
                     </View>
                   );
                })}
              </View>
              
                             <Text style={styles.sectionTitle}>Interview Transcript</Text>
               <View style={styles.transcriptBox}>
                 <Text style={containsArabic(candidate.transcript) ? styles.arabicText : styles.text}>
                   {candidate.transcript && candidate.transcript.trim() 
                     ? wrapTextForPDF(candidate.transcript, 70)
                     : 'No transcript available for this candidate.'
                   }
                 </Text>
               </View>
              
              {candidate.email && (
                <>
                  <Text style={styles.sectionTitle}>Email</Text>
                  <Text style={styles.email}>{candidate.email}</Text>
                </>
              )}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export async function generatePDFReport(candidates: PDFCandidate[]): Promise<Uint8Array> {
  try {
    console.log('Generating PDF with candidate information and embedded resumes...')
    console.log(`📊 Processing ${candidates.length} candidates`)
    
    // Log candidate data for debugging
    candidates.forEach((candidate, index) => {
      console.log(`📋 Candidate ${index + 1} (${candidate.candidate_name}):`, {
        hasSummary: !!candidate.summary,
        summaryLength: candidate.summary?.length || 0,
        hasTranscript: !!candidate.transcript,
        transcriptLength: candidate.transcript?.length || 0,
        hasFeedback: !!candidate.feedback,
        hasResume: !!candidate.cv_resume_pdf,
        resumeSize: candidate.cv_resume_pdf?.length || 0
      });
    });
    
    // Import PDF-lib for merging
    const { PDFDocument } = await import('pdf-lib')
    
    // Create a new PDF document
    const finalPdf = await PDFDocument.create()
    
    // Process each candidate individually
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      
      // Generate candidate information PDF
      const candidateInfoBuffer = await generateCandidateInfoPDF([candidate])
      
      // Add candidate information pages
      const candidateInfoPdf = await PDFDocument.load(candidateInfoBuffer)
      const candidateInfoPages = await finalPdf.copyPages(candidateInfoPdf, candidateInfoPdf.getPageIndices())
      candidateInfoPages.forEach((page: any) => finalPdf.addPage(page))
      
      // If candidate has resume, add it immediately after their information
      if (candidate.cv_resume_pdf) {
        try {
          const resumePdf = await PDFDocument.load(candidate.cv_resume_pdf)
          const resumePages = await finalPdf.copyPages(resumePdf, resumePdf.getPageIndices())
          
          // Add a separator page with candidate name
          const separatorPage = finalPdf.addPage()
          const { width, height } = separatorPage.getSize()
          
          separatorPage.drawText(`Resume for Candidate: ${candidate.candidate_name}`, {
            x: 50,
            y: height - 100,
            size: 16,
          })
          
          // Add the resume pages
          resumePages.forEach((page: any) => finalPdf.addPage(page))
          
        } catch (error) {
          console.warn(`Failed to merge resume for ${candidate.candidate_name}:`, error)
        }
      }
    }
    
    console.log('PDF generated successfully with embedded resumes')
    return new Uint8Array(await finalPdf.save())
    
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Helper function to generate PDF for a single candidate
async function generateCandidateInfoPDF(candidates: PDFCandidate[]): Promise<Uint8Array> {
  try {
    // Import renderToBuffer dynamically to avoid SSR issues
    const { renderToBuffer } = await import('@react-pdf/renderer')
    
    // Create the candidate information PDF
    const candidateInfoBuffer = await renderToBuffer(
      <PDFDocumentComponent candidates={candidates} />
    )
    
    return new Uint8Array(candidateInfoBuffer)
    
  } catch (error) {
    console.error('Error generating candidate info PDF:', error)
    throw error
  }
} 
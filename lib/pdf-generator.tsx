import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
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
}

// Register fonts for better Unicode support
Font.register({
  family: 'Amiri',
  src: path.join(process.cwd(), 'fonts', 'Amiri-Regular.ttf'),
})

Font.register({
  family: 'Helvetica',
  src: 'Helvetica',
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 10,
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
  },
  candidateSection: {
    marginBottom: 20,
    borderBottom: '1 solid #ccc',
    paddingBottom: 15,
  },
  candidateName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Helvetica',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    fontFamily: 'Helvetica',
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  arabicText: {
    fontSize: 10,
    marginBottom: 5,
    fontFamily: 'Amiri',
    lineHeight: 1.4,
    textAlign: 'right',
  },
  skillsList: {
    marginBottom: 10,
  },
  skill: {
    fontSize: 9,
    marginBottom: 2,
    fontFamily: 'Helvetica',
  },
  email: {
    fontSize: 10,
    marginTop: 10,
    fontFamily: 'Helvetica',
    color: '#0066cc',
  },
})

// Helper function to detect Arabic text
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

// Helper function to format feedback
function formatFeedback(feedback: any): string {
  if (!feedback) return 'No feedback available'
  
  if (typeof feedback === 'string') {
    return feedback
  }
  
  if (typeof feedback === 'object') {
    try {
      return Object.entries(feedback)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ')
    } catch (error) {
      return JSON.stringify(feedback)
    }
  }
  
  return String(feedback)
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 1000): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '... (truncated)'
}

// Create PDF Document component
function PDFDocumentComponent({ candidates }: { candidates: PDFCandidate[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.header}>Candidate Matching Report</Text>
          
          {candidates.map((candidate, index) => (
            <View key={index} style={styles.candidateSection}>
              <Text style={styles.candidateName}>
                {candidate.candidate_name}
              </Text>
              
              <Text style={styles.sectionTitle}>Match Score</Text>
              <Text style={styles.text}>
                Matched {candidate.match_count} skills
              </Text>
              
              <Text style={styles.sectionTitle}>Matched Skills</Text>
              <View style={styles.skillsList}>
                {candidate.matched_skills.map((skill, skillIndex) => (
                  <Text key={skillIndex} style={styles.skill}>
                    • {skill}
                  </Text>
                ))}
              </View>
              
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.text}>
                {candidate.summary || 'No summary available'}
              </Text>
              
              <Text style={styles.sectionTitle}>Feedback Analysis</Text>
              <Text style={styles.text}>
                {candidate.feedback_review || 'No analysis available'}
              </Text>
              
              <Text style={styles.sectionTitle}>Feedback</Text>
              <Text style={containsArabic(formatFeedback(candidate.feedback)) ? styles.arabicText : styles.text}>
                {formatFeedback(candidate.feedback)}
              </Text>
              
              <Text style={styles.sectionTitle}>Interview Transcript</Text>
              <Text style={containsArabic(candidate.transcript) ? styles.arabicText : styles.text}>
                {truncateText(candidate.transcript || 'No transcript available', 1500)}
              </Text>
              
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
    console.log('Generating PDF with @react-pdf/renderer (supports Arabic, English, Unicode, and emojis)...')
    
    // Import renderToBuffer dynamically to avoid SSR issues
    const { renderToBuffer } = await import('@react-pdf/renderer')
    
    // Create the PDF document using JSX
    const pdfBuffer = await renderToBuffer(
      <PDFDocumentComponent candidates={candidates} />
    )
    
    console.log('PDF generated successfully with @react-pdf/renderer')
    return new Uint8Array(pdfBuffer)
    
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
} 
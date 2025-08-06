import puppeteer from 'puppeteer-core'
import chromium from 'chrome-aws-lambda'

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

// Function to detect if text contains Arabic characters
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

// Function to sanitize text for PDF generation - keep Arabic text
function sanitizeTextForPDF(text: string): string {
  return text
    .replace(/\r\n/g, ' ') // Replace Windows line breaks
    .replace(/\n/g, ' ') // Replace Unix line breaks
    .replace(/\r/g, ' ') // Replace carriage returns
    .replace(/\t/g, ' ') // Replace tabs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// Function to format feedback JSONB data for PDF
function formatFeedbackForPDF(feedback: any): string {
  if (!feedback) return 'No feedback available'
  
  if (typeof feedback === 'string') {
    // Try to parse as JSON if it's a string
    try {
      const parsed = JSON.parse(feedback)
      if (typeof parsed === 'object' && parsed !== null) {
        feedback = parsed
      } else {
        return feedback
      }
    } catch {
      return feedback
    }
  }
  
  if (typeof feedback === 'object' && feedback !== null) {
    const lines: string[] = []
    for (const [key, value] of Object.entries(feedback)) {
      // Format the key to be more readable (capitalize and replace underscores)
      const formattedKey = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Add the key-value pair on a new line
      lines.push(`${formattedKey}: ${value}`)
    }
    return lines.join('\n')
  }
  
  return JSON.stringify(feedback, null, 2)
}

// Function to format transcript for PDF with proper formatting
function formatTranscriptForPDF(transcript: string): string {
  if (!transcript) return 'Not available'

  // Replace assistant: with Question: and user: with Answer:
  let formattedTranscript = transcript
    .replace(/assistant:\s*/gi, 'Question: ')
    .replace(/user:\s*/gi, 'Answer: ')

  // Split by common transcript patterns
  const lines = formattedTranscript.split(/(?=Question:|Answer:|Interviewer:|Candidate:)/)

  if (lines.length > 1) {
    // Filter out empty lines and format each line properly
    const formattedLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Ensure each line starts with the proper prefix
        if (line.startsWith('Question:') || line.startsWith('Answer:')) {
          return line
        } else if (line.includes('Question:')) {
          return line.replace(/^.*?(Question:)/, '$1')
        } else if (line.includes('Answer:')) {
          return line.replace(/^.*?(Answer:)/, '$1')
        }
        return line
      })
    
    return formattedLines.join('\n')
  }

  return formattedTranscript
}

// Function to transliterate Arabic text to Latin characters (basic mapping)
function transliterateArabic(text: string): string {
  // Return the text as is - we want to display actual Arabic text
  return text
}

// Function to convert Arabic text to a displayable format
function convertArabicToDisplayable(text: string): string {
  if (!text) return text
  
  // Return the text as is - we want to display actual Arabic text
  return text
}

// Function to transliterate Arabic text in transcript
function transliterateTranscript(transcript: string): string {
  if (!transcript) return transcript
  
  // Return the transcript as is - we want to display actual Arabic text
  return transcript
}

// Function to create HTML content for PDF
function createHTMLContent(candidates: PDFCandidate[]): string {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 40px;
          background-color: #f8f9fb;
          color: #2f3542;
        }
        .candidate {
          background: #ffffff;
          margin-bottom: 40px;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #e0e0e0;
          page-break-inside: avoid;
        }
        .candidate-header {
          background: linear-gradient(135deg, #3c8dbc, #5e60ce);
          color: white;
          padding: 24px 30px;
        }
        .candidate-title {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        .candidate-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .info-item {
          background-color: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 13px;
        }
        .candidate-content {
          padding: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e2a38;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .skill-tag {
          background-color: #e3e9f0;
          color: #1f2937;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 20px;
        }
        .summary-box {
          background: #34495e;
          color: white;
          padding: 25px;
          border-radius: 6px;
          border: none;
        }
        .summary-box .content {
          color: white;
          font-weight: 400;
        }
        .feedback-review-box {
          background: #ecf0f1;
          color: #2c3e50;
          padding: 25px;
          border-radius: 6px;
          border-left: 4px solid #34495e;
        }
        .feedback-review-box .content {
          color: #2c3e50;
          font-weight: 400;
        }
        .content {
          font-size: 14px;
          line-height: 1.6;
        }
        .feedback {
          margin-top: 10px;
        }
        .feedback-item {
          background: #f9fafa;
          border: 1px solid #dfe4ea;
          border-left: 4px solid #5e60ce;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .feedback-key {
          font-weight: 600;
          margin-bottom: 6px;
          color: #2f3542;
          font-size: 14px;
        }
        .feedback-value {
          font-size: 13px;
          color: #4f5d75;
        }
        .transcript {
          background-color: #f4f4f4;
          border: 1px solid #ddd;
          font-family: monospace;
          font-size: 13px;
          padding: 16px;
          border-radius: 6px;
          white-space: pre-line;
          color: #2c3e50;
        }
        .section-icon {
          font-size: 16px;
        }
        @media print {
          body { background-color: white; padding: 0; }
          .candidate { box-shadow: none; border: 1px solid #ccc; }
        }
      </style>
    </head>
    <body>
  `

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const formattedTranscript = formatTranscriptForPDF(candidate.transcript)
    const sanitizedTranscript = transliterateTranscript(formattedTranscript)
    const formattedFeedback = formatFeedbackForPDF(candidate.feedback)
    const feedbackLines = formattedFeedback.split('\n')

    html += `
      <div class="candidate">
        <div class="candidate-header">
          <div class="candidate-title">Candidate ${i + 1}: ${candidate.candidate_name}</div>
          <div class="candidate-info">
            ${candidate.email ? `<div class="info-item">📧 ${candidate.email}</div>` : ''}
            <div class="info-item">✅ Match Count: ${candidate.match_count}</div>
          </div>
        </div>

        <div class="candidate-content">
          <div class="section">
            <div class="section-title"><span class="section-icon">🧠</span> Matched Skills</div>
            <div class="skills-container">
              ${candidate.matched_skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>

          <div class="section">
            <div class="section-title"><span class="section-icon">📄</span> Skill Summary</div>
            <div class="summary-box">
              <div class="content">${sanitizeTextForPDF(candidate.summary)}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title"><span class="section-icon">🧠</span> Feedback Review</div>
            <div class="feedback-review-box">
              <div class="content">${sanitizeTextForPDF(candidate.feedback_review)}</div>
            </div>
          </div>
    `

    if (candidate.feedback) {
      html += `
        <div class="section">
          <div class="section-title"><span class="section-icon">📝</span> Feedback Assessment</div>
          <div class="feedback">
      `
      feedbackLines.forEach(line => {
        if (line.trim()) {
          const colonIndex = line.indexOf(':')
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim()
            const value = line.substring(colonIndex + 1).trim()
            html += `
              <div class="feedback-item">
                <div class="feedback-key">${key}</div>
                <div class="feedback-value">${value}</div>
              </div>
            `
          } else {
            html += `<div class="feedback-item"><div class="feedback-value">${line}</div></div>`
          }
        }
      })
      html += `
          </div>
        </div>
      `
    }

    html += `
        <div class="section">
          <div class="section-title"><span class="section-icon">💬</span> Transcript</div>
          <div class="transcript">${sanitizedTranscript}</div>
        </div>
      </div>
    </div>
    `
  }

  html += `
    </body>
    </html>
  `

  return html
}


export async function generatePDFReport(candidates: PDFCandidate[]): Promise<Uint8Array> {
  let browser
  
  try {
    // Check if running in serverless environment (Vercel)
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    
    if (isServerless) {
      // Configure browser for serverless environment using chrome-aws-lambda
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      })
    } else {
      // Use full puppeteer for local development
      const puppeteerFull = await import('puppeteer')
      browser = await puppeteerFull.default.launch({
        headless: true,
      })
    }
    
    const page = await browser.newPage()
    
    // Set content with proper UTF-8 encoding
    const htmlContent = createHTMLContent(candidates)
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    // Generate PDF with proper settings
    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })
    
    await browser.close()
    
    return new Uint8Array(pdfBuffer)
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    throw error
  }
} 
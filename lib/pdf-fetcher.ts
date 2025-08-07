// Helper function to fetch PDF content from URL or storage
export async function fetchPDFContent(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`Fetching PDF from: ${url}`)
    
    // Handle different URL types
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Fetch from external URL with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PDF-Fetcher/1.0)'
          }
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          console.warn(`Failed to fetch PDF from ${url}: ${response.status} ${response.statusText}`)
          return null
        }
        
        const contentType = response.headers.get('content-type')
        if (contentType && !contentType.includes('application/pdf') && !contentType.includes('octet-stream')) {
          console.warn(`Warning: Content-Type is not PDF: ${contentType}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const pdfData = new Uint8Array(arrayBuffer)
        
        // Basic PDF validation (check for PDF header)
        if (pdfData.length >= 4 && 
            pdfData[0] === 0x25 && pdfData[1] === 0x50 && 
            pdfData[2] === 0x44 && pdfData[3] === 0x46) {
          console.log(`✅ Valid PDF fetched: ${pdfData.length} bytes`)
          return pdfData
        } else {
          console.warn(`⚠️ Invalid PDF format or corrupted data from ${url}`)
          return null
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`⏰ Timeout fetching PDF from ${url}`)
        } else {
          console.error(`❌ Network error fetching PDF from ${url}:`, fetchError)
        }
        return null
      }
      
    } else if (url.startsWith('data:application/pdf;base64,')) {
      // Handle base64 encoded PDF
      try {
        const base64Data = url.split(',')[1]
        const pdfData = new Uint8Array(Buffer.from(base64Data, 'base64'))
        
        // Basic PDF validation
        if (pdfData.length >= 4 && 
            pdfData[0] === 0x25 && pdfData[1] === 0x50 && 
            pdfData[2] === 0x44 && pdfData[3] === 0x46) {
          console.log(`✅ Valid base64 PDF: ${pdfData.length} bytes`)
          return pdfData
        } else {
          console.warn(`⚠️ Invalid base64 PDF format`)
          return null
        }
      } catch (base64Error) {
        console.error(`❌ Error decoding base64 PDF:`, base64Error)
        return null
      }
      
    } else {
      // Handle local file path (if applicable)
      console.warn(`⚠️ Unsupported PDF URL format: ${url}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Unexpected error fetching PDF from ${url}:`, error)
    return null
  }
}

// Helper function to extract PDF URLs from resume data
export function extractPDFUrls(resumeData: any): string[] {
  const urls: string[] = []
  
  if (typeof resumeData === 'string') {
    // Look for URLs in the string
    const urlRegex = /(https?:\/\/[^\s]+\.pdf)|(data:application\/pdf;base64,[^\s]+)/g
    const matches = resumeData.match(urlRegex)
    if (matches) {
      urls.push(...matches)
    }
  } else if (typeof resumeData === 'object' && resumeData !== null) {
    // Recursively search for URLs in object
    const searchForUrls = (obj: any) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const urlRegex = /(https?:\/\/[^\s]+\.pdf)|(data:application\/pdf;base64,[^\s]+)/g
          const matches = value.match(urlRegex)
          if (matches) {
            urls.push(...matches)
          }
        } else if (typeof value === 'object' && value !== null) {
          searchForUrls(value)
        }
      }
    }
    searchForUrls(resumeData)
  }
  
  return Array.from(new Set(urls)) // Remove duplicates
} 
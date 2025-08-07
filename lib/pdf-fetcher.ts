// Helper function to fetch PDF content from URL or storage
export async function fetchPDFContent(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`Fetching PDF from: ${url}`)
    
    // Handle different URL types
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Fetch from external URL
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`Failed to fetch PDF from ${url}: ${response.status}`)
        return null
      }
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } else if (url.startsWith('data:application/pdf;base64,')) {
      // Handle base64 encoded PDF
      const base64Data = url.split(',')[1]
      return new Uint8Array(Buffer.from(base64Data, 'base64'))
    } else {
      // Handle local file path (if applicable)
      console.warn(`Unsupported PDF URL format: ${url}`)
      return null
    }
  } catch (error) {
    console.error(`Error fetching PDF from ${url}:`, error)
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
export async function extractTextFromPDF(fileBytes: ArrayBuffer): Promise<string | null> {
  try {
    const pdfcoApiKey = process.env.PDFCO_API_KEY
    if (!pdfcoApiKey) {
      throw new Error('PDFCO_API_KEY not configured')
    }

    // Upload the file
    const uploadUrl = 'https://api.pdf.co/v1/file/upload'
    const uploadFormData = new FormData()
    uploadFormData.append('file', new Blob([fileBytes]), 'resume.pdf')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-api-key': pdfcoApiKey,
      },
      body: uploadFormData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    const uploadResult = await uploadResponse.json()
    const uploadedUrl = uploadResult.url

    if (!uploadedUrl) {
      throw new Error('No upload URL received')
    }

    // Convert PDF to text
    const convertUrl = 'https://api.pdf.co/v1/pdf/convert/to/text'
    const convertResponse = await fetch(convertUrl, {
      method: 'POST',
      headers: {
        'x-api-key': pdfcoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: uploadedUrl,
        async: false,
      }),
    })

    if (!convertResponse.ok) {
      throw new Error(`Conversion failed: ${convertResponse.statusText}`)
    }

    const convertResult = await convertResponse.json()
    const textUrl = convertResult.url

    if (!textUrl) {
      throw new Error('No text URL received')
    }

    // Download the text
    const textResponse = await fetch(textUrl)
    if (!textResponse.ok) {
      throw new Error(`Text download failed: ${textResponse.statusText}`)
    }

    return await textResponse.text()
  } catch (error) {
    console.error('PDF extraction error:', error)
    return null
  }
} 
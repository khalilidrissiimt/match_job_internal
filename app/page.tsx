'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Download, Users, Target, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface Candidate {
  candidate_name: string
  match_count: number
  matched_skills: string[]
  summary: string
  feedback_review: string
  transcript: string
  email: string
  cv_resume?: string
}

interface MatchResult {
  candidates: Candidate[]
  pdf_base64: string
  extracted_skills: string[]
}

export default function Home() {
  const [jobDescription, setJobDescription] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0 && inputMode === 'upload') {
        const file = acceptedFiles[0]
        const text = await extractTextFromPDF(file)
        if (text) {
          setJobDescription(text)
          setError('')
        } else {
          setError('Failed to extract text from PDF. Please try again or switch to manual input.')
        }
      }
    }
  })

  const extractTextFromPDF = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('PDF extraction failed')
      }
      
      const data = await response.json()
      return data.text
    } catch (error) {
      console.error('PDF extraction error:', error)
      return null
    }
  }

  const handleInputModeChange = (mode: 'upload' | 'manual') => {
    setInputMode(mode)
    setJobDescription('')
    setError('')
  }

  const handleMatch = async () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: jobDescription,
          extra_notes: extraNotes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to match candidates')
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = () => {
    if (!result?.pdf_base64) return
    
    const pdfBlob = new Blob(
      [Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0))],
      { type: 'application/pdf' }
    )
    
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'matched_candidates.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getFeedbackIcon = (feedback: string) => {
    if (feedback.includes('✅') || feedback.includes('[SUITABLE]')) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (feedback.includes('⚠️') || feedback.includes('[WARNING]')) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    if (feedback.includes('❌') || feedback.includes('[NOT SUITABLE]')) return <XCircle className="w-4 h-4 text-red-500" />
    return null
  }

  const PDFViewer = ({ pdfData, candidateName }: { pdfData?: string; candidateName: string }) => {
    if (!pdfData) {
      return (
        <div className="w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No CV/Resume available</p>
          </div>
        </div>
      )
    }

    let pdfSrc: string

    // Determine the PDF source based on the data type
    if (pdfData.startsWith('data:application/pdf;base64,')) {
      // Already a data URL
      pdfSrc = pdfData
    } else if (pdfData.startsWith('http')) {
      // External URL (like Supabase signed URL) - proxy it
      pdfSrc = `/api/proxy-pdf?url=${encodeURIComponent(pdfData)}`
    } else {
      // Assume it's base64 data without the data URL prefix
      pdfSrc = `data:application/pdf;base64,${pdfData}`
    }

    return (
      <div className="w-full h-64 border border-gray-300 rounded-lg overflow-hidden">
        <iframe
          src={pdfSrc}
          title={`${candidateName} CV/Resume`}
          className="w-full h-full"
          style={{ border: 'none' }}
          onError={() => {
            console.error('PDF loading error for candidate:', candidateName)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center space-x-4 mb-4">
            <a
              href="/email-collector"
              className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Collector
            </a>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📄 Resume-Candidate Matcher
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered candidate matching with feedback analysis and PDF reports
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            📄 Provide Job Description
          </h2>

          {/* Input Mode Selection */}
          <div className="mb-6">
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inputMode"
                  value="upload"
                  checked={inputMode === 'upload'}
                  onChange={() => handleInputModeChange('upload')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Upload PDF File</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inputMode"
                  value="manual"
                  checked={inputMode === 'manual'}
                  onChange={() => handleInputModeChange('manual')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Type Manually</span>
              </label>
            </div>
          </div>

          {/* File Upload - Only shown when upload mode is selected */}
          {inputMode === 'upload' && (
            <div className="mb-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-600 mb-2">
                  {isDragActive
                    ? 'Drop the PDF here...'
                    : 'Drag & drop a PDF resume, or click to select'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF files only
                </p>
              </div>
              {jobDescription && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    ✅ PDF content extracted successfully! ({jobDescription.length} characters)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Input - Only shown when manual mode is selected */}
          {inputMode === 'manual' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste or type job description text:
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Extra Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Add optional extra job info:
            </label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Additional requirements, preferences, or notes..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleMatch}
            disabled={isLoading || !jobDescription.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Target className="w-5 h-5 mr-2" />
                ✅ Match Candidates
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                🏆 Top Matching Candidates
              </h2>
              <button
                onClick={downloadPDF}
                className="bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                📥 Download PDF Report
              </button>
            </div>

            {/* Extracted Skills */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🧾 Extracted Skills:
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.extracted_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-6">
              {result.candidates.map((candidate, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {index + 1}. {candidate.candidate_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Match Count: <span className="font-semibold ml-1">{candidate.match_count}</span>
                        </span>
                      </div>
                    </div>
                    {getFeedbackIcon(candidate.feedback_review)}
                  </div>

                  {/* Main Content - Split Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Candidate Info */}
                    <div className="space-y-4">
                      {/* Matched Skills */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          ✅ Matched Skills:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {candidate.matched_skills.map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Skill Summary */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          📋 Skill Summary:
                        </h4>
                        <p className="text-gray-600 text-sm">{candidate.summary}</p>
                      </div>

                      {/* Feedback Review */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          🧠 Feedback Review:
                        </h4>
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                          <p className="text-gray-700 text-sm">{candidate.feedback_review}</p>
                        </div>
                      </div>

                      {/* Transcript Preview */}
                      {candidate.transcript && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">
                            📝 Transcript Preview:
                          </h4>
                          <p className="text-gray-600 text-sm line-clamp-3">
                            {candidate.transcript.length > 200
                              ? `${candidate.transcript.substring(0, 200)}...`
                              : candidate.transcript}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column - CV/Resume */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        📄 CV/Resume:
                      </h4>
                      <PDFViewer 
                        pdfData={candidate.cv_resume} 
                        candidateName={candidate.candidate_name} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
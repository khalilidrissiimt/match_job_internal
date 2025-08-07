import { createClient } from '@supabase/supabase-js'

// Validate environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'

// Create Supabase client with fallback values
export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Candidate {
  id: string
  candidate_name: string
  skills: string
  feedback: any
  transcript: string
  Email: string
  'CV/Resume'?: string // CV/Resume PDF data (base64 or URL)
}

export interface MatchedCandidate {
  candidate_name: string
  match_count: number
  matched_skills: string[]
  feedback: any
  all_skills: string[]
  transcript: string
  Email: string
  'CV/Resume'?: string // CV/Resume PDF data
}

export async function fetchCandidatesPaginated(limit = 1000): Promise<Candidate[]> {
  // Check if Supabase is properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase not configured')
    return []
  }

  const allCandidates: Candidate[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('interviews')
      .select('id, candidate_name, skills, feedback, transcript, Email, "CV/Resume"')
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching candidates:', error)
      break
    }

    if (!data || data.length === 0) {
      break
    }

    allCandidates.push(...data)
    
    if (data.length < limit) {
      break
    }
    
    offset += limit
  }

  return allCandidates
}

export function matchCandidates(jobSkills: string[], candidates: Candidate[]): MatchedCandidate[] {
  const jobSet = new Set(jobSkills.map(skill => skill.toLowerCase().trim()))
  const matches: MatchedCandidate[] = []

  for (const candidate of candidates) {
    const skills = candidate.skills
      ?.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0) || []

    // More precise matching logic
    const matched = Array.from(jobSet).filter(jobSkill => {
      return skills.some(candidateSkill => {
        // Exact match (highest priority)
        if (candidateSkill === jobSkill) {
          return true
        }
        
        // Word boundary match (e.g., "qiwa" matches "qiwa system" but not "myqiwa")
        const candidateWords = candidateSkill.split(/\s+/)
        if (candidateWords.includes(jobSkill)) {
          return true
        }
        
        // Check if job skill is a complete word within candidate skill
        const jobSkillRegex = new RegExp(`\\b${jobSkill}\\b`, 'i')
        if (jobSkillRegex.test(candidateSkill)) {
          return true
        }
        
        // For very specific terms (like government systems), be more strict
        const specificTerms = ['qiwa', 'gosi', 'ajeer', 'muqeem', 'absher', 'tamkeen']
        if (specificTerms.includes(jobSkill.toLowerCase())) {
          // Only exact matches or word boundary matches for specific terms
          return candidateSkill === jobSkill || candidateWords.includes(jobSkill)
        }
        
        return false
      })
    })

    if (matched.length > 0) {
      matches.push({
        candidate_name: candidate.candidate_name || 'Unnamed',
        match_count: matched.length,
        matched_skills: matched.sort(),
        feedback: candidate.feedback,
        all_skills: skills,
        transcript: candidate.transcript || '',
        Email: candidate.Email || '',
        'CV/Resume': candidate['CV/Resume'] || ''
      })
    }
  }

  return matches.sort((a, b) => b.match_count - a.match_count)
} 
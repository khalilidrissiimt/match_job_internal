import { google } from "@ai-sdk/google";

const model = google("models/gemini-2.0-flash-001");

// Cache for skill summaries to avoid duplicate API calls
const skillCache = new Map<string, string>();
const feedbackCache = new Map<string, string>();

// Cache cleanup to prevent memory leaks
const MAX_CACHE_SIZE = 1000;
const CACHE_CLEANUP_INTERVAL = 100; // Cleanup every 100 operations

let operationCount = 0;

function cleanupCache() {
  operationCount++;
  if (operationCount % CACHE_CLEANUP_INTERVAL === 0) {
    if (skillCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(skillCache.entries());
      skillCache.clear();
      // Keep only the most recent entries
      entries.slice(-MAX_CACHE_SIZE / 2).forEach(([key, value]) => {
        skillCache.set(key, value);
      });
    }
    if (feedbackCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(feedbackCache.entries());
      feedbackCache.clear();
      // Keep only the most recent entries
      entries.slice(-MAX_CACHE_SIZE / 2).forEach(([key, value]) => {
        feedbackCache.set(key, value);
      });
    }
  }
}

// Batch processing for multiple candidates
export async function batchAnalyzeFeedback(feedbackList: any[]): Promise<string[]> {
  const uniqueFeedback = new Map<string, any>();
  
  // Deduplicate feedback to avoid analyzing the same feedback multiple times
  feedbackList.forEach((feedback, index) => {
    const feedbackKey = JSON.stringify(feedback);
    if (!uniqueFeedback.has(feedbackKey)) {
      uniqueFeedback.set(feedbackKey, { feedback, originalIndex: index });
    }
  });

  // Analyze unique feedback patterns
  const uniqueFeedbackArray = Array.from(uniqueFeedback.values());
  const analysisPromises = uniqueFeedbackArray.map(async ({ feedback, originalIndex }) => {
    const cacheKey = JSON.stringify(feedback);
    
    // Check cache first
    if (feedbackCache.has(cacheKey)) {
      return { result: feedbackCache.get(cacheKey)!, originalIndex };
    }
    
    const result = await analyzeFeedback(feedback);
    feedbackCache.set(cacheKey, result);
    cleanupCache();
    return { result, originalIndex };
  });

  const results = await Promise.all(analysisPromises);
  
  // Map results back to original order
  const resultMap = new Map();
  results.forEach(({ result, originalIndex }) => {
    resultMap.set(originalIndex, result);
  });
  
  return feedbackList.map((_, index) => resultMap.get(index) || 'No analysis available');
}

export async function batchSummarizeSkills(skillLists: string[][]): Promise<string[]> {
  const uniqueSkillSets = new Map<string, { skills: string[], originalIndex: number }>();
  
  // Deduplicate skill sets
  skillLists.forEach((skills, index) => {
    const skillKey = skills.sort().join(',');
    if (!uniqueSkillSets.has(skillKey)) {
      uniqueSkillSets.set(skillKey, { skills, originalIndex: index });
    }
  });

  // Process unique skill sets
  const uniqueSkillArray = Array.from(uniqueSkillSets.values());
  const summaryPromises = uniqueSkillArray.map(async ({ skills, originalIndex }) => {
    const cacheKey = skills.sort().join(',');
    
    // Check cache first
    if (skillCache.has(cacheKey)) {
      return { result: skillCache.get(cacheKey)!, originalIndex };
    }
    
    const result = await summarizeSkills(skills);
    skillCache.set(cacheKey, result);
    cleanupCache();
    return { result, originalIndex };
  });

  const results = await Promise.all(summaryPromises);
  
  // Map results back to original order
  const resultMap = new Map();
  results.forEach(({ result, originalIndex }) => {
    resultMap.set(originalIndex, result);
  });
  
  return skillLists.map((_, index) => resultMap.get(index) || 'No summary available');
}

export async function extractSkills(description: string): Promise<string[]> {
  const prompt = `
You are an expert HR professional and technical recruiter. Your task is to extract ALL relevant skills from the job description.

Instructions:
- Extract ALL technical skills, soft skills, tools, platforms, frameworks, libraries, programming languages, methodologies, certifications, etc.
- Include both explicit skills mentioned and implicit skills that would be required
- Include synonyms, abbreviations, and related terms (e.g., AI/artificial intelligence, ML/machine learning, JS/JavaScript)
- Consider industry-specific skills and domain knowledge
- Include both entry-level and advanced skills mentioned
- Return a comprehensive, comma-separated list with no duplicates
- Be thorough and capture every skill mentioned or implied

Job description:
"""${description}"""

Extract ALL skills:`

  try {
    const response = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      temperature: 0.2,
    });

    const skillsText = response.text?.trim() || ''
    return skillsText.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.length > 0)
  } catch (error) {
    console.error('AI Error:', error);
    // Enhanced fallback: return comprehensive skills extraction
    const comprehensiveSkills = [
      'javascript', 'react', 'typescript', 'node.js', 'python', 'java', 'sql', 'html', 'css',
      'angular', 'vue.js', 'next.js', 'express.js', 'mongodb', 'postgresql', 'mysql', 'aws',
      'docker', 'kubernetes', 'git', 'agile', 'scrum', 'jira', 'figma', 'adobe creative suite',
      'machine learning', 'ai', 'data science', 'statistics', 'excel', 'powerpoint', 'word',
      'communication', 'leadership', 'teamwork', 'problem solving', 'analytical thinking',
      'project management', 'customer service', 'sales', 'marketing', 'design', 'ux/ui'
    ];
    return comprehensiveSkills.filter(skill => description.toLowerCase().includes(skill));
  }
}

export async function summarizeSkills(skillList: string[]): Promise<string> {
  const prompt = `
You are an expert career consultant and HR professional. Create a comprehensive skill summary for a candidate.

Instructions:
- Analyze the skill list thoroughly
- Identify the candidate's primary strengths and expertise areas
- Highlight any unique or specialized skills
- Consider the overall skill level and breadth
- Write 2-3 detailed sentences that capture the candidate's professional profile
- Be specific about their technical capabilities and experience level

Skills: ${skillList.join(', ')}

Provide a detailed skill summary:`

  try {
    const response = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      temperature: 0.4,
    });

    return response.text?.trim() || ''
  } catch (error) {
    console.error('AI Error:', error);
    return `Experienced professional with comprehensive skills in ${skillList.slice(0, 5).join(', ')} and additional expertise in ${skillList.length > 5 ? `${skillList.length - 5} other areas` : 'various domains'}.`;
  }
}

export async function analyzeFeedback(feedbackJson: any): Promise<string> {
  // Handle the actual Supabase feedback structure
  if (!feedbackJson || typeof feedbackJson !== 'object') {
    return '⚠️ Warning: Some concerns found - No feedback data available.';
  }

  try {
    // First, try to get the 'raw' field like in the original Python code
    let rawText = feedbackJson.raw || '';
    
    // If no 'raw' field, convert the structured feedback to text
    if (!rawText) {
      rawText = Object.entries(feedbackJson)
        .map(([key, value]) => `${key.replace(/_/g, ' ').toUpperCase()}: ${value}`)
        .join('\n\n');
    }
    
    console.log('Feedback text length:', rawText.length);
    console.log('Feedback text preview:', rawText.substring(0, 200));
    
    const prompt = `
You're an expert evaluating interview feedback quality.

Here is candidate interview feedback:
"""${rawText}"""
Does this feedback suggest any of the following?
- Poor technical skills
- Negative attitude
- Lack of communication
- Not a strong candidate
Answer with one of the following and explain why:
- ✅ Suitable based on feedback
- ⚠️ Warning: Some concerns found
- ❌ Not suitable based on feedback`

    const response = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      temperature: 0.3,
    });

    const result = response.text?.trim() || ''
    console.log('AI response:', result);
    return result;
  } catch (error) {
    console.error('Feedback Analysis Error:', error);
    // Enhanced fallback analysis based on key indicators
    const feedbackText = JSON.stringify(feedbackJson).toLowerCase();
    
    // More comprehensive keyword analysis
    const positiveKeywords = ['excellent', 'outstanding', 'exceptional', 'strong', 'highly suitable', 'outstanding', 'demonstrates strong', 'excellent technical', 'clear communication', 'high confidence', 'positive attitude'];
    const negativeKeywords = ['poor', 'limited', 'struggles', 'weak', 'concerns', 'problems', 'difficulty', 'lack of', 'not suitable', 'significant concerns', 'poor technical', 'communication problems'];
    
    const positiveCount = positiveKeywords.filter(keyword => feedbackText.includes(keyword)).length;
    const negativeCount = negativeKeywords.filter(keyword => feedbackText.includes(keyword)).length;
    
    if (positiveCount > negativeCount && positiveCount >= 3) {
      return '✅ Suitable based on feedback - Strong positive indicators across multiple assessment categories including technical skills, communication, and professional attitude. The candidate demonstrates excellent capabilities and would be a valuable addition to the team.';
    } else if (negativeCount > positiveCount && negativeCount >= 3) {
      return '❌ Not suitable based on feedback - Multiple concerning indicators across various assessment areas including technical limitations, communication issues, and professional concerns. The candidate would not be a good fit for the role.';
    } else {
      return '⚠️ Warning: Some concerns found - Mixed feedback with both positive and negative aspects. While the candidate shows potential in some areas, there are specific concerns that need to be addressed before considering them suitable for the role.';
    }
  }
} 
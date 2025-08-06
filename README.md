# Resume-Candidate Matcher

A Next.js 14+ application that matches job descriptions with candidate profiles using AI, with support for both UI and webhook interfaces.

## 🚀 Features

- **AI-Powered Skill Extraction**: Uses Google Gemini to extract skills from job descriptions
- **Candidate Matching**: Matches job requirements with candidate skills from Supabase
- **PDF Report Generation**: Creates detailed PDF reports with candidate analysis
- **Email Collector**: Tracks incoming emails in Supabase
- **Webhook Support**: Receives PDF files from n8n and processes them automatically
- **Modern UI**: Beautiful, responsive interface with drag-and-drop file upload

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account
- Google AI API key
- PDF.co API key

## 🛠️ Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd okk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google AI
   GOOGLE_AI_API_KEY=your_google_ai_api_key

   # PDF.co
   PDFCO_API_KEY=your_pdfco_api_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically

## 🔗 API Endpoints

### Main Matching API
- **POST** `/api/match` - Process job descriptions and match candidates
- **POST** `/api/test-match` - Test endpoint with mock data

### Webhook API (for n8n integration)
- **POST** `/api/webhook` - Receive PDF files from n8n and process them

### Email Collection
- **POST** `/api/email-collector` - Save emails to Supabase

### PDF Processing
- **POST** `/api/extract-pdf` - Extract text from PDF files

### Test Endpoints
- **POST** `/api/test-webhook` - Test webhook functionality
- **POST** `/api/test-ai` - Test AI integration
- **POST** `/api/test-feedback` - Test feedback analysis

## 🔄 n8n Integration

### Webhook Configuration

1. **n8n Webhook Node Setup**:
   ```
   Method: POST
   URL: https://your-vercel-app.vercel.app/api/webhook
   Content Type: multipart/form-data
   ```

2. **File Upload**:
   - Field name: `file`
   - File type: PDF
   - Optional: `extra_notes` (string)

3. **Response Handling**:
   - The webhook will automatically send results to: `https://kkii.app.n8n.cloud/webhook-test/return`
   - Response includes: candidates, PDF base64, extracted skills

### Example n8n Workflow

```javascript
// n8n webhook configuration
{
  "method": "POST",
  "url": "https://your-app.vercel.app/api/webhook",
  "formData": {
    "file": "{{ $binary.data }}",
    "extra_notes": "Remote work preferred"
  }
}
```

### Response Format

```json
{
  "success": true,
  "candidates": [
    {
      "candidate_name": "John Doe",
      "match_count": 3,
      "matched_skills": ["react", "typescript", "javascript"],
      "summary": "Experienced frontend developer...",
      "feedback": { /* JSONB feedback data */ },
      "transcript": "Interview transcript..."
    }
  ],
  "pdf_base64": "JVBERi0xLjcK...",
  "extracted_skills": ["react", "typescript", "javascript"],
  "processed_at": "2024-01-01T12:00:00.000Z"
}
```

## 📊 Database Schema

### Supabase Tables

1. **interviews** table:
   ```sql
   id (uuid, primary key)
   candidate_name (text)
   skills (text)
   feedback (jsonb)
   transcript (text)
   created_at (timestamp)
   ```

2. **incoming_emails** table:
   ```sql
   id (uuid, primary key)
   email (text)
   received_at (timestamp)
   ```

## 🎯 Usage

### Web Interface
1. Visit the main page
2. Upload PDF or paste job description
3. Add optional notes
4. Click "Match Candidates"
5. Download PDF report

### Webhook (n8n)
1. Send PDF file to `/api/webhook`
2. Include optional `extra_notes`
3. Receive processed results automatically
4. Results sent to n8n return webhook

### Email Collection
1. Visit `/email-collector`
2. Enter email address
3. Save to Supabase tracking

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `GOOGLE_AI_API_KEY` | Google AI API key | ✅ |
| `PDFCO_API_KEY` | PDF.co API key | ✅ |

## 🚀 Vercel Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Supabase database set up
- [ ] Google AI API key configured
- [ ] PDF.co API key configured
- [ ] Webhook URL updated in n8n
- [ ] Test webhook functionality

## 📝 Notes

- The webhook automatically sends results back to n8n
- PDF reports include detailed candidate feedback
- Email collector tracks incoming emails
- All AI processing uses Google Gemini
- PDF generation uses pdf-lib library

## 🐛 Troubleshooting

1. **Webhook not working**: Check environment variables in Vercel
2. **PDF extraction fails**: Verify PDF.co API key
3. **AI processing errors**: Check Google AI API key
4. **Database errors**: Verify Supabase connection

## 📞 Support

For issues or questions, check the console logs and verify all environment variables are correctly set. 
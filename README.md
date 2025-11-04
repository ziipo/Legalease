# Legalease

AI-powered legal document review tool that helps identify unnecessary legalese, missing definitions, and problematic clauses in legal documents.

## Features

- Upload PDF, DOC, DOCX, or TXT files
- AI-powered analysis using OpenAI or Anthropic Claude
- Focus areas: Legalese, Definitions, Problematic Clauses, Clarity
- Clean, responsive UI
- Copy results to clipboard

## Architecture

- **Frontend**: Static HTML/CSS/JS hosted on GitHub Pages
- **Backend**: Vercel serverless functions (keeps API keys secure)
- **AI Provider**: OpenAI GPT-4 or Anthropic Claude

## Setup

### Prerequisites

- Node.js 18+
- Vercel account
- OpenAI API key or Anthropic API key

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Legalease.git
cd Legalease
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your API key to `.env`:
```
LLM_PROVIDER=openai
LLM_API_KEY=your-api-key-here
```

5. Run development server:
```bash
npm run dev
```

6. Open http://localhost:3000

### Deployment

#### Deploy Backend to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `LLM_PROVIDER` (openai or anthropic)
   - Add `LLM_API_KEY` (your API key)

4. Deploy to production:
```bash
npm run deploy
```

5. Note your Vercel deployment URL (e.g., `https://your-project.vercel.app`)

#### Deploy Frontend to GitHub Pages

1. Update `app.js` with your Vercel API URL:
```javascript
const API_ENDPOINT = 'https://your-project.vercel.app/api/analyze-document';
```

2. Commit and push:
```bash
git add .
git commit -m "Update API endpoint"
git push origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings > Pages
   - Select "Deploy from a branch"
   - Select "main" branch and "/ (root)"
   - Save

4. Your site will be live at `https://yourusername.github.io/Legalease/`

## Configuration

### LLM Providers

**OpenAI** (default):
- Model: GPT-4 Turbo
- API: https://platform.openai.com/api-keys

**Anthropic Claude**:
- Model: Claude 3 Sonnet
- API: https://console.anthropic.com/

Set in `.env`:
```
LLM_PROVIDER=anthropic
LLM_API_KEY=your-anthropic-key
```

### File Upload Limits

- Maximum file size: 10MB
- Supported formats: PDF, TXT (DOC/DOCX coming soon)
- Maximum document length: ~12,000 characters (~3,000 tokens)

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice. Always consult with a qualified attorney for legal matters.

## License

MIT

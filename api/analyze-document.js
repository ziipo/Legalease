const { IncomingForm } = require('formidable');
const fs = require('fs');
const pdfParse = require('pdf-parse');

// This will use OpenAI, Anthropic, or another LLM provider
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

// Parse multipart form data
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}

// Extract text from different file types
async function extractText(file) {
  const filePath = file.filepath;
  const fileType = file.mimetype;
  const fileName = file.originalFilename || '';

  try {
    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return fs.readFileSync(filePath, 'utf-8');
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new Error('DOC/DOCX support coming soon. Please use PDF or TXT files.');
    } else {
      throw new Error('Unsupported file type');
    }
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Build the prompt based on focus area
function buildPrompt(documentText, focusArea) {
  const basePrompt = `You are a legal document reviewer. Analyze the following legal document and provide constructive feedback. Focus on:

1. **Unnecessary Legalese**: Identify overly complex or archaic language that could be simplified
2. **Missing Definitions**: Point out terms that should be defined but aren't
3. **Problematic Clauses**: Flag clauses that may be one-sided, unclear, or potentially problematic
4. **Plain Language Opportunities**: Suggest where plain language could improve clarity

Document to review:

${documentText}

Provide a structured review with specific examples and recommendations.`;

  const focusPrompts = {
    legalese: `You are a legal document reviewer specializing in plain language. Review the following document and focus specifically on identifying unnecessary legalese, archaic language, and overly complex phrasing. Provide specific examples and suggest simpler alternatives.\n\nDocument:\n\n${documentText}`,
    definitions: `You are a legal document reviewer specializing in contract clarity. Review the following document and focus specifically on identifying terms that should be defined but aren't, and terms that are used inconsistently. List each term that needs definition.\n\nDocument:\n\n${documentText}`,
    clauses: `You are a legal document reviewer specializing in contract fairness. Review the following document and focus specifically on identifying problematic clauses, one-sided terms, ambiguous provisions, and potentially unfair conditions. Flag each issue with explanation.\n\nDocument:\n\n${documentText}`,
    clarity: `You are a legal document reviewer specializing in plain language. Review the following document and focus specifically on opportunities to improve clarity, readability, and accessibility. Suggest concrete improvements.\n\nDocument:\n\n${documentText}`,
  };

  return focusArea && focusPrompts[focusArea] ? focusPrompts[focusArea] : basePrompt;
}

// Call LLM API
async function callLLM(prompt) {
  if (LLM_PROVIDER === 'openai') {
    return await callOpenAI(prompt);
  } else if (LLM_PROVIDER === 'anthropic') {
    return await callAnthropic(prompt);
  } else {
    throw new Error('Invalid LLM provider');
  }
}

// OpenAI implementation
async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document reviewer providing constructive feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Anthropic Claude implementation
async function callAnthropic(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': LLM_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return data.content[0].text;
}

module.exports = async function handler(req, res) {
  // Enable CORS - must be set first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!LLM_API_KEY) {
      return res.status(500).json({
        error: 'LLM API key not configured. Please add LLM_API_KEY to environment variables.'
      });
    }

    // Parse form data
    const { fields, files } = await parseForm(req);

    // Formidable v3 returns files as arrays
    const fileArray = files.file;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    const focusArea = fields.focusArea?.[0] || '';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text from document
    const documentText = await extractText(file);

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from document' });
    }

    // Limit document size (approximate token limit)
    const maxChars = 12000; // ~3000 tokens
    const truncatedText = documentText.length > maxChars
      ? documentText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : documentText;

    // Build prompt and call LLM
    const prompt = buildPrompt(truncatedText, focusArea);
    const review = await callLLM(prompt);

    return res.status(200).json({
      review,
      documentLength: documentText.length,
      truncated: documentText.length > maxChars
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while analyzing the document'
    });
  }
};

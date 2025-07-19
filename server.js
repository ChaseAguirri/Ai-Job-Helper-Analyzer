// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OpenAI client setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Multer setup for uploads folder
const upload = multer({ dest: 'uploads/' });

// === Routes ===

// Upload resume (PDF)
app.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(pdfBuffer);
    fs.unlinkSync(req.file.path); // Clean up uploaded file after parsing
    res.json({ resumeText: parsed.text });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// Analyze resume/job via OpenAI
app.post('/analyze', async (req, res) => {
    const { resumeText, jobText, options } = req.body;
  
    try {
      const prompts = [];
  
      if (options.includes('Generate Job Summary')) {
        prompts.push({
          label: 'summary',
          prompt: `Please provide a concise summary of the following job description:\n\n${jobText}\n\nRespond only with plain text summary.`,
        });
      }
  
      if (options.includes('Write Cover Letter')) {
        prompts.push({
          label: 'coverLetter',
          prompt: `Write a professional cover letter based on the following resume and job description:\n\nResume:\n${resumeText}\n\nJob Description:\n${jobText}\n\nRespond only with the cover letter text.`,
        });
      }
  
      if (options.includes('Tailor Resume')) {
        prompts.push({
          label: 'tailoredResume',
          prompt: `Suggest improvements and tailoring for the following resume to better fit the job description below. Respond only with a bulleted list of suggestions in plain text.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobText}`,
        });
      }
  
      // Add resume quality score prompt here
      prompts.push({
        label: 'resumeScore',
        prompt: `Please evaluate the quality of this resume for the following job description. Provide a numeric score from 1 to 100 (higher is better) and respond ONLY with the number.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobText}`,
      });
  
      // Always include comparison (you can change this if you want)
      prompts.push({
        label: 'comparison',
        prompt: `Compare this resume to the job listing. Respond with ONLY a JSON object structured as:
  
  {
    "matches": [ "list of matching skills/requirements" ],
    "missing": [ "list of missing qualifications" ],
    "suggestions": [ "list of suggestions for improvement" ]
  }

Resume:\n${resumeText}\n\nJob Description:\n${jobText}`,
    });

    const results = {};

    for (const { label, prompt } of prompts) {
      const chat = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = chat.choices[0].message.content.trim();

      if (label === 'comparison') {
        try {
          results[label] = JSON.parse(content);
        } catch {
          results[label] = {
            matches: [],
            missing: [],
            suggestions: ["Failed to parse AI response as JSON."],
          };
        }
      } else {
        results[label] = content;
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[OPENAI ERROR]', err);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const pdfParse = require("pdf-parse");
//const fetch = require("node-fetch");

require('dotenv').config();

const ADZUNA_API_ID = process.env.ADZUNA_API_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const COUNTRY = "us";
const BASE_URL = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(fileUpload());

// Analyze Resume using OpenAI
async function analyzeResumeWithOpenAI(resumeText) {
  const requestBody = {
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an ATS that evaluates resumes, provides an ATS score (0-100), improvement suggestions, and job-related keywords."
      },
      {
        role: "user",
        content: `Analyze the following resume:\n\n${resumeText}\n\nReturn JSON with ats_score (0-100), suggestions (array), and keywords (array).`
      }
    ],
    temperature: 0.2
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Error:", error);
    return { ats_score: 50, suggestions: ["Improve formatting."], keywords: ["Software Developer"] };
  }
}

// Fetch Jobs from Adzuna
async function findJobs(keywords) {
  const query = keywords.join("%20");
  const url = `${BASE_URL}?app_id=${ADZUNA_API_ID}&app_key=${ADZUNA_API_KEY}&what_or=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Adzuna Error:", error);
    return [];
  }
}

// Upload Resume Endpoint
app.post("/upload-resume", async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const resumeFile = req.files.resume;
    const buffer = resumeFile.data;

    const pdfData = await pdfParse(buffer);
    const resumeText = pdfData.text;

    const { ats_score, suggestions, keywords } = await analyzeResumeWithOpenAI(resumeText);
    const jobs = await findJobs(keywords);

    res.json({ ats_score, suggestions, jobs });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

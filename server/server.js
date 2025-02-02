const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const pdfParse = require("pdf-parse");
//const fetch = require("node-fetch");

require('dotenv').config({ path: '../.env' });

const ADZUNA_API_ID = process.env.ADZUNA_API_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;

const COUNTRY = "us";
const BASE_URL = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(fileUpload());

// Analyze Resume using OpenAI
async function extractKeywordsWithLlama(resumeText) {
  const { default: LlamaAI } = await import('llamaai');
  const llamaAPI = new LlamaAI(LLAMA_API_KEY);
  // Build the API request JSON according to LlamaAPI's documentation.
  const apiRequestJson = {

    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that extracts job-related keywords from resumes."
      },
      {
        role: "user",
        content: `Extract job-related keywords from the following resume. Consider the whole resume and only return relevent keywords in a single industry. Only return a comma-separated list of job roles, technologies, and skills:\n\n${resumeText}`
      }
    ],
    stream: false,
    model: "mixtral-8x22b-instruct"
  };

  try {
    // Execute the API request using the LlamaAPI library's run method.
    const response = await llamaAPI.run(apiRequestJson);
    console.log("Full response from LlamaAPI:", response);

    // Process the response.
    // We assume the response structure is similar to:
    // { choices: [ { message: { content: "keyword1, keyword2, ..." } } ] }
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No choices returned in response.");
    }
    const content = response.choices[0].message.content.trim();
    const keywords = content.split(",").map(keyword => keyword.trim());
    console.log("Extracted Keywords:", keywords);
    return keywords;
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return ["Software Developer"]; // Fallback keyword
  }
}

// Fetch Jobs from Adzuna
async function findJobs(keywords) {
  const query = keywords.join("%20");
  const url = `${BASE_URL}?app_id=${ADZUNA_API_ID}&app_key=${ADZUNA_API_KEY}&what_or=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return (data.results || []).slice(0, 5);
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

    const keywords = await extractKeywordsWithLlama(resumeText);
    const jobs = await findJobs(keywords);

    res.json({ jobs });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

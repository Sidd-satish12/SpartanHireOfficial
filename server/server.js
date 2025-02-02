const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const axios = require("axios");
const { title } = require("process");

require('dotenv').config({ path: '../.env' });

const LLAMA_API_KEY = "LA-e2ae570be5664ecc8cc80388a1f03ecb584f991f29fc4e168cba26c27a43b5ef";
const APIFY_API_TOKEN = "apify_api_ZtR8bpcAgfe1629hDWsJLnfgBoYYYi05T3gR";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(fileUpload());

// Analyze Resume using LlamaAI
async function extractKeywordsWithLlama(resumeText) {
  const { default: LlamaAI } = await import('llamaai');
  const llamaAPI = new LlamaAI(LLAMA_API_KEY);
  const apiRequestJson = {
    messages: [
      { role: "system", content: "You are an expert career advisor specializing in analyzing resumes to identify the most relevant job-related keywords. Focus on extracting keywords that are highly relevant to the primary industry, field, or domain reflected in the resume, avoiding unrelated or generic job titles." },
      { role: "user", content: `Extract job-related keywords from the following resume. Return exactly five specific job roles that are directly relevant to the candidate's primary field of expertise, formatted as a concise, comma-separated list with no additional explanation or text :\n\n${resumeText}` }
    ],
    stream: false,
    model: "mixtral-8x22b-instruct"
  };

  try {
    const response = await llamaAPI.run(apiRequestJson);
    if (!response.choices || response.choices.length === 0) throw new Error("No choices returned in response.");
    const content = response.choices[0].message.content.trim();
    return content.split(",").map(keyword => keyword.trim());
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return ["Software Developer"];
  }
}

async function findJobs(keywords) {
  const query = keywords.join(" ");
  const triggerUrl = `https://api.apify.com/v2/acts/bebity~linkedin-jobs-scraper/runs?token=${APIFY_API_TOKEN}`;

  const requestBody = {
    title: "Software Engineer",
    rows: 5,
    location: "United States"
  };

  try {
    // Step 1: Trigger the APIFY LinkedIn Job Scraper
    const triggerResponse = await axios.post(triggerUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    const runId = triggerResponse.data.data.id;
    const datasetId = triggerResponse.data.data.defaultDatasetId;

    console.log(`Scraper started with Run ID: ${runId}`);

    // Step 2: Poll for Completion
    let status = 'READY';
    while (status !== 'SUCCEEDED' && status !== 'FAILED') {
      const statusResponse = await axios.get(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
      status = statusResponse.data.data.status;
      console.log(`Current status: ${status}`);
      if (status === 'SUCCEEDED') break;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
    }

    if (status === 'SUCCEEDED') {
      // Step 3: Fetch Job Postings
      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`;
      const jobsResponse = await axios.get(datasetUrl);
      return jobsResponse.data.slice(0, 5); // Return top 5 jobs
    } else {
      console.log('The scraping job failed.');
      return [];
    }
  } catch (error) {
    console.error("APIFY API Error:", error.response ? error.response.data : error.message);
    return [];
  }
}


// Upload Resume Endpoint
app.post("/upload-resume", async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = req.files.resume.data;
    const pdfData = await pdfParse(buffer);
    const resumeText = pdfData.text;

    const keywords = await extractKeywordsWithLlama(resumeText);
    console.log(keywords);
    const jobs = await findJobs(keywords);
    console.log(jobs);

    res.json(jobs);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
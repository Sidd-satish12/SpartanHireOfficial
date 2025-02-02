// server.js
const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const pdfParse = require("pdf-parse");

// If you have environment variables, uncomment:
// require('dotenv').config();

const ADZUNA_API_ID = "145c6b68";
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const LLAMA_API_KEY = process.env.LLAMA_API_KEY;;

const COUNTRY = "us";
const BASE_URL = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`;

const app = express();
const PORT = 3000;

app.use(cors());
app.use(fileUpload());

function chunkText(text, chunkSize = 3000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function extractKeywordsWithLlama(resumeText) {
  const { default: LlamaAI } = await import("llamaai");
  const llamaAPI = new LlamaAI(LLAMA_API_KEY);

  const modelName = "mixtral-8x22b-instruct"; // Using a lightweight model for faster response

  const apiRequestJson = {
    messages: [
      { role: "system", content: "You are a helpful assistant that extracts job-related keywords from resume text." },
      { role: "user", content: `Extract relevant job-related keywords from the following resume text:\n\n${resumeText}` }
    ],
    stream: false,
    model: modelName
  };

  try {
    const response = await llamaAPI.run(apiRequestJson);

    // Debug: Log the full API response for troubleshooting
    console.log("Llama API Response:", response);

    // Validate the API response
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("No 'choices' returned from Llama API.");
    }

    const content = response.choices[0].message.content;
    if (!content || content.trim() === "") {
      throw new Error("Llama API returned empty 'content'.");
    }

    // Extract keywords (assuming they are comma-separated)
    const keywords = content
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean); // Remove empty strings

    // Remove duplicate keywords
    const uniqueKeywords = [...new Set(keywords)];

    // Fallback if no keywords were extracted
    if (uniqueKeywords.length === 0) {
      console.warn("No keywords extracted. Using fallback keyword: 'Software Developer'");
      return ["Software Developer"];
    }

    return uniqueKeywords;
  } catch (error) {
    console.error("Error extracting keywords:", error.message);

    // Fallback if an error occurs
    return ["Software Developer"];
  }
}


async function generateRoadmapWithLlama(resumeText, jobRole) {
  const { default: LlamaAI } = await import('llamaai');
  const llamaAPI = new LlamaAI(LLAMA_API_KEY);

  const apiRequestJson = {
    messages: [
      { role: "system", content: "You are a career coach specializing in analyzing resumes and providing personalized roadmaps to help individuals succeed in their target job roles." },
      { role: "user", content: `Based on this resume:\n\n${resumeText}\n\nAnd the job role: "${jobRole}", provide a brief 7-step roadmap to help the candidate improve. Focus on skills, projects/outreach, networking, and interview tips. Keep it concise with only 4 points in about 150 words.` }
    ],
    stream: false,
    model: "mixtral-8x22b-instruct"
  };

  try {
    const response = await llamaAPI.run(apiRequestJson);
    if (!response.choices || response.choices.length === 0) throw new Error("No choices returned in response.");
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating roadmap:", error);
    return "Unable to generate a roadmap at this time.";
  }
}


async function findJobs(keywords) {
  // Join keywords by space or use OR
  const query = keywords.join("%20");

  // Add where=some location
  const url = `${BASE_URL}?app_id=${ADZUNA_API_ID}&app_key=${ADZUNA_API_KEY}&what_or=${encodeURIComponent(query)}&where=San%20Francisco`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    // If not OK, likely an HTML error
    if (!response.ok) {
      console.error("Adzuna HTTP Error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    if (!data.results) {
      return [];
    }

    // Return top 5
    return data.results.slice(0, 5).map(job => ({
      title: job.title || "",
      company: {
        display_name: job.company?.display_name || "N/A"
      },
      redirect_url: job.redirect_url || "",
      description: job.description || ""
    }));
  } catch (error) {
    console.error("Adzuna Error:", error);
    return [];
  }
}


app.post("/upload-resume", async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse PDF
    const pdfData = await pdfParse(req.files.resume.data);
    const resumeText = pdfData.text;

    // 1) Extract user skills
    const userSkills = await extractKeywordsWithLlama(resumeText);

    // 2) Find relevant jobs
    const jobs = await findJobs(userSkills);

    // 3) Generate roadmap from user skills + job descriptions
    const jobDescriptions = jobs.map(job => job.description);
    const roadmap = await generateRoadmapWithLlama(resumeText,userSkills[0]);
    console.log(roadmap);

    // 4) Provide a dummy or computed ATS score
    const ats_score = 80; // or any random logic

    // 5) Return JSON
    return res.json({
      ats_score,
      jobs,
      roadmap
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

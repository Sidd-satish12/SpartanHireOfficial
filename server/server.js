// server.js
const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const pdfParse = require("pdf-parse");

// If you have environment variables, uncomment:
// require('dotenv').config();

const ADZUNA_API_ID = "145c6b68";
const ADZUNA_API_KEY = "9837360432df6e841ee819641d5ee8a2";
const LLAMA_API_KEY = "LA-e2ae570be5664ecc8cc80388a1f03ecb584f991f29fc4e168cba26c27a43b5ef";

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

  // Helper to chunk big text, so each request is smaller.
  function chunkText(text, chunkSize = 3000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Break the resume into chunks
  const textChunks = chunkText(resumeText, 3000);
  let allKeywords = [];

  // Use a smaller/faster model to reduce timeouts
  const modelName = "orca-mini-3b";

  for (const [index, chunk] of textChunks.entries()) {
    const apiRequestJson = {
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts job-related keywords from text."
        },
        {
          role: "user",
          content: `Extract keywords from:\n\n${chunk}`
        }
      ],
      stream: false,
      model: modelName
    };

    try {
      const response = await llamaAPI.run(apiRequestJson);

      // Safely check if choices exist
      if (!response.choices || !response.choices[0]) {
        throw new Error("No 'choices' returned from Llama API.");
      }

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Llama response has no 'content'.");
      }

      // Split keywords by comma (adjust as needed based on your actual Llama output)
      const chunkKeywords = content
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      allKeywords = [...allKeywords, ...chunkKeywords];
    } catch (error) {
      console.error(`Error extracting keywords from chunk #${index}:`, error);
      // Optionally provide a fallback:
      // allKeywords = [...allKeywords, "Software Developer"];
      // or just continue to the next chunk.
    }
  }

  // Filter duplicates
  const uniqueKeywords = [...new Set(allKeywords)];
  // Fallback if everything failed
  if (uniqueKeywords.length === 0) {
    return ["Software Developer"];
  }

  return uniqueKeywords;
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

async function generateRoadmap(userSkills, jobDescriptions) {
  const { default: LlamaAI } = await import("llamaai");
  const llamaAPI = new LlamaAI(LLAMA_API_KEY);

  const jobSkills = jobDescriptions.join("\n\n");

  // Use a smaller/faster model again
  const modelName = "orca-mini-3b";

  const apiRequestJson = {
    messages: [
      {
        role: "system",
        content: "Analyze the skill gaps and generate a 7-day roadmap with recommended resources. Make it easy to follow."
      },
      {
        role: "user",
        content: `User Skills: ${userSkills.join(", ")}\n\nJob Skills: ${jobSkills}`
      }
    ],
    stream: false,
    model: modelName
  };

  try {
    const response = await llamaAPI.run(apiRequestJson);
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating roadmap:", error);
    return "Unable to generate roadmap. Please try again.";
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
    const roadmap = await generateRoadmap(userSkills, jobDescriptions);

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

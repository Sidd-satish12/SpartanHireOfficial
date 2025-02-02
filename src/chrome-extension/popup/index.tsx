// popup/index.tsx
import React, { useState } from "react";
import "../global.css";

export const Popup = () => {
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [jobs, setJobs] = useState<{ 
    title: string; 
    company: { display_name: string }; 
    redirect_url: string 
  }[]>([]);
  const [roadmap, setRoadmap] = useState<string>("");
  const [bookmarkedJobs, setBookmarkedJobs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("http://localhost:3000/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      /**
       * Expected data shape:
       * {
       *   ats_score: number,
       *   jobs: [{ title, company: { display_name }, redirect_url, description }],
       *   roadmap: string
       * }
       */
      console.log("Response data:", data);

      setAtsScore(data.ats_score || 0); // fallback to 0 if missing
      setJobs(data.jobs || []);
      setRoadmap(data.roadmap || "");
    } catch (error) {
      console.error("Error uploading resume:", error);
      alert("Failed to process resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (index: number) => {
    setBookmarkedJobs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const openRoadmapPopup = () => {
    const roadmapWindow = window.open("", "_blank", "width=400,height=600");
    if (roadmapWindow) {
      roadmapWindow.document.write(`
        <html>
        <head>
          <title>MSU Career Roadmap</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gradient-to-r from-green-900 via-green-700 to-green-500 text-white p-4">
          <div class="max-w-sm mx-auto bg-white text-gray-900 p-4 rounded-lg shadow-2xl">
            <h1 class="text-3xl font-extrabold text-center mb-4 text-green-700">🛡 MSU Career Roadmap 🛡</h1>
            <div class="text-gray-800 whitespace-pre-wrap">${roadmap}</div>
            <button onclick="window.close()" class="mt-4 px-4 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-500">⬅️ Close Roadmap</button>
          </div>
        </body>
        </html>
      `);
    }
  };

  return (
    <div className="p-4 text-center bg-gradient-to-r from-green-900 via-green-700 to-green-500 text-white rounded-xl shadow-lg animate-fade-in">
      {!atsScore && (
        <>
          <h1 className="text-4xl font-extrabold mb-4 animate-bounce">
            🏹 Welcome, Spartan! 🏹
          </h1>
          <h2 className="text-xl font-semibold mb-4">
            🏛️ Conquer Your Job Hunt with MSU Spirit! 🏛️
          </h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="mb-4 p-3 border-4 border-white rounded-xl focus:outline-none focus:ring-4 focus:ring-green-300 bg-green-800 text-white cursor-pointer hover:bg-green-700 transition-transform transform hover:scale-105"
          />
        </>
      )}

      {loading && <p className="text-lg animate-pulse">⏳ Analyzing your resume... ⏳</p>}

      {atsScore !== null && atsScore !== 0 && (
        <div className="bg-gradient-to-br from-green-800 via-green-600 to-green-500 p-4 rounded-xl shadow-xl">
          <h2 className="text-3xl font-extrabold mb-2 animate-fade-in-up">
            🏆 Spartan Score: {atsScore}% 🏆
          </h2>

          <h3 className="font-bold mt-4 mb-2 text-white">
            🎯 Your Path to Victory! 🎯
          </h3>
          <ul className="list-none space-y-3">
            {jobs.map((job, index) => (
              <li
                key={index}
                className="flex justify-between items-center p-3 bg-white bg-opacity-20 rounded-lg shadow-md hover:shadow-xl transition-transform transform hover:scale-105"
              >
                <div className="text-left">
                  <strong>{job.title}</strong> at {job.company.display_name}
                  <br />
                  <a
                    href={job.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-300 underline hover:text-yellow-200"
                  >
                    🏹 Apply here 🏹
                  </a>
                </div>
                <button
                  onClick={() => handleBookmark(index)}
                  className={`ml-4 p-2 w-10 h-10 rounded-sm border-4 transition-transform transform hover:scale-110
                    ${
                      bookmarkedJobs.includes(index)
                        ? "bg-yellow-300 text-black border-yellow-500 animate-bounce"
                        : "bg-green-300 text-black border-green-500 hover:bg-green-200"
                    }
                  `}
                >
                  {bookmarkedJobs.includes(index) ? "⭐" : "➕"}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={openRoadmapPopup}
            className="mt-6 px-4 py-2 bg-white text-green-800 font-extrabold rounded-full shadow-md hover:bg-gray-200 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500"
          >
            🗺 Show Me the Spartan Roadmap
          </button>
        </div>
      )}
    </div>
  );
};

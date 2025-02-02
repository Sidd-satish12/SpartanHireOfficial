// popup/index.tsx
import React, { useState } from "react";
import "../global.css";

export const Popup = () => {
  const [jobs, setJobs] = useState<{
    id: string;
    title: string;
    companyName: string;
    jobUrl: string;
    location: string;
    salary: string;
    postedTime: string;
  }[]>([]);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<string[]>([]);
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

      console.log("Response data:", data);
      setJobs(data || []);
    } catch (error) {
      console.error("Error uploading resume:", error);
      alert("Failed to process resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (jobId: string) => {
    setBookmarkedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  return (
    <div className="p-4 text-center bg-gradient-to-r from-green-900 via-green-700 to-green-500 text-white rounded-xl shadow-lg animate-fade-in">
      <h1 className="text-4xl font-extrabold mb-4 animate-bounce">🏹 Welcome, Spartan! 🏹</h1>
      <h2 className="text-xl font-semibold mb-4">🏛️ Conquer Your Job Hunt with MSU Spirit! 🏛️</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="mb-4 p-3 border-4 border-white rounded-xl focus:outline-none focus:ring-4 focus:ring-green-300 bg-green-800 text-white cursor-pointer hover:bg-green-700 transition-transform transform hover:scale-105"
      />

      {loading && <p className="text-lg animate-pulse">⏳ Analyzing your resume... ⏳</p>}

      {jobs.length > 0 && (
        <div className="bg-gradient-to-br from-green-800 via-green-600 to-green-500 p-4 rounded-xl shadow-xl">
          <h3 className="font-bold mt-4 mb-2 text-white">🎯 Job Opportunities Just for You! 🎯</h3>
          <ul className="list-none space-y-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex justify-between items-center p-3 bg-white bg-opacity-20 rounded-lg shadow-md hover:shadow-xl transition-transform transform hover:scale-105"
              >
                <div className="text-left">
                  <strong>{job.title}</strong> at {job.companyName}
                  <br />
                  <span className="text-sm">📍 {job.location}</span>
                  <br />
                  <span className="text-sm">💰 {job.salary}</span>
                  <br />
                  <span className="text-sm">⏱ {job.postedTime}</span>
                  <br />
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-300 underline hover:text-yellow-200"
                  >
                    🏹 Apply Here 🏹
                  </a>
                </div>
                <button
                  onClick={() => handleBookmark(job.id)}
                  className={`ml-4 p-2 w-10 h-10 rounded-sm border-4 transition-transform transform hover:scale-110
                    ${
                      bookmarkedJobs.includes(job.id)
                        ? "bg-yellow-300 text-black border-yellow-500 animate-bounce"
                        : "bg-green-300 text-black border-green-500 hover:bg-green-200"
                    }
                  `}
                >
                  {bookmarkedJobs.includes(job.id) ? "⭐" : "➕"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

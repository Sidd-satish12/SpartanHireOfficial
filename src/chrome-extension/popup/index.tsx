import React, { useState } from "react";
import "../global.css";

export const Popup = () => {
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [jobs, setJobs] = useState<{ title: string; company: { display_name: string } }[]>([]);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [recruiters, setRecruiters] = useState<{ name: string; profileLink: string }[]>([]);

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
      setAtsScore(data.ats_score);
      setJobs(data.jobs);
    } catch (error) {
      console.error("Error:", error);
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

  const findRecruiters = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id!, { action: "findRecruiters" }, (response) => {
        if (response && response.recruiters) {
          setRecruiters(response.recruiters);
        } else {
          alert("Couldn't find recruiters. Please open LinkedIn.");
        }
      });
    } catch (error) {
      console.error("Error finding recruiters:", error);
    }
  };

  return (
    <div className="p-4 text-center bg-green-600 text-white rounded-lg shadow-md">
      {!atsScore && (
        <>
          <h1 className="text-3xl font-bold mb-4">Welcome Spartan!</h1>
          <h2 className="text-xl font-semibold mb-4">
            Please upload your resume to open a new world of opportunities
          </h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="mb-4 p-2 border-2 border-white rounded focus:outline-none focus:ring-2 focus:ring-white bg-green-800 text-white"
          />
        </>
      )}

      {loading && <p className="text-lg">Processing...</p>}

      {atsScore !== null && (
        <div className="bg-green-700 p-4 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">ATS Score: {atsScore}%</h2>

          <h3 className="font-bold mt-4 mb-2">Select Job Opportunities:</h3>
          <ul className="list-disc list-inside">
            {jobs.map((job, index) => (
              <li key={index} className="flex justify-between items-center mb-2">
                <span>
                  <strong>{job.title}</strong> at {job.company.display_name}
                </span>
                <button
                  onClick={() => handleBookmark(index)}
                  className={`ml-2 p-1 rounded-full border-2 ${
                    bookmarkedJobs.includes(index)
                      ? "bg-white text-green-800 border-white"
                      : "bg-green-800 text-white border-white"
                  }`}
                >
                  {bookmarkedJobs.includes(index) ? "✓" : "+"}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={findRecruiters}
            className="mt-4 p-2 bg-white text-green-800 rounded hover:bg-green-300 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Find Recruiters
          </button>

          {recruiters.length > 0 && (
            <div className="mt-4 text-left">
              <h3 className="font-bold mb-2">Potential Recruiters:</h3>
              <ul className="list-disc list-inside">
                {recruiters.map((recruiter, index) => (
                  <li key={index}>
                    <a
                      href={recruiter.profileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline hover:text-green-300"
                    >
                      {recruiter.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

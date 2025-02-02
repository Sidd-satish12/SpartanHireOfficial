chrome.runtime.onMessage.addListener(
    (request: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      if (request.action === "findRecruiters") {
        const recruiters = Array.from(document.querySelectorAll('a[href*="/in/"]'))
          .map((el) => ({
            name: el.textContent?.trim(),
            profileLink: (el as HTMLAnchorElement).href
          }))
          .filter((recruiter) =>
            /recruiter|talent|acquisition|senior|lead/i.test(recruiter.name || "")
          )
          .slice(0, 3);
  
        console.log("Recruiters Found:", recruiters);
        sendResponse({ recruiters }); // ✅ Correctly typed as a function now
      }
      return true; // ✅ Important: This keeps the messaging channel open for async responses
    }
  );
  
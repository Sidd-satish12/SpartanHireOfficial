chrome.runtime.onInstalled.addListener(() => {
    console.log("🚀 Extension Installed");
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ["contentScript.js"]
    });
  });
  
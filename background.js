chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle-whois-panel" });
    return;
  } catch {
    // Not injected yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle-whois-panel" });
  } catch {
    // ignore
  }
});

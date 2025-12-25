chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "toggle-whois-panel" }).catch(() => {
    // ignore (e.g. content script not injected on this page)
  });
});


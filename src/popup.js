document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.local.get(["key"], (result) => {
    if (result && result.key) {
      document.getElementById("openAiKey").value = result.key;
    }
  });

  document.getElementById("openAiKey").addEventListener("change", () => {
    chrome.storage.local.set({
      key: document.getElementById("openAiKey").value,
    });
  });

  chrome.storage.local.get(["videoLength"], (result) => {
    if (result && result.videoLength) {
      document.getElementById("videoLength").value = result.videoLength;
    }
  });

  document.getElementById("videoLength").addEventListener("change", () => {
    if (document.getElementById("videoLength").value < 1) {
      document.getElementById("videoLength").value = 1;
    }else if (document.getElementById("videoLength").value > 15) {
      document.getElementById("videoLength").value = 15;
    }
    chrome.storage.local.set({
      videoLength: document.getElementById("videoLength").value,
    });
  });

  document.getElementById("closeBtn").addEventListener("click", () => {
    window.close();
  });
});

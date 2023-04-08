let youtubeLeftControls, youtubePlayer;
let currentVideoId = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   removeSpinner();
  if (message.event === "show-button") {
    const { videoId } = message;
    currentVideoId = videoId;
    newVideoLoaded();
  } else if (message.event === "skip-ad") {
    const player = document.getElementsByTagName("video")[0];
    if (!isNaN(message.result) && message.result !== null) {
      player.currentTime = message.result;
    } else {
      alert("OpenAI error. Make sure your API key is correct");
    }
  } else if (
    message.event === "no-captions" ||
    message.event === "openai-error" ||
    message.event === "no-ads" ||
    message.event === "no-key"
  ) {
    alert(message.result);
  }
  return Promise.resolve("Dummy response to keep the console quiet");
});

function newVideoLoaded() {
  const removeAdbuttonExists =
    document.getElementsByClassName("ytp-ad-skip-btn")[0];
  if (!removeAdbuttonExists) {
    const removeAdButton = document.createElement("button");
    removeAdButton.className = "ytp-ad-skip-btn";
    removeAdButton.innerHTML = "Skip Promotion";
    removeAdButton.style.border = "2px solid #ffffff";
    removeAdButton.style.backgroundColor = "transparent";
    removeAdButton.style.color = "#ffffff";
    removeAdButton.style.borderRadius = "5px";
    removeAdButton.style.fontSize = "100%";
    removeAdButton.style.cursor = "pointer";
    removeAdButton.style.height = "70%";
    removeAdButton.style.marginLeft = "10px";
    removeAdButton.style.marginRight = "10px";
    removeAdButton.style.marginTop = "auto";
    removeAdButton.style.marginBottom = "auto";
    removeAdButton.addEventListener("mouseenter", function () {
      removeAdButton.style.backgroundColor = "white";
      removeAdButton.style.color = "black";
    });
    removeAdButton.addEventListener("mouseleave", function () {
      removeAdButton.style.backgroundColor = "transparent";
      removeAdButton.style.color = "white";
    });

    youtubeLeftControls =
      document.getElementsByClassName("ytp-left-controls")[0];
    youtubeLeftControls.appendChild(removeAdButton);
    removeAdButton.addEventListener("click", removeAdEventHandler);
  }
}

function removeAdEventHandler() {
  chrome.runtime.sendMessage({ event: "remove-ad", videoId: currentVideoId });
  //   addSpinner();
}

// function addSpinner() {
//   const spinner = document.createElement("span");
//   spinner.className = "skip-ad-spinner";
//   spinner.display = "inline-block";
//   spinner.style.border = "3px solid #f3f3f3"; /* Light grey */
//   spinner.style.borderTop = "3px solid #3498db"; /* Blue */
//   spinner.style.borderRadius = "50%";
//   spinner.style.width = "20px";
//   spinner.style.height = "20px";
//   spinner.style.animation = "spin 1s linear infinite";
//   spinner.style.marginRight = "5px";

//   const animationName = "spin";
//   const keyframes = `@keyframes ${animationName} {
//       from {
//         transform: rotate(0deg);
//       }
//       to {
//         transform: rotate(360deg);
//       }
//     }`;
//   const styleElement = document.createElement("style");
//   document.head.appendChild(styleElement);
//   styleElement.sheet.insertRule(keyframes);

//   youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
//   youtubeLeftControls.appendChild(spinner);
// }

// function removeSpinner() {
//   const spinner = document.getElementsByClassName("skip-ad-spinner")[0];
//   if (spinner) {
//     spinner.parentNode.removeChild(spinner);
//   }
// }

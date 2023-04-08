import "regenerator-runtime/runtime.js";
import he from "he";
import striptags from "striptags";
import { find } from "lodash";

const messages = [
  {
    role: "system",
    content:
      'You are a prediction AI model. You will receive a list of closed captions CC from a YouTube video in the form of a list of lines (each line seperated by a comma ","). The format of each line is `[start] text`. The `start` is a timestamp in seconds that indicates where the line starts in the video, and text is the text of the line. Your goal is to determine the start and end of the ad in the video. If the video contains an ad, you should output the `start` and `end` of the ad in the form of `[start] [end]`. If the video does not contain an ad, you should output `no ads`. You are not allowed under any circumstance to output anything other than these possibilities: `[start] [end]; `no ads`.',
  },
  { role: "system", content: "Example conversations:" },
  {
    role: "user",
    content:
      "[0] Hey guys, welcome back to my channel!, [4] Today we're going to be talking about fitness, [8] I want to tell you about our sponsor, Audible, [13] Sign up today and get your first audiobook for free!, [17] Now back to our topic, let's get moving and talk about the importance of fitness, [25] Fitness is not only good for your physical health, but also your mental health, [30] So whether you're a gym rat or a beginner, let's get started on our fitness journey together!",
  },
  { role: "assistant", content: "[8] [17]" },
  {
    role: "user",
    content:
      "[0] hi, science fans! [1] thanks for joining me on my science experiment [3] today, we are going to make a volcano with baking soda and vinegar [5] a volcano, is a natural phenomenon that occurs when magma erupts from the earth's crust [7] a volcano, is fascinating and powerful [9] it is this explosive reaction when we mix an acid and a base",
  },
  { role: "assistant", content: "no ads" },
  { role: "system", content: "Current conversation:" },
  { role: "user", content: "" },
];

async function getSubtitles({ videoID }) {
  try {
    const response = await fetch(`https:///www.youtube.com/watch?v=${videoID}`);
    const data = await response.text();
    // * ensure we have access to captions data
    if (!data.includes("captionTracks"))
      throw new Error(`Could not find captions for video: ${videoID}`);

    const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
    const [match] = regex.exec(data);
    const { captionTracks } = JSON.parse(`${match}}`);

    let language_code_list = [
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "nl",
      "sv",
      "fi",
      "no",
      "da",
      "tr",
      "ar",
      "zh",
      "ja",
      "ko",
      "hi",
      "he",
      "ru",
      "pl",
      "uk",
      "cs",
      "ro",
      "hu",
      "el",
      "th",
    ];

    let subtitle;

    for (let i = 0; i < language_code_list.length; i++) {
      const lang = language_code_list[i];
      subtitle =
      find(captionTracks, {
        vssId: `.${lang}`,
      }) ||
      find(captionTracks, {
        vssId: `a.${lang}`,
      }) ||
      find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));
      if (subtitle) break;
    }

    if (!subtitle && captionTracks.length > 0) {
      subtitle = captionTracks[0];
    }

    // * ensure we have found the correct subtitle lang
    // if (!subtitle || (subtitle && !subtitle.baseUrl))
    //   throw new Error(`Could not find ${lang} captions for ${videoID}`);

    const transcriptResponse = await fetch(subtitle.baseUrl);
    const transcript = await transcriptResponse.text();
    const lines = transcript
      .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', "")
      .replace("</transcript>", "")
      .split("</text>")
      .filter((line) => line && line.trim())
      .map((line) => {
        const startRegex = /start="([\d.]+)"/;
        const durRegex = /dur="([\d.]+)"/;

        const [, start] = startRegex.exec(line);
        const [, dur] = durRegex.exec(line);

        const htmlText = line
          .replace(/<text.+>/, "")
          .replace(/&amp;/gi, "&")
          .replace(/<\/?[^>]+(>|$)/g, "");

        const decodedText = he.decode(htmlText);
        const text = striptags(decodedText);

        return {
          start,
          dur,
          text,
        };
      });

    return lines;
  } catch (error) {
    console.log(error);
    return [];
  }
}

function isYoutubeUrl(url) {
  if (!url) {
    return false;
  } else if (!url.startsWith("http")) {
    return false;
  }
  const hostname = new URL(url).hostname;
  return hostname === "www.youtube.com"; // false if not youtube url
}

async function predictAd(videoId, tabId) {
  // get the subtitles

  const { key } = await chrome.storage.local.get(["key"]);
  if (!key) return "no key";

  const captions = await getSubtitles({ videoID: videoId });

  if (captions.length === 0) {
    return "no captions";
  }

  let subCaption = captions.filter((item) => item.start <= 300); // get the first 5 minutes of the video
  subCaption = subCaption
    .map((item) => {
      return `[${Math.round(item.start)}] ${item.text}`;
    })
    .join(", ");

  messages[messages.length - 1].content = subCaption;

  const OPENAI_API_KEY = key;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 20,
        temperature: 0,
      }),
    });
    const data = await response.json();
    const result = data.choices[0].message.content;
    if (!result) return "openai error";
    if (result.includes("no ads")) return "no ads";
    const endAdTime = result.match(/\d+/g)[1];
    if (!endAdTime) return "openai error";
    return endAdTime;
  } catch (error) {
    console.log(error);
    return "openai error";
  }
  // return "no ads";
}

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (
    changeInfo.status === "complete" &&
    tab.active &&
    tab.url.startsWith("http") &&
    isYoutubeUrl(tab.url)
  ) {
    const queryString = new URL(tab.url).search;
    const videoId = new URLSearchParams(queryString).get("v");
    if (!videoId) {
      // youtube url but not a youtube video
      return;
    }
    chrome.tabs.sendMessage(tab.id, { event: "show-button", videoId: videoId });
  }
});

chrome.runtime.onMessage.addListener(async function (
  message,
  sender,
  sendResponse
) {
  if (message.event === "remove-ad") {
    try {
      const result = await predictAd(message.videoId, sender.tab.id);
      if (result === "no captions") {
        sendResuls("no-captions", "The video has no English captions");
      } else if (result === "openai error") {
        sendResuls(
          "openai-error",
          "OpenAI error. Make sure your API key is correct"
        );
      } else if (result === "no ads") {
        sendResuls("no-ads", "No ads in this video in the first 5 minutes");
      } else if (result === "no key") {
        sendResuls(
          "no-key",
          "No OpenAI API key found. Please add your key in the extension options"
        );
      } else if (result) {
        sendResuls("skip-ad", result);
      }
    } catch (error) {
      console.log(error);
    }
  }

  function sendResuls(event, result) {
    chrome.tabs.sendMessage(sender.tab.id, {
      event: event,
      result: result,
    });
  }
  return Promise.resolve("Dummy response to keep the console quiet");
});

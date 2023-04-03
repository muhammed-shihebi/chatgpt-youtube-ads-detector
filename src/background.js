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

async function getSubtitles({ videoID, lang = "en" }) {
    try {
        const response = await fetch(
            `https:///www.youtube.com/watch?v=${videoID}`
        );
        const data = await response.text();
        // * ensure we have access to captions data
        if (!data.includes("captionTracks"))
            throw new Error(`Could not find captions for video: ${videoID}`);

        const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
        const [match] = regex.exec(data);
        const { captionTracks } = JSON.parse(`${match}}`);

        const subtitle =
            find(captionTracks, {
                vssId: `.${lang}`,
            }) ||
            find(captionTracks, {
                vssId: `a.${lang}`,
            }) ||
            find(
                captionTracks,
                ({ vssId }) => vssId && vssId.match(`.${lang}`)
            );

        // * ensure we have found the correct subtitle lang
        if (!subtitle || (subtitle && !subtitle.baseUrl))
            throw new Error(`Could not find ${lang} captions for ${videoID}`);

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
    return hostname === "www.youtube.com";
}

async function predictAd(videoId) {
    // get the subtitles
    const captions = await getSubtitles({ videoID: videoId });
    let subCaption = captions.filter((item) => item.start <= 200);
    subCaption = subCaption
        .map((item) => {
            return `[${Math.round(item.start)}] ${item.text}`;
        })
        .join(", ");

    messages[messages.length - 1].content = subCaption;

    const OPENAI_API_KEY =
        "";

    // try {
    // const response = await fetch(
    //     "https://api.openai.com/v1/chat/completions",
    //     {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //             Authorization: `Bearer ${OPENAI_API_KEY}`,
    //         },
    //         body: JSON.stringify({
    //             model: "gpt-3.5-turbo",
    //             messages: messages,
    //             max_tokens: 20,
    //             temperature: 0,
    //         }),
    //     }
    // );

    // const data = await response.json();
    // const result = data.choices[0].message.content;
    // return result;

    return "[8] [17]";

    // } catch (error) {
    //     console.log(error);
    //     return "error";
    // }
}

// Listen for changes to the current tab's URL
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    // Only run the code if the URL has finished loading and is not a bookmark or history entry
    if (
        changeInfo.status === "complete" &&
        tab.active &&
        tab.url.startsWith("http") &&
        isYoutubeUrl(tab.url)
    ) {
        const queryString = new URL(tab.url).search;
        const videoId = new URLSearchParams(queryString).get("v");
        if (!videoId) {
            console.log("No video id found");
            return;
        }
        const result = await predictAd(videoId);
        chrome.tabs.sendMessage(tab.id, { result });
    }
});

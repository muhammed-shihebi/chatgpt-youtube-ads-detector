chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.result) {
        // alert(message.result);
        const result = message.result;
        // get the second number from the result
        const time = result.match(/\d+/g)[1];
        console.log(time);
        const player = document.getElementsByTagName("video")[0];
        player.currentTime = time;
    }
});

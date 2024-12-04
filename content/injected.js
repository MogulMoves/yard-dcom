const frame = document.createElement("iframe");
frame.allow = "autoplay";
frame.id = "yard-frame";
frame.style.display = "none";
frame.src = document.currentScript.dataset.frame;
document.body.appendChild(frame);

/**
 * @param {string} event
 * @param {*} message
 */
function sendMessage(event, message) {
  frame.contentWindow?.postMessage(
    JSON.stringify({ event, ts: Date.now(), message }),
    "*"
  );
}

function getVideo() {
  /** @type {HTMLElement & { mediaPlayer: { currentTime: number } } | null} */
  const disneyPlayer = document.querySelector("disney-web-player");
  if (!disneyPlayer) return null;
  const videos = document.querySelectorAll("video");
  let biggestVideo;
  let biggestWidth = 0;
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const rect = video.getBoundingClientRect();
    if (rect.width > biggestWidth) {
      biggestWidth = rect.width;
      biggestVideo = video;
    }
  }
  if (!biggestVideo) return null;
  const title = document
    .querySelector(".title-field")
    ?.textContent.toLowerCase();
  if (!title) return null;
  return {
    disneyPlayer,
    video: biggestVideo,
    title,
  };
}

let loaded = false;
setInterval(() => {
  const videoDetails = getVideo();
  if (videoDetails && !loaded) {
    const matchingVideo = rssFeed.find((video) =>
      video.title.startsWith(videoDetails.title + " (")
    );
    if (!matchingVideo) return;

    loaded = true;
    sendMessage("loaded", matchingVideo);
    frame.style.display = "block";
    videoDetails.video.addEventListener("play", () => {
      sendMessage("play", {
        time: videoDetails.disneyPlayer.mediaPlayer.currentTime,
      });
    });
    videoDetails.video.addEventListener("pause", () => {
      sendMessage("pause");
    });
    videoDetails.video.addEventListener("timeupdate", () => {
      sendMessage("timeupdate", {
        time: videoDetails.disneyPlayer.mediaPlayer.currentTime,
      });
    });
    return;
  }
  if (!videoDetails && loaded) {
    sendMessage("unloaded");
    frame.style.display = "none";
    loaded = false;
  }
}, 250);

/** @type {Array<{ title: string; description: string; audioUrl: string; }>} */
let rssFeed = [];

window.addEventListener("message", (ev) => {
	if (!ev.data.__yard__) return;
	rssFeed = ev.data.rss;
});

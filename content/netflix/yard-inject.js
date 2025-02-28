const frame = document.createElement('iframe');
frame.allow = 'autoplay';
frame.id = 'yard-frame';
frame.style.display = 'none';
frame.src = document.currentScript.dataset.frame;
document.body.appendChild(frame);

/** @typedef {{ ts: number; } & ({ event: "loaded", message: { audioUrl: string } } | { event: "unloaded" | "pause", message: undefined } | { event: "play", message: { time: number } } | { event: "timeUpdate", message: { time: number } })} Message */

/**
 * @param {string} event
 * @param {Message} message
 */
function sendMessage(event, message) {
	frame.contentWindow?.postMessage(
		JSON.stringify({ event, ts: Date.now(), message }),
		'*',
	);
}

function getVideo() {
	const match = location.pathname.match(/watch\/(\d+)/);
	if (!match) return null;
	const id = match[1];
	if (!id) return null;

	// The biggest video is probably the one we're watching (sometimes there are hidden ones with size 0)
	const videos = document.querySelectorAll('video');
	/** @type {HTMLVideoElement | undefined} */
	let biggestVideo;
	if (videos.length > 1) {
		let biggestWidth = 0;
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i];
			const rect = video.getBoundingClientRect();
			if (rect.width > biggestWidth) {
				biggestWidth = rect.width;
				biggestVideo = video;
			}
		}
	} else {
		biggestVideo = videos[0];
	}
	if (!biggestVideo) return null;

	return {
		video: biggestVideo,
		id,
	};
}

let loaded = false;
setInterval(() => {
	const videoDetails = getVideo();
	if (videoDetails && !loaded) {
		const matchingVideo = rssFeed.find((video) =>
			video.description.includes(videoDetails.id),
		);
		if (!matchingVideo) {
			console.log(`[YARD] No matching video found for "${videoDetails.id}"`);
			return;
		}
		console.log(`[YARD] Video loaded: ${videoDetails.id}`);

		loaded = true;
		sendMessage('loaded', matchingVideo);
		frame.style.display = 'block';
		videoDetails.video.addEventListener('play', () => {
			sendMessage('play', {
				time: videoDetails.video.currentTime,
			});
		});
		videoDetails.video.addEventListener('pause', () => {
			sendMessage('pause');
		});
		videoDetails.video.addEventListener('timeupdate', () => {
			sendMessage('timeupdate', {
				time: videoDetails.video.currentTime,
			});
		});
		return;
	}
	if (!videoDetails && loaded) {
		console.log(`[YARD] Video unloaded`);
		sendMessage('unloaded');
		frame.style.display = 'none';
		loaded = false;
		return;
	}
}, 250);

/** @type {Array<{ title: string; description: string; audioUrl: string; }>} */
let rssFeed = [];

window.addEventListener(
	'message',
	(/** @type {MessageEvent<unknown>} */ ev) => {
		if (!ev.data.__yard__) return;
		console.log(
			`[YARD] Received RSS feed (${ev.data.rss.length} videos)`,
			ev.data.rss,
		);
		rssFeed = ev.data.rss;
	},
);

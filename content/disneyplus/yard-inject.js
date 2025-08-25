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
	/** @type {HTMLElement & { mediaPlayer: { currentTime: number } } | null} */
	const disneyPlayer = document.querySelector('disney-web-player');
	if (!disneyPlayer) return null;
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
	const title = document
		.querySelector('.title-field')
		?.textContent.toLowerCase();
	if (!title) return null;
	const id = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
		.exec(window.location.pathname)?.[0]
		?.toLowerCase();
	if (!id) return null;
	return {
		disneyPlayer,
		video: biggestVideo,
		title,
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
			console.log(`[YARD] No matching video found for "${videoDetails.title}"`);
			return;
		}
		console.log(
			`[YARD] Video loaded: ${videoDetails.title} (${matchingVideo.title})`,
		);

		loaded = true;
		sendMessage('loaded', matchingVideo);
		frame.style.display = 'block';
		videoDetails.video.addEventListener('play', () => {
			sendMessage('play', {
				// This is why we need to be injected - it's a web component
				time:
					videoDetails.disneyPlayer.mediaPlayer.timeline.info
						.playheadPositionMs / 1000,
			});
		});
		videoDetails.video.addEventListener('pause', () => {
			sendMessage('pause');
		});
		videoDetails.video.addEventListener('timeupdate', () => {
			sendMessage('timeupdate', {
				time:
					videoDetails.disneyPlayer.mediaPlayer.timeline.info
						.playheadPositionMs / 1000,
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

/**
 * @returns {'disneyplus' | 'netflix' | null}
 */
function getSite() {
	const host = location.hostname;
	if (host.includes('disneyplus.com')) return 'disneyplus';
	if (host.includes('netflix.com')) return 'netflix';
	return null;
}

// Inject the player monitor into the page
// (it needs to be injected because it accesses properties on the disney player)
const site = getSite();
if (site) {
	const script = document.createElement('script');
	script.dataset.frame = browser.runtime.getURL('audio/audio.html');
	script.src = browser.runtime.getURL(`content/${site}/yard-inject.js`);
	(document.head || document.documentElement).appendChild(script);
}

browser.storage.sync.get('rss').then((value) => {
	if (value.rss) updateRSS(value.rss);
});
browser.storage.onChanged.addListener((value) => {
	if (value.rss) updateRSS(value.rss.newValue);
});
/**
 * @param {string} url
 */
async function updateRSS(url) {
	const auth = new URL(url).searchParams.get('auth');
	if (!auth) {
		console.error('[YARD] Invalid RSS URL (missing auth parameter)');
		return;
	}

	// Simple CORS proxy to the RSS feed
	const res = await fetch('https://dcom-worker.mogul-moves.workers.dev', {
		headers: { Authorization: auth },
	});

	if (!res.ok) {
		console.error(`[YARD] Failed to fetch RSS feed: error ${res.status}`);
		return;
	}

	const rss = await res.text();
	const items = new DOMParser()
		.parseFromString(rss, 'text/xml')
		.querySelectorAll('item');

	/** @type {Array<{ title: string; description: string; audioUrl: string; }>} */
	const newVideos = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const title = item.querySelector('title')?.textContent.toLowerCase();
		const description = item.querySelector('description')?.textContent;
		const audioUrl = item.querySelector('enclosure')?.getAttribute('url');

		if (!title || !description || !audioUrl) continue;
		newVideos.push({ title, description, audioUrl });
	}
	window.postMessage({ __yard__: true, rss: newVideos }, '*');
}

let updatesNeeded = false;
async function checkForUpdates() {
	if (updatesNeeded) return;
	const currentVersion = browser.runtime.getManifest().version;

	const latestVersion = await fetch(
		'https://api.github.com/repos/MogulMoves/yard-dcom/releases/latest',
	)
		.then((res) => res.json())
		.then((data) => data.tag_name);

	console.log(
		`[YARD] Current version: ${currentVersion}, latest version: ${latestVersion}`,
	);

	if (!latestVersion) return;
	if (currentVersion === latestVersion) return;

	updatesNeeded = true;

	setInterval(() => {
		if (document.getElementById('yard-toast')) return;
		const toast = document.createElement('a');
		toast.href = 'https://github.com/MogulMoves/yard-dcom/releases/latest';
		toast.target = '_blank';
		toast.id = 'yard-toast';
		toast.innerText = `Yard update: ${latestVersion} (click here to download)`;
		document.body.appendChild(toast);
	}, 500);
}

console.log('[YARD] Version:', browser.runtime.getManifest().version);

checkForUpdates();
setInterval(checkForUpdates, 1000 * 60 * 60);

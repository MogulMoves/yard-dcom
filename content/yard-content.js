/**
 * @returns {'disneyplus' | null}
 */
function getSite() {
	const host = location.hostname;
	if (host.includes('disneyplus.com')) return 'disneyplus';
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
		headers: {
			Authorization: auth,
			Patreon: 'bingeandcringe',
		},
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

const script = document.createElement("script");
script.dataset.frame = browser.runtime.getURL("audio/audio.html");
script.src = browser.runtime.getURL('content/injected.js');
(document.head || document.documentElement).appendChild(script);

setInterval(() => {
	browser.storage.sync.get("rss").then((value) => {
		if (value.rss) updateRSS(value.rss);
	});
}, 10 * 1000);

browser.storage.sync.get("rss").then((value) => {
  if (value.rss) updateRSS(value.rss);
});
browser.storage.onChanged.addListener((value) => {
  if (value.rss) updateRSS(value.rss.newValue);
});

/**
 * @param {string} url
 */
async function updateRSS(url) {
  const auth = new URL(url).searchParams.get("auth");
  if (!auth) throw new Error("Invalid RSS URL");
  const rss = await fetch("https://dcom-worker.mogul-moves.workers.dev", {
    headers: { Authorization: auth },
  }).then((res) => res.text());
  const items = new DOMParser()
    .parseFromString(rss, "text/xml")
    .querySelectorAll("item");

	/** @type {Array<{ title: string; description: string; audioUrl: string; }>} */
  const newVideos = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.querySelector("title")?.textContent.toLowerCase();
    const description = item.querySelector("description")?.textContent;
    const audioUrl = item.querySelector("enclosure")?.getAttribute("url");
    if (!title || !description || !audioUrl) continue;
    newVideos.push({ title, description, audioUrl });
	}
	window.postMessage({ __yard__: true, rss: newVideos }, '*');
}

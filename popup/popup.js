const input = document.getElementById('rss');

input.addEventListener('input', () => {
	browser.storage.sync.set({ rss: input.value });
});

browser.storage.sync.get('rss').then((value) => {
	if (value.rss) input.value = value.rss;
});
browser.storage.onChanged.addListener((value) => {
	if (value.rss) input.value = value.rss.newValue;
});

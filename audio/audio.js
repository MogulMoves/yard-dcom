const audio = new Audio();

const pulse = document.querySelector('#pulse-wrapper');

window.addEventListener("message", (ev) => {
	/** @type {{ ts: number; } & ({ event: "loaded", message: { audioUrl: string } } | { event: "unloaded" | "pause", message: undefined } | { event: "play", message: { time: number } } | { event: "timeUpdate", message: { time: number } })} */
	const msg = JSON.parse(ev.data);

	const delay = (Date.now() - msg.ts) / 1000;

  switch (msg.event) {
    case "loaded":
      audio.src = msg.message.audioUrl;
      break;
    case "unloaded":
    case "pause":
			audio.pause();
			pulse.classList.remove('pulse');
      break;
		case "play":
			audio.currentTime = msg.message.time + delay;
			audio.play();
			pulse.classList.add('pulse');
      break;
    case "timeupdate": {
			const offset = audio.currentTime - (msg.message.time + delay);
			if (Math.abs(offset) > 1) {
				audio.currentTime = msg.message.time + delay;
			} else {
				audio.playbackRate = offset > 0.1 ? 0.9 : offset < -0.1 ? 1.1 : 1;
			}
      break;
    }
  }
});

/** @type {HTMLInputElement} */
const volume = document.querySelector("#volume");
volume.addEventListener("input", () => {
  audio.volume = volume.valueAsNumber;
});

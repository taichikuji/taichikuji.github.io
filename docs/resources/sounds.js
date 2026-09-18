const soundBaseUrl = new URL("db/", document.currentScript.src);
const linkClickSound = new Audio(new URL("click.mp3", soundBaseUrl));
const scrollSound = new Audio(new URL("scroll.mp3", soundBaseUrl));

linkClickSound.preload = "auto";
scrollSound.preload = "auto";

const play = (sound) => {
  sound.currentTime = 0;
  sound.play().catch(() => {});
};

let scrollTimer;
window.addEventListener("scroll", () => {
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => play(scrollSound), 66);
}, { passive: true });

document.addEventListener("click", (event) => {
  play(linkClickSound);
  const link = event.target instanceof Element ? event.target.closest("a") : null;
  const href = link?.getAttribute("href");
  if (!href?.startsWith("#")) return;

  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth" });
});

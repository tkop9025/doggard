const MAX_SPARKLES = 75;

document.addEventListener("mousemove", e => {
  const currentSparkles = document.querySelectorAll(".sparkle").length;
  if (currentSparkles >= MAX_SPARKLES) return;

  const sparkle = document.createElement("span");
  sparkle.className = "sparkle";
  sparkle.textContent = "✨";
  sparkle.style.position = "fixed";
  sparkle.style.left = e.clientX + "px";
  sparkle.style.top = e.clientY + "px";
  sparkle.style.pointerEvents = "none";
  sparkle.style.fontSize = "24px";
  sparkle.style.animation = "fade 1s linear forwards";
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 1000);
});

const style = document.createElement("style");
style.textContent = `
@keyframes fade {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-40px) scale(0); }
}`;
document.head.appendChild(style);

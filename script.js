const cards = [...document.querySelectorAll(".concept-card:not(.concept-card--city)")];
const finePointer = window.matchMedia("(pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function resetTilt(card) {
  card.style.setProperty("--tilt-x", "0deg");
  card.style.setProperty("--tilt-y", "0deg");
}

if (finePointer.matches && !reducedMotion.matches) {
  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty("--tilt-x", (y * -3.2).toFixed(2) + "deg");
      card.style.setProperty("--tilt-y", (x * 3.2).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", () => resetTilt(card));
  });
}

function toggleCard(card) {
  cards.forEach((item) => {
    if (item !== card) item.classList.remove("is-active");
  });
  card.classList.toggle("is-active");
  const status = card.querySelector(".concept-status");
  status.textContent = card.classList.contains("is-active")
    ? "СЦЕНА ЗАРЕЗЕРВИРОВАНА"
    : status.dataset.label;
}

cards.forEach((card) => {
  const status = card.querySelector(".concept-status");
  status.dataset.label = status.textContent;
  card.addEventListener("click", () => toggleCard(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCard(card);
    }
  });
});

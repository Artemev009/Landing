const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const scanLine = document.querySelector(".scan-line");
if (scanLine) {
  const scanLabels = [
    "Анализируем Reels",
    "Анализируем хук",
    "Анализируем основной сценарий",
    "Анализируем call to action",
    "Анализируем моушн-дизайн и визуальные хуки",
  ];
  let scanStep = 0;
  scanLine.addEventListener("animationiteration", () => {
    scanStep = (scanStep + 1) % scanLabels.length;
    scanLine.querySelector("span").textContent = scanLabels[scanStep];
  });
}

const finePointer = window.matchMedia("(pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (finePointer.matches && !reducedMotion.matches) {
  document.querySelectorAll(".project-stage").forEach((stage) => {
    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.transform = `perspective(1200px) rotateX(${y * -2.2}deg) rotateY(${x * 2.2}deg)`;
    });
    stage.addEventListener("pointerleave", () => {
      stage.style.transform = "perspective(1200px) rotateX(0) rotateY(0)";
    });
  });
}

document.querySelectorAll(".github-link").forEach((link) => {
  link.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const rect = link.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    link.style.transform = `translate(${x * 0.05}px, ${y * 0.08}px)`;
  });
  link.addEventListener("pointerleave", () => {
    link.style.transform = "";
  });
});

const bookingWidget = document.querySelector(".booking-widget");

if (bookingWidget) {
  const dateButtons = [...bookingWidget.querySelectorAll("[data-day]")];
  const timeButtons = [...bookingWidget.querySelectorAll("[data-time]")];
  const confirmButton = bookingWidget.querySelector(".booking-action");
  const confirmation = bookingWidget.querySelector(".booking-confirm");

  function selectOption(buttons, selected) {
    buttons.forEach((button) => {
      const active = button === selected;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    confirmation.hidden = true;
    confirmButton.hidden = false;
    const hasTime = timeButtons.some((button) => button.classList.contains("selected"));
    confirmButton.disabled = !hasTime;
    confirmButton.textContent = hasTime ? "Подтвердить бронь" : "Выберите время";
  }

  dateButtons.forEach((button) => {
    button.addEventListener("click", () => selectOption(dateButtons, button));
  });
  timeButtons.forEach((button) => {
    button.addEventListener("click", () => selectOption(timeButtons, button));
  });
  confirmButton.addEventListener("click", () => {
    if (confirmButton.disabled) return;
    confirmButton.hidden = true;
    confirmation.hidden = false;
  });
}

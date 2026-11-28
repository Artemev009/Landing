const tabs = [...document.querySelectorAll('.path-tabs [role="tab"]')];
const slides = [...document.querySelectorAll('.path-slide')];
const counter = document.querySelector('#slide-count');
const slider = document.querySelector('.path-slider');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let active = 0;
let rotation;

function showSlide(index, moveFocus = false) {
  active = (index + slides.length) % slides.length;
  slides.forEach((slide, position) => { slide.hidden = position !== active; });
  tabs.forEach((tab, position) => {
    const selected = position === active;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  if (moveFocus) tabs[active].focus();
}

function stopRotation() {
  if (rotation) window.clearInterval(rotation);
  rotation = undefined;
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => { stopRotation(); showSlide(index); });
  tab.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      stopRotation();
      showSlide(active + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });
});

document.querySelector('.slide-prev').addEventListener('click', () => { stopRotation(); showSlide(active - 1); });
document.querySelector('.slide-next').addEventListener('click', () => { stopRotation(); showSlide(active + 1); });

if (!reducedMotion.matches) {
  rotation = window.setInterval(() => showSlide(active + 1), 7000);
  slider.addEventListener('focusin', stopRotation, { once: true });
  slider.addEventListener('pointerenter', stopRotation, { once: true });
}

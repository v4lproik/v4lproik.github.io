"use strict";

(function () {
  const carousel = document.querySelector("[data-carousel]");

  if (!carousel) {
    return;
  }

  const track = carousel.querySelector("[data-carousel-track]");
  const slides = Array.from(carousel.querySelectorAll(".chapter-slide"));
  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const prevLabel = carousel.querySelector("[data-carousel-prev-label]");
  const nextLabel = carousel.querySelector("[data-carousel-next-label]");
  const pills = Array.from(carousel.querySelectorAll("[data-carousel-jump]"));
  const triggers = Array.from(document.querySelectorAll("[data-chapter-target]"));
  const viewport = carousel.querySelector("[data-carousel-viewport]");

  if (!track || !prevButton || !nextButton || !prevLabel || !nextLabel || !viewport || !slides.length) {
    return;
  }

  const idToIndex = new Map(slides.map((slide, index) => [slide.id, index]));
  let currentIndex = 0;

  function normalizeIndex(index) {
    return (index + slides.length) % slides.length;
  }

  function chapterTitle(index) {
    return slides[normalizeIndex(index)].dataset.chapterTitle || "";
  }

  function currentId() {
    return slides[currentIndex].id;
  }

  function updateButtons() {
    prevLabel.textContent = chapterTitle(currentIndex - 1);
    nextLabel.textContent = chapterTitle(currentIndex + 1);
  }

  function updateSlides() {
    track.style.transform = "translateX(-" + currentIndex * 100 + "%)";

    slides.forEach(function (slide, index) {
      const active = index === currentIndex;
      slide.setAttribute("aria-hidden", String(!active));
      slide.dataset.active = active ? "true" : "false";
    });

    pills.forEach(function (pill, index) {
      const active = index === currentIndex;
      pill.dataset.active = active ? "true" : "false";
      pill.setAttribute("aria-selected", String(active));
    });

    updateButtons();
  }

  function setIndex(index, options) {
    const settings = Object.assign({ updateHash: true, scrollIntoView: false }, options);
    currentIndex = normalizeIndex(index);
    updateSlides();

    if (settings.updateHash) {
      history.replaceState(null, "", "#" + currentId());
    }

    if (settings.scrollIntoView) {
      const section = document.getElementById("chapters");

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  prevButton.addEventListener("click", function () {
    setIndex(currentIndex - 1);
  });

  nextButton.addEventListener("click", function () {
    setIndex(currentIndex + 1);
  });

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      const index = Number(pill.getAttribute("data-carousel-jump"));

      if (!Number.isNaN(index)) {
        setIndex(index);
      }
    });
  });

  triggers.forEach(function (trigger) {
    const targetId = trigger.getAttribute("data-chapter-target");

    if (!targetId || !idToIndex.has(targetId)) {
      return;
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      setIndex(idToIndex.get(targetId), { scrollIntoView: true });
    });
  });

  viewport.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndex(currentIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setIndex(currentIndex + 1);
    }
  });

  window.addEventListener("hashchange", function () {
    const hash = window.location.hash.replace(/^#/, "");

    if (idToIndex.has(hash)) {
      setIndex(idToIndex.get(hash), { updateHash: false });
    }
  });

  const initialHash = window.location.hash.replace(/^#/, "");

  if (idToIndex.has(initialHash)) {
    setIndex(idToIndex.get(initialHash), { updateHash: false });
  } else {
    setIndex(0, { updateHash: false });
  }
})();

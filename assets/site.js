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
  const statusPrev = carousel.querySelector("[data-carousel-status-prev]");
  const statusNext = carousel.querySelector("[data-carousel-status-next]");
  const currentLabel = carousel.querySelector("[data-carousel-current-label]");
  const currentIndexLabel = carousel.querySelector("[data-carousel-current-index]");
  const totalLabel = carousel.querySelector("[data-carousel-total]");
  const pills = Array.from(carousel.querySelectorAll("[data-carousel-jump]"));
  const triggers = Array.from(document.querySelectorAll("[data-chapter-target]"));
  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const carouselSection = carousel.closest("[data-carousel-section]") || document.getElementById("notebook") || document.getElementById("chapters");

  if (!track || !prevButton || !nextButton || !prevLabel || !nextLabel || !viewport || !slides.length) {
    return;
  }

  const idToIndex = new Map(slides.map((slide, index) => [slide.id, index]));
  let currentIndex = 0;
  let swipeStartX = null;
  let swipePointerId = null;
  let resizeFrame = 0;

  carousel.dataset.carouselReady = "true";
  carousel.dataset.motion = "idle";

  if (totalLabel) {
    totalLabel.textContent = String(slides.length);
  }

  function normalizeIndex(index) {
    return (index + slides.length) % slides.length;
  }

  function chapterTitle(index) {
    return slides[normalizeIndex(index)].dataset.chapterTitle || "";
  }

  function currentId() {
    return slides[currentIndex].id;
  }

  function inferDirection(nextIndex) {
    if (nextIndex === currentIndex) {
      return 0;
    }

    if (currentIndex === 0 && nextIndex === slides.length - 1) {
      return -1;
    }

    if (currentIndex === slides.length - 1 && nextIndex === 0) {
      return 1;
    }

    return nextIndex > currentIndex ? 1 : -1;
  }

  function syncViewportHeight() {
    const activeSlide = slides[currentIndex];

    if (!activeSlide) {
      return;
    }

    carousel.style.setProperty("--chapter-viewport-height", activeSlide.offsetHeight + "px");
  }

  function scheduleViewportHeightSync() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(syncViewportHeight);
  }

  function updateLabels() {
    const previousTitle = chapterTitle(currentIndex - 1);
    const activeTitle = chapterTitle(currentIndex);
    const upcomingTitle = chapterTitle(currentIndex + 1);

    prevLabel.textContent = previousTitle;
    nextLabel.textContent = upcomingTitle;

    if (statusPrev) {
      statusPrev.textContent = previousTitle;
    }

    if (statusNext) {
      statusNext.textContent = upcomingTitle;
    }

    if (currentLabel) {
      currentLabel.textContent = activeTitle;
    }

    if (currentIndexLabel) {
      currentIndexLabel.textContent = String(currentIndex + 1);
    }
  }

  function updateSlides() {
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

    updateLabels();
    scheduleViewportHeightSync();
  }

  function setIndex(index, options) {
    const settings = Object.assign({ updateHash: true, scrollIntoView: false, animate: true, direction: null }, options);
    const nextIndex = normalizeIndex(index);
    const direction = settings.direction == null ? inferDirection(nextIndex) : settings.direction;

    carousel.dataset.motion = settings.animate ? (direction < 0 ? "prev" : direction > 0 ? "next" : "idle") : "idle";
    currentIndex = nextIndex;
    updateSlides();

    if (settings.updateHash) {
      history.replaceState(null, "", "#" + currentId());
    }

    if (settings.scrollIntoView) {
      if (carouselSection) {
        carouselSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  prevButton.addEventListener("click", function () {
    setIndex(currentIndex - 1, { direction: -1 });
  });

  nextButton.addEventListener("click", function () {
    setIndex(currentIndex + 1, { direction: 1 });
  });

  pills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      const index = Number(pill.getAttribute("data-carousel-jump"));

      if (!Number.isNaN(index)) {
        setIndex(index, { direction: inferDirection(normalizeIndex(index)) });
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
      setIndex(idToIndex.get(targetId), {
        direction: inferDirection(idToIndex.get(targetId)),
        scrollIntoView: true
      });
    });
  });

  viewport.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setIndex(currentIndex - 1, { direction: -1 });
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setIndex(currentIndex + 1, { direction: 1 });
    }
  });

  viewport.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    swipeStartX = event.clientX;
    swipePointerId = event.pointerId;
  });

  viewport.addEventListener("pointerup", function (event) {
    if (swipeStartX == null || swipePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - swipeStartX;
    swipeStartX = null;
    swipePointerId = null;

    if (Math.abs(deltaX) < 56) {
      return;
    }

    setIndex(currentIndex + (deltaX < 0 ? 1 : -1), { direction: deltaX < 0 ? 1 : -1 });
  });

  viewport.addEventListener("pointercancel", function () {
    swipeStartX = null;
    swipePointerId = null;
  });

  window.addEventListener("hashchange", function () {
    const hash = window.location.hash.replace(/^#/, "");

    if (idToIndex.has(hash)) {
      setIndex(idToIndex.get(hash), { updateHash: false, animate: false });
    }
  });

  window.addEventListener("resize", scheduleViewportHeightSync);

  const initialHash = window.location.hash.replace(/^#/, "");

  if (idToIndex.has(initialHash)) {
    setIndex(idToIndex.get(initialHash), { updateHash: false, animate: false });
  } else {
    setIndex(0, { updateHash: false, animate: false });
  }
})();

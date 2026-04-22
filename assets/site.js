"use strict";

(function () {
  const carousel = document.querySelector("[data-carousel]");

  if (!carousel) {
    return;
  }

  const track = carousel.querySelector("[data-carousel-track]");
  const slides = Array.from(carousel.querySelectorAll(".chapter-slide"));
  const prevButtons = Array.from(document.querySelectorAll("[data-carousel-prev]"));
  const nextButtons = Array.from(document.querySelectorAll("[data-carousel-next]"));
  const prevLabels = Array.from(document.querySelectorAll("[data-carousel-prev-label]"));
  const nextLabels = Array.from(document.querySelectorAll("[data-carousel-next-label]"));
  const triggers = Array.from(document.querySelectorAll("[data-chapter-target]"));
  const navLinks = Array.from(document.querySelectorAll(".site-header-nav .nav-link[data-nav-id]"));
  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const carouselSection = carousel.closest("[data-carousel-section]") || document.getElementById("notebook") || document.getElementById("chapters");
  const researchRoute = { title: "Research", href: "/research/index.html" };
  const chapterParam = "chapter";

  if (!track || !prevButtons.length || !nextButtons.length || !viewport || !slides.length) {
    return;
  }

  const idToIndex = new Map(slides.map((slide, index) => [slide.id, index]));
  let currentIndex = 0;
  let swipeStartX = null;
  let swipePointerId = null;
  let resizeFrame = 0;

  carousel.dataset.carouselReady = "true";
  carousel.dataset.motion = "idle";

  function normalizeIndex(index) {
    return (index + slides.length) % slides.length;
  }

  function chapterTitle(index) {
    return slides[normalizeIndex(index)].dataset.chapterTitle || "";
  }

  function currentId() {
    return slides[currentIndex].id;
  }

  function urlForChapter(chapterId) {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set(chapterParam, chapterId);
    return url.pathname + url.search;
  }

  function chapterFromLocation() {
    const url = new URL(window.location.href);
    const chapter = url.searchParams.get(chapterParam);

    if (chapter && idToIndex.has(chapter)) {
      return chapter;
    }

    const legacyHash = window.location.hash.replace(/^#/, "");

    if (legacyHash && idToIndex.has(legacyHash)) {
      return legacyHash;
    }

    return "";
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

  function setText(elements, value) {
    elements.forEach(function (element) {
      element.textContent = value;
    });
  }

  function navigateTo(url) {
    window.location.href = url;
  }

  function setScrollTop(value) {
    document.documentElement.scrollTop = value;
    document.body.scrollTop = value;
  }

  function scrollToTopTarget(options) {
    const settings = Object.assign({ behavior: "smooth" }, options);

    window.scrollTo({ top: 0, left: 0, behavior: settings.behavior });
    setScrollTop(0);

    window.requestAnimationFrame(function () {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      setScrollTop(0);
    });

    window.setTimeout(function () {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      setScrollTop(0);
    }, 120);
  }

  function updateLabels() {
    const previousTitle = currentIndex === 0 ? researchRoute.title : chapterTitle(currentIndex - 1);
    const upcomingTitle = currentIndex === slides.length - 1 ? researchRoute.title : chapterTitle(currentIndex + 1);

    setText(prevLabels, previousTitle);
    setText(nextLabels, upcomingTitle);
  }

  function updateActiveNav() {
    const activeId = currentId();

    navLinks.forEach(function (link) {
      const active = link.getAttribute("data-nav-id") === activeId;
      link.classList.toggle("is-active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateSlides() {
    slides.forEach(function (slide, index) {
      const active = index === currentIndex;
      slide.setAttribute("aria-hidden", String(!active));
      slide.dataset.active = active ? "true" : "false";
    });

    updateActiveNav();
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
      history.replaceState(null, "", urlForChapter(currentId()));
    }

    if (settings.scrollIntoView) {
      scrollToTopTarget();
    }
  }

  prevButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (currentIndex === 0) {
        navigateTo(researchRoute.href);
        return;
      }

      setIndex(currentIndex - 1, {
        direction: -1,
        scrollIntoView: button.getAttribute("data-carousel-scroll") === "true"
      });
    });
  });

  nextButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (currentIndex === slides.length - 1) {
        navigateTo(researchRoute.href);
        return;
      }

      setIndex(currentIndex + 1, {
        direction: 1,
        scrollIntoView: button.getAttribute("data-carousel-scroll") === "true"
      });
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

      if (currentIndex === 0) {
        navigateTo(researchRoute.href);
        return;
      }

      setIndex(currentIndex - 1, { direction: -1 });
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();

      if (currentIndex === slides.length - 1) {
        navigateTo(researchRoute.href);
        return;
      }

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

    if (deltaX < 0 && currentIndex === slides.length - 1) {
      navigateTo(researchRoute.href);
      return;
    }

    if (deltaX > 0 && currentIndex === 0) {
      navigateTo(researchRoute.href);
      return;
    }

    setIndex(currentIndex + (deltaX < 0 ? 1 : -1), { direction: deltaX < 0 ? 1 : -1 });
  });

  viewport.addEventListener("pointercancel", function () {
    swipeStartX = null;
    swipePointerId = null;
  });

  window.addEventListener("popstate", function () {
    const chapter = chapterFromLocation();

    if (idToIndex.has(chapter)) {
      setIndex(idToIndex.get(chapter), { updateHash: false, animate: false });
      scrollToTopTarget({ behavior: "auto" });
    }
  });

  window.addEventListener("resize", scheduleViewportHeightSync);

  const initialChapter = chapterFromLocation();

  if (idToIndex.has(initialChapter)) {
    setIndex(idToIndex.get(initialChapter), { updateHash: false, animate: false });
    history.replaceState(null, "", urlForChapter(initialChapter));
    scrollToTopTarget({ behavior: "auto" });
  } else {
    setIndex(0, { updateHash: false, animate: false });
    history.replaceState(null, "", urlForChapter(currentId()));
  }
})();

"use strict";

(function () {
  const headers = Array.from(document.querySelectorAll(".site-header"));
  const collapseThreshold = 56;
  const expandThreshold = 20;

  if (!headers.length) {
    return;
  }

  let frame = 0;
  let condensed = false;

  function syncHeaderDensity() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const nextCondensed = condensed ? scrollY > expandThreshold : scrollY > collapseThreshold;

    if (nextCondensed === condensed) {
      return;
    }

    condensed = nextCondensed;

    headers.forEach(function (header) {
      header.classList.toggle("is-condensed", condensed);
    });
  }

  function scheduleHeaderDensitySync() {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(syncHeaderDensity);
  }

  condensed = (window.scrollY || window.pageYOffset || 0) > collapseThreshold;

  headers.forEach(function (header) {
    header.classList.toggle("is-condensed", condensed);
  });

  window.addEventListener("scroll", scheduleHeaderDensitySync, { passive: true });
  window.addEventListener("resize", scheduleHeaderDensitySync);
})();

(function () {
  const roots = Array.from(document.querySelectorAll("[data-public-archive]"));

  roots.forEach(function (root) {
    const list = root.querySelector(".archive-list");
    const input = root.querySelector("[data-search-input]");
    const chips = Array.from(root.querySelectorAll("[data-filter-chip]"));
    const entries = Array.from(root.querySelectorAll("[data-entry]"));
    const countNode = root.querySelector("[data-result-count]");
    const emptyNode = root.querySelector("[data-empty-state]");
    const activeTags = new Set();

    if (!entries.length) {
      return;
    }

    if (list) {
      entries
        .slice()
        .sort(function (left, right) {
          const leftDate = Date.parse(left.getAttribute("data-sort-date") || "") || 0;
          const rightDate = Date.parse(right.getAttribute("data-sort-date") || "") || 0;
          return rightDate - leftDate;
        })
        .forEach(function (entry) {
          list.appendChild(entry);
        });
    }

    function syncChips() {
      chips.forEach(function (chip) {
        const tag = chip.getAttribute("data-filter-chip");
        const active = tag === "all" ? activeTags.size === 0 : activeTags.has(tag);
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
    }

    function applyFilters() {
      const query = input ? input.value.trim().toLowerCase() : "";
      let visible = 0;

      entries.forEach(function (entry) {
        const tags = (entry.getAttribute("data-tags") || "").split(/\s+/).filter(Boolean);
        const search = (entry.getAttribute("data-search") || "").toLowerCase();
        const tagMatch = activeTags.size === 0 || Array.from(activeTags).some(function (tag) {
          return tags.includes(tag);
        });
        const queryMatch = !query || search.includes(query);
        const show = tagMatch && queryMatch;

        entry.hidden = !show;
        if (show) {
          visible += 1;
        }
      });

      if (countNode) {
        countNode.textContent = visible + " " + (visible === 1 ? "result" : "results");
      }

      if (emptyNode) {
        emptyNode.classList.toggle("is-visible", visible === 0);
      }

      syncChips();
    }

    if (input) {
      input.addEventListener("input", applyFilters);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        const tag = chip.getAttribute("data-filter-chip") || "all";
        if (tag === "all") {
          activeTags.clear();
        } else if (activeTags.has(tag)) {
          activeTags.delete(tag);
        } else {
          activeTags.add(tag);
        }
        applyFilters();
      });
    });

    applyFilters();
  });
})();

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
  const chapterParam = "chapter";
  const cleanChapterRoutes = {
    "chapter-profile": "/",
    "chapter-chronology": "/careers/",
    "chapter-projects": "/projects/",
    "chapter-research": "/research/"
  };

  if (!track || !viewport || !slides.length) {
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
    url.searchParams.delete(chapterParam);

    if (window.location.protocol !== "file:" && cleanChapterRoutes[chapterId]) {
      return cleanChapterRoutes[chapterId];
    }

    url.hash = chapterId === slides[0].id ? "" : chapterId;
    return url.pathname + url.search + url.hash;
  }

  function chapterFromLocation() {
    const url = new URL(window.location.href);
    const path = url.pathname.replace(/\/index\.html$/, "/");

    for (const chapterId in cleanChapterRoutes) {
      if (cleanChapterRoutes[chapterId] === path) {
        return chapterId;
      }
    }

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

  function routeForChapter(chapterId) {
    if (chapterId === "chapter-profile") {
      return "index.html";
    }

    if (chapterId === "chapter-chronology") {
      return "careers/";
    }

    if (chapterId === "chapter-projects") {
      return "projects/";
    }

    if (chapterId === "chapter-research") {
      return "research/";
    }

    return "index.html";
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
    const previousSlide = slides[normalizeIndex(currentIndex - 1)];
    const upcomingSlide = slides[normalizeIndex(currentIndex + 1)];
    const previousTitle = chapterTitle(currentIndex - 1);
    const upcomingTitle = chapterTitle(currentIndex + 1);
    const previousHref = routeForChapter(previousSlide.id);
    const upcomingHref = routeForChapter(upcomingSlide.id);

    setText(prevLabels, previousTitle);
    setText(nextLabels, upcomingTitle);

    prevButtons.forEach(function (button) {
      button.setAttribute("href", previousHref);
    });

    nextButtons.forEach(function (button) {
      button.setAttribute("href", upcomingHref);
    });
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
      const nextUrl = urlForChapter(currentId());

      if (nextUrl !== window.location.pathname + window.location.search + window.location.hash) {
        history.pushState(null, "", nextUrl);
      }
    }

    if (settings.scrollIntoView) {
      scrollToTopTarget();
    }
  }

  prevButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();

      setIndex(currentIndex - 1, {
        direction: -1,
        scrollIntoView: button.getAttribute("data-carousel-scroll") === "true"
      });
    });
  });

  nextButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();

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

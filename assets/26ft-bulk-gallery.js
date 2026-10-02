(() => {
  const SELECTOR = '[data-service-carousel="true"][data-custom-gallery="26ft-bulk"]';

  const initialize = (carousel) => {
    if (carousel.dataset.galleryReady === 'true') return;

    const slides = [...carousel.querySelectorAll('[data-carousel-slide="true"]')];
    const thumbnails = [...carousel.querySelectorAll('[data-carousel-select]')];
    const previous = carousel.querySelector('[data-carousel-previous="true"]');
    const next = carousel.querySelector('[data-carousel-next="true"]');
    const toggle = carousel.querySelector('[data-carousel-toggle="true"]');
    const position = carousel.querySelector('[data-carousel-position="true"]');
    const overlayPosition = carousel.querySelector('[data-carousel-position-overlay="true"]');
    const view = carousel.querySelector('[data-carousel-view="true"]');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = Number(carousel.dataset.carouselInterval) || 5500;
    let activeIndex = Math.max(0, slides.findIndex((slide) => slide.dataset.active === 'true'));
    let playing = carousel.dataset.carouselAutoplay === 'true' && !prefersReducedMotion;
    let timer = 0;

    if (!slides.length || slides.length !== thumbnails.length) return;

    const updateToggle = () => {
      if (!toggle) return;
      toggle.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} 26ft Bulk Mobile Kitchen slideshow`);
    };

    const stopTimer = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };

    const startTimer = () => {
      stopTimer();
      if (!playing) return;
      timer = window.setInterval(() => show(activeIndex + 1), interval);
    };

    const show = (requestedIndex, pauseForSelection = false) => {
      activeIndex = (requestedIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.dataset.active = String(isActive);
        slide.toggleAttribute('aria-hidden', !isActive);
        const image = slide.querySelector('img');
        if (image) image.alt = isActive ? image.dataset.carouselAlt || '' : '';
      });

      thumbnails.forEach((thumbnail, index) => {
        thumbnail.setAttribute('aria-pressed', String(index === activeIndex));
      });

      const displayedPosition = String(activeIndex + 1);
      if (position) position.textContent = displayedPosition;
      if (overlayPosition) overlayPosition.textContent = displayedPosition;
      if (view) view.textContent = thumbnails[activeIndex].dataset.carouselViewLabel || 'Image';

      if (pauseForSelection) playing = false;
      updateToggle();
      startTimer();
    };

    carousel.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target || !carousel.contains(target)) return;

      if (target.matches('[data-carousel-next="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        show(activeIndex + 1, true);
      } else if (target.matches('[data-carousel-previous="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        show(activeIndex - 1, true);
      } else if (target.matches('[data-carousel-select]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        show(Number(target.dataset.carouselSelect), true);
      } else if (target.matches('[data-carousel-toggle="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        playing = !playing;
        updateToggle();
        startTimer();
      }
    }, true);

    carousel.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(activeIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
    });

    carousel.addEventListener('mouseenter', stopTimer);
    carousel.addEventListener('mouseleave', startTimer);
    carousel.addEventListener('focusin', stopTimer);
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) startTimer();
    });

    carousel.dataset.galleryReady = 'true';
    show(activeIndex);
  };

  const start = () => document.querySelectorAll(SELECTOR).forEach(initialize);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

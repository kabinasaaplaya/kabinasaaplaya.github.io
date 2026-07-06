// Lightbox for <image-slot> photos: click to enlarge to ~90% of the page
// (adapts to portrait/landscape), with zoom in/out (+ wheel + drag-pan),
// swipe/arrow navigation for data-gallery sets, and a visible close button.
// Excluded: the Home hero and slots inside links/buttons (those navigate).

let inited = false;

export function initLightbox() {
  if (inited) return;
  inited = true;

  const excluded = (slot) => (slot.id || '') === 'home-hero';

  const srcOf = (slot) => {
    if (!slot || !slot.hasAttribute('data-filled')) return null;
    const im = slot.shadowRoot && slot.shadowRoot.querySelector('.frame img');
    return (im && im.getAttribute('src')) || null;
  };

  let overlay = null, stage, imgEl, prevBtn, nextBtn, closeBtn, zinBtn, zoutBtn, counter, caption;
  let group = [], idx = 0;
  let scale = 1, panX = 0, panY = 0;

  const BTN = 'position:absolute;z-index:3;display:grid;place-items:center;width:48px;height:48px;' +
    'border-radius:999px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);' +
    'color:#fff;cursor:pointer;backdrop-filter:blur(6px);transition:background .25s ease;padding:0';

  // Nav arrows are bare chevrons (no circle enclosure), with a drop shadow
  // for visibility on any photo.
  const ARROW = 'position:absolute;z-index:3;display:grid;place-items:center;width:56px;height:72px;' +
    'border:none;background:none;color:#fff;cursor:pointer;padding:0;' +
    'font:200 52px/1 Helvetica,Arial,sans-serif;text-shadow:0 2px 14px rgba(0,0,0,.65);' +
    'transition:transform .25s ease,opacity .25s ease;opacity:.85';

  function applyZoom(animate) {
    imgEl.style.transition = animate ? 'transform .3s ease' : 'none';
    imgEl.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
    imgEl.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    zoutBtn.style.opacity = scale > 1 ? '1' : '.4';
    zinBtn.style.opacity = scale < 4 ? '1' : '.4';
  }

  function setZoom(next, animate) {
    scale = Math.min(4, Math.max(1, next));
    if (scale === 1) { panX = 0; panY = 0; }
    applyZoom(animate !== false);
  }

  function ensure() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.setAttribute('style',
      'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;' +
      'background:rgba(10,24,19,.93);backdrop-filter:blur(5px)');

    stage = document.createElement('div');
    stage.setAttribute('style', 'position:relative;display:flex;align-items:center;justify-content:center;' +
      'width:100vw;height:100vh;overflow:hidden');

    imgEl = document.createElement('img');
    imgEl.alt = 'Enlarged photo';
    imgEl.draggable = false;
    imgEl.setAttribute('style',
      'max-width:90vw;max-height:90vh;width:auto;height:auto;object-fit:contain;border-radius:14px;' +
      'box-shadow:0 30px 80px rgba(0,0,0,.55);user-select:none;-webkit-user-drag:none;touch-action:none');
    imgEl.addEventListener('click', (e) => e.stopPropagation());

    closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close photo');
    closeBtn.setAttribute('style', BTN + ';top:22px;right:22px');
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M4 4 L16 16 M16 4 L4 16"></path></svg>';

    zinBtn = document.createElement('button');
    zinBtn.setAttribute('aria-label', 'Zoom in');
    zinBtn.setAttribute('style', BTN + ';bottom:22px;right:22px;font:400 24px/1 Helvetica,Arial,sans-serif');
    zinBtn.textContent = '+';

    zoutBtn = document.createElement('button');
    zoutBtn.setAttribute('aria-label', 'Zoom out');
    zoutBtn.setAttribute('style', BTN + ';bottom:22px;right:80px;font:400 26px/1 Helvetica,Arial,sans-serif');
    zoutBtn.textContent = '−';

    prevBtn = document.createElement('button');
    prevBtn.setAttribute('aria-label', 'Previous photo');
    prevBtn.setAttribute('style', ARROW + ';left:16px;top:50%;transform:translateY(-50%)');
    prevBtn.textContent = '‹';

    nextBtn = document.createElement('button');
    nextBtn.setAttribute('aria-label', 'Next photo');
    nextBtn.setAttribute('style', ARROW + ';right:16px;top:50%;transform:translateY(-50%)');
    nextBtn.textContent = '›';

    counter = document.createElement('p');
    counter.setAttribute('style',
      'position:absolute;bottom:34px;left:50%;transform:translateX(-50%);margin:0;' +
      'font:700 13px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;color:rgba(255,255,255,.85)');

    caption = document.createElement('p');
    caption.setAttribute('style',
      'position:absolute;bottom:58px;left:50%;transform:translateX(-50%);margin:0;max-width:80vw;' +
      'font:400 13px/1.4 Helvetica,Arial,sans-serif;color:rgba(255,255,255,.75);text-align:center;' +
      'text-shadow:0 1px 8px rgba(0,0,0,.6)');

    for (const b of [closeBtn, zinBtn, zoutBtn]) {
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,.3)'; });
      b.addEventListener('mouseleave', () => { b.style.background = 'rgba(255,255,255,.12)'; });
    }
    for (const b of [prevBtn, nextBtn]) {
      b.addEventListener('mouseenter', () => { b.style.opacity = '1'; b.style.transform = 'translateY(-50%) scale(1.18)'; });
      b.addEventListener('mouseleave', () => { b.style.opacity = '.85'; b.style.transform = 'translateY(-50%)'; });
    }
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); nav(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nav(1); });
    zinBtn.addEventListener('click', (e) => { e.stopPropagation(); setZoom(scale + 0.5); });
    zoutBtn.addEventListener('click', (e) => { e.stopPropagation(); setZoom(scale - 0.5); });
    overlay.addEventListener('click', close);

    // double-click toggles zoom
    imgEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      setZoom(scale > 1 ? 1 : 2);
    });

    // wheel zoom
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoom(scale * (e.deltaY < 0 ? 1.15 : 0.87), false);
    }, { passive: false });

    // drag to pan when zoomed (mouse + touch via pointer events)
    let drag = null;
    imgEl.addEventListener('pointerdown', (e) => {
      if (scale <= 1) return;
      e.preventDefault();
      imgEl.setPointerCapture(e.pointerId);
      imgEl.style.cursor = 'grabbing';
      drag = { x: e.clientX - panX, y: e.clientY - panY };
    });
    imgEl.addEventListener('pointermove', (e) => {
      if (!drag) return;
      panX = e.clientX - drag.x;
      panY = e.clientY - drag.y;
      applyZoom(false);
    });
    const endDrag = () => { drag = null; if (imgEl) imgEl.style.cursor = scale > 1 ? 'grab' : 'zoom-in'; };
    imgEl.addEventListener('pointerup', endDrag);
    imgEl.addEventListener('pointercancel', endDrag);

    // touch swipe navigates only when not zoomed
    let tx = null;
    stage.addEventListener('touchstart', (e) => { if (scale === 1) tx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (tx == null || scale > 1) { tx = null; return; }
      const dx = e.changedTouches[0].clientX - tx;
      tx = null;
      if (Math.abs(dx) > 40 && group.length > 1) nav(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (!overlay || overlay.style.display === 'none') return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') nav(1);
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === '+' || e.key === '=') setZoom(scale + 0.5);
      else if (e.key === '-') setZoom(scale - 0.5);
    });

    stage.appendChild(imgEl);
    overlay.appendChild(stage);
    overlay.appendChild(closeBtn);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(zinBtn);
    overlay.appendChild(zoutBtn);
    overlay.appendChild(counter);
    overlay.appendChild(caption);
    document.body.appendChild(overlay);
  }

  function show(i) {
    idx = (i + group.length) % group.length;
    imgEl.src = group[idx].src;
    setZoom(1, false);
    const multi = group.length > 1;
    prevBtn.style.display = multi ? 'grid' : 'none';
    nextBtn.style.display = multi ? 'grid' : 'none';
    counter.textContent = multi ? (idx + 1) + ' / ' + group.length : '';
    caption.textContent = group[idx].credit ? 'Photo: ' + group[idx].credit : '';
    caption.style.bottom = multi ? '58px' : '34px';
  }

  function nav(d) { if (group.length > 1) show(idx + d); }

  function close() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function openFor(slot, src) {
    const creditOf = (el) => el.getAttribute('data-credit-text') || '';
    const gal = slot.getAttribute('data-gallery');
    let items = [{ src, credit: creditOf(slot) }];
    if (gal) {
      const set = [];
      document.querySelectorAll('image-slot[data-gallery="' + gal + '"]').forEach((el) => {
        const u = srcOf(el);
        if (u) set.push({ src: u, credit: creditOf(el) });
      });
      if (set.length) items = set;
    }
    group = items;
    ensure();
    show(Math.max(0, items.findIndex((it) => it.src === src)));
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // Programmatic opener for plain <img> carousels (photoshoots, hero
  // overlays). items: [{src, credit}].
  window.__ksaOpenGallery = (items, start) => {
    if (!items || !items.length) return;
    group = items;
    ensure();
    show(Math.max(0, Math.min(items.length - 1, start || 0)));
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  document.addEventListener('click', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    // clicks on the slot's admin controls (Adjust/Replace/Remove) never open
    if (path.some((n) => n && n.classList && n.classList.contains('ctl'))) return;
    const slot = path.find((n) => n && n.tagName === 'IMAGE-SLOT');
    if (!slot || excluded(slot) || slot.hasAttribute('data-reframe')) return;
    if (slot.closest('a, button')) return; // clickable cards navigate instead
    const src = srcOf(slot);
    if (!src) return;
    if (slot.hasAttribute('data-editable')) {
      // wait to be sure it isn't the start of a reframe double-click (admin mode)
      clearTimeout(slot.__lbTimer);
      slot.__lbTimer = setTimeout(() => openFor(slot, src), 280);
      slot.addEventListener('dblclick', () => clearTimeout(slot.__lbTimer), { once: true });
    } else {
      openFor(slot, src);
    }
  });
}

// Scroll-reveal: fades+lifts sections in as they enter the viewport.
export function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll('#dc-root section, #dc-root > div > header, #dc-root article');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const el = e.target;
        el.style.opacity = '1';
        el.style.transform = 'none';
        io.unobserve(el);
        // clear the inline styles once the entrance finishes so they don't
        // override class-based hover effects (e.g. .liftcard lift)
        setTimeout(() => {
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
          el.style.removeProperty('transition');
        }, 950);
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) continue; // already on screen: no flash
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
    io.observe(el);
  }
}

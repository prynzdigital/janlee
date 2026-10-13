/* Interiors by JanLee — site interactions (no dependencies) */
(() => {
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  // Header shadow on scroll
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile menu
  const menuBtn = $('.menu-btn');
  const setMenu = open => {
    d.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn?.addEventListener('click', () => setMenu(!d.body.classList.contains('menu-open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => e.matches && setMenu(false));

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal, .collage').forEach(el => io.observe(el));
  } else $$('.reveal, .collage').forEach(el => el.classList.add('is-in'));

  // Hero showcase: cross-fading slides, timed by the active progress bar's CSS animation
  const hero = $('[data-hero]');
  if (hero) {
    const slides = $$('.hero-slide', hero), dots = $$('.hf-dot', hero);
    const card = $('.hero-feature', hero), link = $('.hf-link', hero);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = 0;
    // load the other slides only after the page has finished loading
    const hydrate = () => slides.forEach(s => $$('[data-src],[data-srcset]', s).forEach(el => {
      if (el.dataset.srcset) el.srcset = el.dataset.srcset;
      if (el.dataset.src) el.src = el.dataset.src;
      el.removeAttribute('data-src'); el.removeAttribute('data-srcset');
    }));
    document.readyState === 'complete' ? setTimeout(hydrate, 300) : addEventListener('load', () => setTimeout(hydrate, 300));
    const go = n => {
      n = (n + slides.length) % slides.length;
      if (n === cur) return;
      const prev = slides[cur], next = slides[n];
      prev.classList.remove('is-active'); prev.classList.add('is-leaving'); prev.setAttribute('aria-hidden', 'true');
      setTimeout(() => prev.classList.remove('is-leaving'), 1500);
      next.classList.add('is-active'); next.removeAttribute('aria-hidden');
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === n); d.classList.toggle('is-done', i < n);
        i === n ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current');
      });
      card.classList.add('is-swapping');
      setTimeout(() => {
        $('.hf-name', card).textContent = next.dataset.name;
        $('.hf-meta', card).textContent = next.dataset.meta;
        link.href = next.dataset.url;
        card.classList.remove('is-swapping');
      }, 400);
      cur = n;
    };
    dots.forEach((d, i) => {
      d.addEventListener('click', () => go(i));
      $('i', d).addEventListener('animationend', () => { if (!reduce && i === cur) go(cur + 1); });
    });
    const pause = on => hero.classList.toggle('is-paused', on);
    card.addEventListener('mouseenter', () => pause(true));
    card.addEventListener('mouseleave', () => pause(false));
    hero.addEventListener('focusin', () => pause(true));
    hero.addEventListener('focusout', () => pause(false));
    d.addEventListener('visibilitychange', () => pause(d.hidden));
  }

  // Review "read more"
  $$('.review-more').forEach(b => b.addEventListener('click', () => {
    const r = b.closest('.review'); const open = r.classList.toggle('is-clamped') === false;
    b.textContent = open ? 'Show less' : 'Read more'; b.setAttribute('aria-expanded', open);
  }));

  // Carousel arrows
  const rail = $('[data-rail]');
  if (rail) {
    const step = dir => rail.scrollBy({ left: dir * (rail.firstElementChild.getBoundingClientRect().width + 24), behavior: 'smooth' });
    $('[data-rail-prev]')?.addEventListener('click', () => step(-1));
    $('[data-rail-next]')?.addEventListener('click', () => step(1));
  }

  // Portfolio filters
  const grid = $('[data-grid]');
  if (grid) {
    const btns = $$('.filter');
    const apply = f => {
      btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === f));
      $$('.card', grid).forEach(c => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
    };
    btns.forEach(b => b.addEventListener('click', () => {
      apply(b.dataset.filter);
      history.replaceState(null, '', b.dataset.filter === 'all' ? location.pathname : '#' + b.dataset.filter);
    }));
    const h = location.hash.slice(1);
    if (btns.some(b => b.dataset.filter === h)) apply(h);
  }

  // Lightbox
  const lb = $('.lightbox');
  if (lb && lb.showModal) {
    const items = $$('.g-item');
    const img = $('.lb-img', lb), count = $('.lb-count', lb);
    let i = 0;
    const show = n => {
      i = (n + items.length) % items.length;
      const it = items[i];
      img.classList.add('is-loading');
      img.onload = () => img.classList.remove('is-loading');
      img.src = it.dataset.src; img.width = it.dataset.w; img.height = it.dataset.h;
      img.alt = $('img', it).alt;
      count.textContent = `${i + 1} / ${items.length}`;
      [i + 1, i - 1].forEach(k => { const p = items[(k + items.length) % items.length]; if (p) new Image().src = p.dataset.src; });
    };
    $$('[data-open]').forEach(b => b.addEventListener('click', () => { show(+b.dataset.open); lb.showModal(); }));
    $('.lb-prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb-next', lb).addEventListener('click', () => show(i + 1));
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-fig')) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) show(i + (dx < 0 ? 1 : -1));
    });
  }

  // Contact form
  const form = $('#contact-form');
  if (form) {
    const status = $('.form-status', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      let bad = null;
      $$('[required]', form).forEach(f => {
        const ok = f.type === 'checkbox' ? f.checked : f.checkValidity() && f.value.trim();
        f.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = f;
      });
      if (bad) { status.className = 'form-status err'; status.textContent = 'Please complete the highlighted fields.'; bad.focus(); return; }
      const data = Object.fromEntries(new FormData(form));
      const thanks = () => { form.reset(); status.className = 'form-status ok'; status.textContent = 'Thank you! Your message has been sent — we’ll be in touch within 1 business day.'; };
      if (data._honey) return thanks(); // bot filled the hidden trap field: drop silently
      const mailto = () => {
        const body = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nZip: ${data.zip || ''}\nProject: ${data.project}\n\n${data.message}`;
        location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Design consultation request — ' + data.name)}&body=${encodeURIComponent(body)}`;
      };
      const endpoint = form.dataset.endpoint;
      if (!endpoint) { mailto(); status.className = 'form-status ok'; status.textContent = 'Opening your email app to send your message…'; return; }
      const btn = $('button[type=submit]', form);
      btn.disabled = true; status.className = 'form-status'; status.textContent = 'Sending…';
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        // FormSubmit answers 200 with success "true"/"false"; only treat an explicit success as sent
        if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || r.status);
        thanks();
      } catch {
        status.className = 'form-status err';
        status.innerHTML = `Sorry, your message couldn’t be sent. Please email <a href="mailto:${form.dataset.email}">${form.dataset.email}</a> or call <a href="${form.dataset.tel}">${form.dataset.phone}</a>.`;
      } finally { btn.disabled = false; }
    });
  }
})();

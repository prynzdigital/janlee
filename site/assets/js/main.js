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

  // Contact form — client-side validation + anti-spam. FormSubmit has no server-side rules,
  // so these checks stop honest mistakes and casual bots; the hidden _blacklist and honeypot help on their side.
  const form = $('#contact-form');
  if (form) {
    const status = $('.form-status', form);
    const btn = $('button[type=submit]', form);
    const msg = form.elements.message, count = $('#msg-count', form);
    const loadedAt = Date.now();
    const LIMIT = { cooldownMs: 60e3, perHour: 3 };
    const store = {
      get() { try { return JSON.parse(localStorage.getItem('jl-form') || '[]'); } catch { return []; } },
      add(t) { try { localStorage.setItem('jl-form', JSON.stringify([...this.get(), t].slice(-10))); } catch {} },
    };
    // strip control characters / invisible formatting chars, collapse runs of spaces
    const clean = (v, multiline) => String(v || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, '')
      .replace(multiline ? /[ \t]{2,}/g : /\s+/g, ' ').trim();
    const linkCount = v => (v.match(/https?:\/\/|www\.|\[url|<a\s/gi) || []).length;
    const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
    const rules = {
      name: v => !v ? 'Please enter your name.'
        : v.length < 2 ? 'Name must be at least 2 characters.'
        : v.length > 80 ? 'Name must be 80 characters or fewer.'
        : !/^[\p{L}][\p{L}\p{M} .,'’\-]*$/u.test(v) ? 'Please use letters only (spaces, hyphens and apostrophes are fine).' : '',
      email: v => !v ? 'Please enter your email address.'
        : v.length > 254 ? 'Email address is too long.'
        : !EMAIL.test(v) || /\.\./.test(v) ? 'Please enter a valid email address, e.g. name@example.com.' : '',
      phone: v => {
        const d = v.replace(/\D/g, '');
        if (!v) return 'Please enter your phone number.';
        if (/[^\d\s().+\-]/.test(v)) return 'Phone numbers can contain digits, spaces, ( ) + and - only.';
        if (d.length < 10 || d.length > 15) return 'Please enter a full phone number, including area code (10–15 digits).';
        return '';
      },
      zip: v => v && !/^\d{5}(-\d{4})?$/.test(v) ? 'Zip code should be 5 digits (or ZIP+4).' : '',
      message: v => !v ? 'Please tell us a little about your project.'
        : v.length < 10 ? `Please add a bit more detail (at least 10 characters — ${10 - v.length} to go).`
        : v.length > 2000 ? `Please shorten your message to 2,000 characters (currently ${v.length.toLocaleString()}).`
        : linkCount(v) > 2 ? 'Please include no more than 2 links in your message.' : '',
      consent: (_, el) => el.checked ? '' : 'Please tick the box so we can reply to you.',
    };
    const value = el => el.type === 'checkbox' ? el.checked : clean(el.value, el.name === 'message');
    const check = name => {
      const el = form.elements[name];
      const err = rules[name](value(el), el);
      el.setAttribute('aria-invalid', err ? 'true' : 'false');
      const slot = $('#err-' + name, form);
      if (slot) slot.textContent = err;
      return err;
    };
    // live feedback: counter while typing, field errors once a field has been left
    const updateCount = () => {
      const n = msg.value.length;
      count.textContent = `${n.toLocaleString()} / 2,000`;
      count.classList.toggle('is-near', n > 1800);
    };
    msg.addEventListener('input', updateCount); updateCount();
    Object.keys(rules).forEach(name => {
      const el = form.elements[name];
      el.addEventListener('blur', () => { if (el.type !== 'checkbox' && el.value) check(name); });
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => { if (el.getAttribute('aria-invalid') === 'true') check(name); });
    });
    // tidy US numbers on blur: 7199305245 -> (719) 930-5245
    form.elements.phone.addEventListener('blur', e => {
      const d = e.target.value.replace(/\D/g, '');
      if (d.length === 10) e.target.value = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    });

    const say = (cls, html) => { status.className = 'form-status ' + cls; status.innerHTML = html; };
    const fallback = `Please email <a href="mailto:${form.dataset.email}">${form.dataset.email}</a> or call <a href="${form.dataset.tel}">${form.dataset.phone}</a>.`;
    const thanks = () => {
      form.reset(); updateCount();
      $$('[aria-invalid]', form).forEach(f => f.removeAttribute('aria-invalid'));
      $$('.field-err', form).forEach(s => { s.textContent = ''; });
      say('ok', 'Thank you! Your message has been sent. A confirmation is on its way to your inbox, and JanLee will contact you within 1 business day.');
    };
    let sending = false;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      const errors = Object.keys(rules).map(n => [n, check(n)]).filter(([, er]) => er);
      if (errors.length) {
        say('err', errors.length === 1 ? errors[0][1] : `Please fix the ${errors.length} highlighted fields.`);
        form.elements[errors[0][0]].focus();
        return;
      }
      const raw = Object.fromEntries(new FormData(form));
      // bots: filled the hidden field, or submitted faster than a person could type
      if (raw._honey || Date.now() - loadedAt < 3000) return thanks();
      // per-browser rate limit
      const now = Date.now(), recent = store.get().filter(t => now - t < 3600e3);
      const last = recent[recent.length - 1];
      if (last && now - last < LIMIT.cooldownMs) {
        return say('err', `Your message was just sent. Please wait ${Math.ceil((LIMIT.cooldownMs - (now - last)) / 1000)} seconds before sending another.`);
      }
      if (recent.length >= LIMIT.perHour) return say('err', `You’ve reached the message limit for now. ${fallback}`);

      // send only known fields, cleaned and length-capped
      const data = {
        _subject: raw._subject, _template: raw._template, _captcha: raw._captcha, _blacklist: raw._blacklist, _honey: '',
        // confirmation email to the visitor; only sent once their address has passed validation above
        _autoresponse: raw._autoresponse,
        name: clean(raw.name).slice(0, 80),
        email: clean(raw.email).slice(0, 254),
        phone: clean(raw.phone).slice(0, 20),
        zip: clean(raw.zip).slice(0, 10),
        project: clean(raw.project).slice(0, 60),
        message: clean(raw.message, true).slice(0, 2000),
        consent: 'Yes — agreed to be contacted',
      };
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        const body = `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nZip: ${data.zip}\nProject: ${data.project}\n\n${data.message}`;
        location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Design consultation request — ' + data.name)}&body=${encodeURIComponent(body)}`;
        return say('ok', 'Opening your email app to send your message…');
      }
      sending = true; btn.disabled = true; say('', 'Sending…');
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const r = await fetch(endpoint, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(data), signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'strict-origin',
        });
        const j = await r.json().catch(() => ({}));
        // FormSubmit answers 200 with success "true"/"false"; only treat an explicit success as sent
        if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || `HTTP ${r.status}`);
        store.add(Date.now());
        thanks();
      } catch (err) {
        // the service's reason (e.g. "This form needs Activation…") is logged for troubleshooting
        console.warn('[contact form] not delivered:', err && err.message);
        const reason = (err && err.message) || '';
        say('err', (/activat/i.test(reason) ? 'Our contact form is being activated and your message couldn’t be delivered yet. '
          : err && err.name === 'AbortError' ? 'The connection timed out. '
          : 'Sorry, your message couldn’t be sent. ') + fallback);
      } finally { clearTimeout(timer); sending = false; btn.disabled = false; }
    });
  }
})();

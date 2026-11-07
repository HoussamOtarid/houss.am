// Motion for houss.am, see motion.css. Runs only when the head script set html.m (JS on, no reduced-motion request).
// If anything here fails, the page falls back to the static version instead of staying hidden.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('m')) return;
  const cleanups = [];
  const showStatic = () => {
    cleanups.forEach((undo) => undo());
    root.classList.remove('m');
  };

  try {
    // Arriving from the other language: the view transition already animates the switch.
    const swapKey = 'm-swap';
    const swapped = sessionStorage.getItem(swapKey) === '1';
    sessionStorage.removeItem(swapKey);
    document.querySelector('.lang a')?.addEventListener('click', () => sessionStorage.setItem(swapKey, '1'));
    if (swapped) return showStatic();

    const LINE_STAGGER = 0.09; // s, matches motion.css
    const span = (className, textContent = '') => Object.assign(document.createElement('span'), { className, textContent });

    // Dates: each digit becomes a short rolling column ending on that digit. The plain text comes back once it has
    // rolled, so search, copy and screen readers see the real date (and the aria-label covers the rolling moment).
    const restoreDate = new Map();
    for (const el of document.querySelectorAll('.when')) {
      const text = el.textContent;
      if (!/\d/.test(text)) continue;
      let k = 0;
      el.replaceChildren(...[...text].map((ch) => {
        if (!/\d/.test(ch)) return ch;
        const steps = 3 + (k % 2);
        const dg = span('dg');
        dg.dataset.delay = k++ * 0.03;
        dg.style.setProperty('--n', steps);
        const col = span('');
        for (let j = 0; j <= steps; j++) col.append(Object.assign(document.createElement('i'), { textContent: (+ch - steps + j + 20) % 10 }));
        dg.append(col);
        return dg;
      }));
      el.setAttribute('aria-label', text);
      const undo = () => { el.textContent = text; el.removeAttribute('aria-label'); };
      restoreDate.set(el, undo);
      cleanups.push(undo);
    }

    function reveal(el, delay) {
      el.style.setProperty('--delay', `${delay}s`);
      el.classList.add('in');
      for (const w of el.querySelectorAll('.when')) {
        const undo = restoreDate.get(w);
        if (!undo) continue;
        let last = 0;
        for (const dg of w.querySelectorAll('.dg')) {
          const d = delay + 0.05 + +dg.dataset.delay;
          last = Math.max(last, d);
          dg.style.setProperty('--dd', `${d}s`);
          requestAnimationFrame(() => requestAnimationFrame(() => dg.classList.add('go')));
        }
        setTimeout(undo, (last + 0.8) * 1000);
      }
    }

    // Intro: split into its real lines once the serif has loaded, rise them one by one, then put the plain text back.
    const intro = document.querySelector('.intro');
    const introText = intro.textContent;
    cleanups.push(() => { intro.textContent = introText; });
    function splitLines() {
      const words = introText.trim().split(/\s+/).map((w) => span('', w));
      intro.replaceChildren(...words.flatMap((w, i) => (i ? [' ', w] : [w])));
      const lines = [];
      let top = null;
      for (const w of words) {
        if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
        lines.at(-1).push(w.textContent);
      }
      intro.replaceChildren(...lines.map((words, i) => {
        const inner = span('', words.join(' '));
        inner.style.setProperty('--i', i);
        const line = span('ln');
        line.append(inner);
        return line;
      }));
      document.querySelectorAll('.bar li, .bar .lang').forEach((el, i) => {
        el.style.setProperty('--d', `${0.25 + lines.length * LINE_STAGGER}s`);
        el.style.setProperty('--i', i);
      });
      root.classList.add('go');
      setTimeout(() => { intro.textContent = introText; }, (0.12 + lines.length * LINE_STAGGER + 1.1) * 1000);
      return lines.length;
    }

    const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]);
    fontsReady.then(() => {
      const entranceEnd = 0.35 + splitLines() * LINE_STAGGER;
      // Sections: what's on screen in the first moments follows the entrance in order; the rest draws in when
      // scrolled to, rows arriving together a beat apart.
      let batch = 0;
      let batchTimer;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          reveal(e.target, (performance.now() < 2500 ? entranceEnd : 0) + batch++ * 0.07);
          clearTimeout(batchTimer);
          batchTimer = setTimeout(() => (batch = 0), 120);
        }
      }, { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('h2, .item, .skill, footer').forEach((el) => io.observe(el));
    }).catch(showStatic);
  } catch {
    showStatic();
  }
})();

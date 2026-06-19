// content.js — runs automatically on every Google Form
// No clicks, no setup, no console. Just works.

(function () {
  'use strict';

  if (window.__afRunning) return;
  window.__afRunning = true;

  const TEXT_FILL = '.';
  const EK = ['professional elective', 'open elective', 'elective'];

  let filling  = false;
  let lastSig  = '';
  let isP1     = true;
  let badge    = null;

  // ── Helpers ────────────────────────────────────────────────
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function mk(tag, css, txt) {
    const el = document.createElement(tag);
    if (css) el.style.cssText = css;
    if (txt) el.textContent   = txt;
    return el;
  }

  // ── Badge ──────────────────────────────────────────────────
  function showBadge(line1, line2, bg) {
    if (!badge) {
      badge = mk('div', [
        'position:fixed', 'bottom:20px', 'right:20px',
        'z-index:2147483647', 'padding:13px 18px',
        'border-radius:14px',
        'font-family:Google Sans,Roboto,sans-serif',
        'font-size:14px', 'font-weight:500', 'color:#fff',
        'max-width:320px', 'line-height:1.6',
        'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
        'cursor:pointer', 'transition:background 0.3s',
      ].join(';'));
      badge.onclick = () => { badge.style.display = 'none'; };
      document.body.appendChild(badge);
    }
    while (badge.firstChild) badge.removeChild(badge.firstChild);
    badge.appendChild(document.createTextNode(line1));
    if (line2) {
      badge.appendChild(document.createElement('br'));
      const s = mk('span', 'font-size:12px;font-weight:400;opacity:0.88', line2);
      badge.appendChild(s);
    }
    badge.style.background = bg || '#1a73e8';
    badge.style.display    = 'block';
  }

  // ── Page detection ─────────────────────────────────────────
  function isElective() {
    return EK.some(k => document.body.innerText.toLowerCase().includes(k));
  }

  function looksLikePage1() {
    const radios = document.querySelectorAll('[role="radiogroup"]').length;
    const texts  = document.querySelectorAll('input[type="text"], textarea').length;
    return radios === 0 && texts > 0;
  }

  function getSignature() {
    const groups = document.querySelectorAll('[role="radiogroup"]');
    return [...groups].map(g => g.textContent.trim().slice(0, 50)).join('|');
  }

  // ── Fill functions ─────────────────────────────────────────
  async function fillRadio(skipFirst) {
    let t = 0;
    while (!document.querySelector('[role="radiogroup"]') && t++ < 15) {
      await sleep(400);
    }
    const groups = [...document.querySelectorAll('[role="radiogroup"]')];
    for (let i = 0; i < groups.length; i++) {
      if (skipFirst && i === 0) continue;
      let opts = [];
      for (let j = 0; j < 15; j++) {
        opts = [...groups[i].querySelectorAll('[role="radio"]')];
        if (opts.length >= 2) break;
        await sleep(300);
      }
      if (!opts.length) continue;
      opts[opts.length - 1].click();
      await sleep(450);
    }
  }

  async function fillCheckbox(skipFirst) {
    const groups = [...document.querySelectorAll('[role="group"]')];
    for (let i = 0; i < groups.length; i++) {
      if (skipFirst && i === 0) continue;
      const boxes = [...groups[i].querySelectorAll('[role="checkbox"]')];
      if (!boxes.length) continue;
      const last = boxes[boxes.length - 1];
      if (last.getAttribute('aria-checked') !== 'true') last.click();
      await sleep(300);
    }
  }

  async function fillDropdown(skipFirst) {
    const dds = [...document.querySelectorAll('[role="listbox"]')];
    for (let i = 0; i < dds.length; i++) {
      if (skipFirst && i === 0) continue;
      dds[i].click();
      await sleep(500);
      const opts = [...document.querySelectorAll('[role="option"]')];
      if (opts.length) opts[opts.length - 1].click();
      await sleep(400);
    }
  }

  async function fillText() {
    const inputs = document.querySelectorAll(
      'input[type="text"]:not([aria-hidden="true"]):not([readonly])'
    );
    for (const inp of inputs) {
      if (!inp.value) {
        inp.focus();
        inp.value = TEXT_FILL;
        inp.dispatchEvent(new InputEvent('input',  { bubbles: true }));
        inp.dispatchEvent(new InputEvent('change', { bubbles: true }));
        await sleep(150);
      }
    }
    for (const ta of document.querySelectorAll('textarea')) {
      if (!ta.value) {
        ta.focus();
        ta.value = TEXT_FILL;
        ta.dispatchEvent(new InputEvent('input',  { bubbles: true }));
        ta.dispatchEvent(new InputEvent('change', { bubbles: true }));
        await sleep(150);
      }
    }
  }

  async function clickNext() {
    await sleep(600);
    const btns   = [...document.querySelectorAll('[role="button"]')];
    const next   = btns.find(b => /^next$/i.test(b.textContent.trim()));
    const submit = btns.find(b => /^submit$/i.test(b.textContent.trim()));
    if (next)   { next.click();        return 'next';   }
    if (submit) { showSubmit(submit);  return 'submit'; }
    return 'none';
  }

  // ── Popups ─────────────────────────────────────────────────
  function showSubmit(btn) {
    const o = mk('div', [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:2147483647', 'background:#fff',
      'border:2px solid #1a73e8', 'border-radius:16px',
      'padding:28px 32px', 'text-align:center',
      'font-family:Google Sans,Roboto,sans-serif',
      'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
      'min-width:280px',
    ].join(';'));
    o.appendChild(mk('div', 'font-size:32px;margin-bottom:10px', '✅'));
    o.appendChild(mk('div', 'font-size:16px;font-weight:600;color:#202124;margin-bottom:6px', 'All pages filled!'));
    o.appendChild(mk('div', 'font-size:13px;color:#5f6368;margin-bottom:20px', 'Review or submit now.'));
    const bs = mk('button', 'background:#1a73e8;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;margin-right:8px', 'Submit');
    bs.onclick = () => { btn.click(); o.remove(); };
    const br = mk('button', 'background:#f1f3f4;color:#202124;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer', 'Review first');
    br.onclick = () => o.remove();
    o.appendChild(bs); o.appendChild(br);
    document.body.appendChild(o);
  }

  function showElective(cb) {
    const ex = document.getElementById('af-ep');
    if (ex) ex.remove();
    const p = mk('div', [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:2147483647', 'background:#fff',
      'border:2px solid #f29900', 'border-radius:16px',
      'padding:24px 28px', 'text-align:center',
      'font-family:Google Sans,Roboto,sans-serif',
      'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
      'min-width:300px', 'max-width:360px',
    ].join(';'));
    p.id = 'af-ep';
    p.appendChild(mk('div', 'font-size:30px;margin-bottom:10px', '✋'));
    p.appendChild(mk('div', 'font-size:15px;font-weight:600;color:#202124;margin-bottom:8px', 'Select your elective subject'));
    p.appendChild(mk('div', 'font-size:13px;color:#5f6368;margin-bottom:18px;line-height:1.5', 'Pick question 1 manually, then click Done.'));
    const bd = mk('button', 'background:#f29900;color:#fff;border:none;border-radius:8px;padding:11px 24px;font-size:14px;font-weight:500;cursor:pointer;width:100%;margin-bottom:8px', 'Done — Auto-fill rest');
    bd.onclick = () => { p.remove(); cb(false); };
    const bs = mk('button', 'background:none;border:none;color:#5f6368;font-size:12px;cursor:pointer;text-decoration:underline;width:100%', 'Skip — fill everything including Q1');
    bs.onclick = () => { p.remove(); cb(true); };
    p.appendChild(bd); p.appendChild(bs);
    document.body.appendChild(p);
  }

  // ── Main runner ────────────────────────────────────────────
  async function run() {
    if (filling) return;
    filling = true;

    if (isElective()) {
      showBadge('✋ Select your subject!', 'Pick Q1 manually then click Done', '#f29900');
      const fillAll = await new Promise(res => showElective(all => res(all)));
      showBadge('⚡ Auto-filling rest...', '', '#1a73e8');
      await sleep(600);
      await fillRadio(!fillAll);
      await fillCheckbox(!fillAll);
      await fillDropdown(!fillAll);
      await fillText();
    } else {
      showBadge('⚡ Auto-filling...', '', '#1a73e8');
      await sleep(1500);
      await fillRadio(false);
      await fillCheckbox(false);
      await fillDropdown(false);
      await fillText();
    }

    showBadge('✅ Done! Moving to next page...', '', '#34a853');
    await sleep(800);
    await clickNext();
    filling = false;
  }

  // ── MutationObserver — watches all page changes ────────────
  new MutationObserver(async () => {
    if (filling) return;
    if (looksLikePage1()) { isP1 = true; return; }

    const sig = getSignature();
    if (!sig || sig === lastSig) return;
    lastSig = sig;

    if (isP1) {
      isP1 = false;
      console.log('[AF] Moved past page 1 — starting auto-fill');
    }
    await run();

  }).observe(document.body, {
    childList:     true,
    subtree:       true,
    attributes:    true,
    characterData: true,
  });

  // ── Init ───────────────────────────────────────────────────
  (async () => {
    await sleep(800);

    // Tick email consent checkbox
    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      if (!cb.checked) { cb.click(); await sleep(200); }
    }

    const hasRadios = document.querySelectorAll('[role="radiogroup"]').length > 0;
    if (hasRadios) {
      isP1    = false;
      lastSig = getSignature();
      await run();
    } else {
      showBadge(
        '📋 AutoFill is active!',
        'Fill page 1 → click Next → rest is automatic',
        '#f29900'
      );
    }
  })();

})();

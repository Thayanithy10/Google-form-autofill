// ==UserScript==
// @name         Google Form Auto-Filler v6
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Auto-fills Google Forms. Pauses on elective pages for manual subject selection.
// @author       You
// @match        https://docs.google.com/forms/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TEXT_FILL  = '.';
  const FILL_DELAY = 1500;

  // ── Keywords that identify "choose your subject" pages ────
  // If the page heading contains any of these words, script will
  // PAUSE and wait for you to pick question 1 manually
  const ELECTIVE_KEYWORDS = [
    'professional elective',
    'open elective',
    'professional elective',
    'elective',
  ];

  let isFilling = false;
  let lastSig   = '';
  let badgeEl   = null;

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Badge ──────────────────────────────────────────────────
  function showBadge(line1, line2, bg) {
    if (!badgeEl) {
      badgeEl = document.createElement('div');
      badgeEl.style.cssText = [
        'position:fixed','bottom:20px','right:20px','z-index:2147483647',
        'padding:14px 18px','border-radius:12px',
        'font-family:Google Sans,Roboto,sans-serif',
        'font-size:14px','font-weight:500','color:#fff',
        'max-width:320px','line-height:1.6',
        'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
        'cursor:pointer',
      ].join(';');
      badgeEl.onclick = () => { badgeEl.style.display = 'none'; };
      document.body.appendChild(badgeEl);
    }
    while (badgeEl.firstChild) badgeEl.removeChild(badgeEl.firstChild);
    badgeEl.appendChild(document.createTextNode(line1));
    if (line2) {
      badgeEl.appendChild(document.createElement('br'));
      const s = document.createElement('span');
      s.style.cssText = 'font-size:12px;font-weight:400;opacity:0.92';
      s.textContent = line2;
      badgeEl.appendChild(s);
    }
    badgeEl.style.background = bg || '#1a73e8';
    badgeEl.style.display = 'block';
  }

  // ── Detect if this page is an elective page ───────────────
  function isElectivePage() {
    // Check all headings / section titles on the page
    const headings = document.querySelectorAll(
      '[role="heading"], .freebirdFormviewerViewHeaderTitle, ' +
      '.freebirdFormviewerViewItemsItemItemTitle'
    );
    const pageText = document.body.innerText.toLowerCase();

    return ELECTIVE_KEYWORDS.some(kw => pageText.includes(kw.toLowerCase()));
  }

  // ── Get the first radio group (subject selection question) ─
  function getFirstRadioGroup() {
    const groups = document.querySelectorAll('[role="radiogroup"]');
    return groups.length > 0 ? groups[0] : null;
  }

  // ── Check if first question is already answered ────────────
  function isFirstQuestionAnswered() {
    const firstGroup = getFirstRadioGroup();
    if (!firstGroup) return true;
    const selected = firstGroup.querySelector('[role="radio"][aria-checked="true"]');
    return selected !== null;
  }

  // ── Show elective pause popup with "Done" button ──────────
  function showElectivePause(onDone) {
    // Remove existing popup if any
    const existing = document.getElementById('af-elective-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'af-elective-popup';
    popup.style.cssText = [
      'position:fixed','top:50%','left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:2147483647','background:#fff',
      'border:2px solid #f29900','border-radius:16px',
      'padding:24px 28px','text-align:center',
      'font-family:Google Sans,Roboto,sans-serif',
      'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
      'min-width:300px','max-width:360px',
    ].join(';');

    const mkEl = (tag, css, text) => {
      const el = document.createElement(tag);
      if (css)  el.style.cssText = css;
      if (text) el.textContent = text;
      return el;
    };

    popup.appendChild(mkEl('div', 'font-size:30px;margin-bottom:10px', '✋'));
    popup.appendChild(mkEl('div', 'font-size:15px;font-weight:600;color:#202124;margin-bottom:8px', 'Select your elective subject'));
    popup.appendChild(mkEl('div', 'font-size:13px;color:#5f6368;margin-bottom:18px;line-height:1.5',
      'Question 1 asks which subject you opted for. Please select it manually, then click "Done — Auto-fill rest".'));

    const btn = mkEl('button',
      'background:#f29900;color:#fff;border:none;border-radius:8px;padding:11px 24px;font-size:14px;font-weight:500;cursor:pointer;width:100%',
      'Done — Auto-fill rest'
    );
    btn.onclick = () => {
      popup.remove();
      onDone();
    };

    popup.appendChild(btn);

    const skipBtn = mkEl('button',
      'background:none;border:none;color:#5f6368;font-size:12px;cursor:pointer;margin-top:10px;text-decoration:underline;width:100%',
      'Skip — auto-fill everything including question 1'
    );
    skipBtn.onclick = () => {
      popup.remove();
      onDone(true); // true = fill all including q1
    };
    popup.appendChild(skipBtn);

    document.body.appendChild(popup);
  }

  // ── Fill radios — optionally skip the first group ─────────
  async function fillRadio(skipFirst = false) {
    let tries = 0;
    while (!document.querySelector('[role="radiogroup"]') && tries++ < 10) {
      await sleep(400);
    }
    const groups = [...document.querySelectorAll('[role="radiogroup"]')];
    console.log('[AF] radio groups:', groups.length, '| skipFirst:', skipFirst);

    for (let i = 0; i < groups.length; i++) {
      if (skipFirst && i === 0) {
        console.log('[AF] Skipping first radio group (manual selection)');
        continue;
      }
      const g = groups[i];
      let opts = [];
      for (let j = 0; j < 10; j++) {
        opts = [...g.querySelectorAll('[role="radio"]')];
        if (opts.length >= 2) break;
        await sleep(300);
      }
      if (!opts.length) continue;
      const last = opts[opts.length - 1];
      last.click();
      console.log('[AF] clicked:', last.textContent.trim(), '| opts:', opts.length);
      await sleep(350);
    }
  }

  // ── Fill checkboxes ────────────────────────────────────────
  async function fillCheckbox(skipFirst = false) {
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

  // ── Fill dropdowns ─────────────────────────────────────────
  async function fillDropdown(skipFirst = false) {
    const dds = [...document.querySelectorAll('[role="listbox"]')];
    for (let i = 0; i < dds.length; i++) {
      if (skipFirst && i === 0) continue;
      dds[i].click(); await sleep(500);
      const opts = [...document.querySelectorAll('[role="option"]')];
      if (opts.length) opts[opts.length - 1].click();
      await sleep(350);
    }
    for (const sel of document.querySelectorAll('select')) {
      if (sel.options.length) {
        sel.selectedIndex = sel.options.length - 1;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
      }
    }
  }

  // ── Fill text ──────────────────────────────────────────────
  async function fillText() {
    for (const inp of document.querySelectorAll('input[type="text"]:not([aria-hidden="true"]):not([readonly])')) {
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

  // ── Click Next ─────────────────────────────────────────────
  async function clickNext() {
    await sleep(500);
    const btns   = [...document.querySelectorAll('[role="button"]')];
    const next   = btns.find(b => /^next$/i.test(b.textContent.trim()));
    const submit = btns.find(b => /^submit$/i.test(b.textContent.trim()));
    if (next)   { next.click(); console.log('[AF] clicked Next'); return 'next'; }
    if (submit) { showSubmitConfirm(submit); return 'submit'; }
    return 'none';
  }

  // ── Submit confirm ─────────────────────────────────────────
  function showSubmitConfirm(submitBtn) {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed','top:50%','left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:2147483647','background:#fff',
      'border:2px solid #1a73e8','border-radius:16px',
      'padding:28px 32px','text-align:center',
      'font-family:Google Sans,Roboto,sans-serif',
      'box-shadow:0 8px 32px rgba(0,0,0,0.2)',
      'min-width:280px',
    ].join(';');

    const mkEl = (tag, css, text) => {
      const el = document.createElement(tag);
      if (css)  el.style.cssText = css;
      if (text) el.textContent = text;
      return el;
    };

    overlay.appendChild(mkEl('div','font-size:32px;margin-bottom:10px','✅'));
    overlay.appendChild(mkEl('div','font-size:16px;font-weight:600;color:#202124;margin-bottom:6px','All pages filled!'));
    overlay.appendChild(mkEl('div','font-size:13px;color:#5f6368;margin-bottom:20px','Review or submit now.'));

    const btnS = mkEl('button','background:#1a73e8;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;margin-right:8px','Submit');
    btnS.onclick = () => { submitBtn.click(); overlay.remove(); };

    const btnR = mkEl('button','background:#f1f3f4;color:#202124;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer','Review first');
    btnR.onclick = () => overlay.remove();

    overlay.appendChild(btnS);
    overlay.appendChild(btnR);
    document.body.appendChild(overlay);
  }

  // ── Main fill runner ───────────────────────────────────────
  async function runFill() {
    if (isFilling) return;
    isFilling = true;
    console.log('[AF] runFill — elective page?', isElectivePage());

    if (isElectivePage()) {
      // Pause and show popup for manual subject selection
      showBadge('✋ Select your subject!', 'Pick question 1 manually', '#f29900');

      await new Promise(resolve => {
        showElectivePause((fillAll) => {
          resolve(fillAll);
        });
      }).then(async (fillAll) => {
        showBadge('⚡ Auto-filling rest...', '', '#1a73e8');
        await sleep(600);

        // skipFirst = true means skip question 1 (already manually selected)
        const skipFirst = !fillAll;
        await fillRadio(skipFirst);
        await fillCheckbox(skipFirst);
        await fillDropdown(skipFirst);
        await fillText();

        showBadge('✅ Done! Moving next...', '', '#34a853');
        await sleep(700);
        await clickNext();
        isFilling = false;
      });
    } else {
      // Normal page — fill everything
      showBadge('⚡ Auto-filling...', '', '#1a73e8');
      await sleep(FILL_DELAY);

      await fillRadio(false);
      await fillCheckbox(false);
      await fillDropdown(false);
      await fillText();

      showBadge('✅ Done! Moving next...', '', '#34a853');
      await sleep(700);
      await clickNext();
      isFilling = false;
    }
  }

  // ── Observer ───────────────────────────────────────────────
  function startObserver() {
    const observer = new MutationObserver(async () => {
      if (isFilling) return;

      const radios = document.querySelectorAll('[role="radiogroup"]');
      const textInputs = document.querySelectorAll('input[type="text"], textarea');

      // Skip if this looks like page 1 (text inputs, no radios)
      if (radios.length === 0 && textInputs.length > 0) return;

      const sig = [...radios].map(g => g.textContent.trim().slice(0, 40)).join('|');
      if (!sig || sig === lastSig) return;
      lastSig = sig;

      console.log('[AF] Page change detected');
      await runFill();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[AF v6] Observer running');
  }

  // ── Init ───────────────────────────────────────────────────
  window.addEventListener('load', async () => {
    await sleep(1000);

    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      if (!cb.checked) { cb.click(); await sleep(200); }
    }

    const hasRadios = document.querySelectorAll('[role="radiogroup"]').length > 0;

    if (hasRadios) {
      console.log('[AF] Radios visible on load — starting fill');
      const groups = document.querySelectorAll('[role="radiogroup"]');
      lastSig = [...groups].map(g => g.textContent.trim().slice(0, 40)).join('|');
      await runFill();
    } else {
      showBadge('📋 AutoFill v6 ready', 'Fill page 1 → click Next → rest is auto', '#f29900');
    }

    startObserver();
    console.log('[AF v6] Ready.');
  });

})();

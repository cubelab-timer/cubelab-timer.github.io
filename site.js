/* Shared by every page (Japanese at the root, English under en/): footer, language switch, support button,
   ad slots, analytics, affiliate links. Reads window.SITE from config.js; the page language comes from <html lang>. */
(function(){
  'use strict';
  const S = window.SITE || {};
  const EN = document.documentElement.lang === 'en';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const T = EN ? {
    ad: 'Ad', support: '☕ Support development', form: 'Contact form',
    links: [['index.html','Timer'],['guide.html','How to use'],['events.html','Events & cube guide'],['about.html','About & contact'],['privacy.html','Privacy policy']],
    note: n => `${n} is an unofficial tool run by an individual and is not affiliated with the World Cube Association (WCA). This site uses affiliate links (such as Amazon Associates).`,
    other: '日本語', otherLang: 'ja'
  } : {
    ad: '広告', support: '☕ 開発を応援する', form: 'お問い合わせフォーム',
    links: [['index.html','タイマー'],['guide.html','使い方'],['events.html','種目とおすすめキューブ'],['about.html','運営者情報・お問い合わせ'],['privacy.html','プライバシーポリシー']],
    note: n => `${n} は個人が運営する非公式のツールで、World Cube Association（WCA）とは関係ありません。当サイトはアフィリエイト広告（Amazon アソシエイトなど）を利用しています。`,
    other: 'English', otherLang: 'en'
  };
  const page = (location.pathname.split('/').pop() || 'index.html');
  const otherHref = (EN ? '../' : 'en/') + (page === 'index.html' ? '' : page);

  // AdSense: loaded only when an ID is set
  if (S.adsenseClient && /^ca-pub-\d+$/.test(S.adsenseClient)) {
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + S.adsenseClient;
    document.head.appendChild(s);
  }
  // Cloudflare Web Analytics (cookieless)
  if (S.cfBeacon) {
    const s = document.createElement('script');
    s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({token: S.cfBeacon}));
    document.head.appendChild(s);
  }

  function fillAds(){
    document.querySelectorAll('.adslot').forEach(el => {
      if (!S.adsenseClient || el.dataset.filled) { el.hidden = !S.adsenseClient; return; }
      el.dataset.filled = '1'; el.hidden = false;
      el.innerHTML = `<div class="adlabel">${T.ad}</div><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(S.adsenseClient)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  // Amazon search links: <a data-amz="search words">…</a> — amazon.co.jp on Japanese pages, amazon.com on English pages
  function fillAffiliate(){
    const base = EN ? 'https://www.amazon.com/s' : 'https://www.amazon.co.jp/s', tag = EN ? S.amazonTagUS : S.amazonTag;
    document.querySelectorAll('a[data-amz]').forEach(a => {
      const u = new URL(base);
      u.searchParams.set('k', a.dataset.amz);
      if (tag) u.searchParams.set('tag', tag);
      a.href = u.toString(); a.target = '_blank'; a.rel = 'sponsored noopener';
    });
  }

  function footer(){
    const f = document.getElementById('siteFooter'); if (!f) return;
    const support = S.kofi ? `<a class="support" href="${esc(S.kofi)}" target="_blank" rel="noopener">${T.support}</a>` : '';
    f.innerHTML = `
      <div class="fin">
        ${support}
        <nav class="flinks">
          ${T.links.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}
          <a href="${otherHref}" hreflang="${T.otherLang}" lang="${T.otherLang}">${T.other}</a>
        </nav>
        <p class="fnote">${T.note(esc(S.name || 'CubeLab Timer'))}</p>
      </div>`;
  }

  // Japanese pages opened by a browser not set to Japanese: offer the English version once
  function langHint(){
    if (EN) return;
    let seen = false; try { seen = localStorage.getItem('cubelab.langHint') === '1'; } catch (e) {}
    const ja = (navigator.languages || [navigator.language || '']).some(l => /^ja/i.test(l));
    if (seen || ja) return;
    const bar = document.createElement('div'); bar.className = 'langbar';
    bar.innerHTML = `<span>This page is in Japanese.</span> <a href="${otherHref}" hreflang="en">Switch to English</a> <button type="button" aria-label="Close">×</button>`;
    const done = () => { try { localStorage.setItem('cubelab.langHint', '1'); } catch (e) {} bar.remove(); };
    bar.querySelector('a').addEventListener('click', done); bar.querySelector('button').addEventListener('click', done);
    document.body.prepend(bar);
  }

  // <span data-site="operator">（未設定）</span> → config value; contact becomes a mail/URL link
  function fillFields(){
    document.querySelectorAll('[data-site]').forEach(el => {
      const v = S[el.dataset.site]; if (!v) return;
      if (el.dataset.site === 'contact') {
        const a = document.createElement('a');
        a.href = /^https?:\/\//.test(v) ? v : 'mailto:' + v; a.textContent = /^https?:\/\//.test(v) ? T.form : v;
        el.replaceChildren(a);
      } else el.textContent = v;
    });
  }

  function init(){ footer(); langHint(); fillFields(); fillAffiliate(); fillAds(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.SITE_fillAds = fillAds;
})();

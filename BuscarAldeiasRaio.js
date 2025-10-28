
// ==UserScript==
// @name         TW - Buscar aldeias por raio
// @namespace    https://tribalwars/
// @version      1.0
// @description  Encontra suas aldeias dentro de um raio (tiles) a partir da aldeia atual e exibe lista com distâncias e links.
// @match        *://*.tribalwars.*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const parseCoords = str => {
    const m = str.match(/(\d{1,3})\|(\d{1,3})/);
    if (!m) return null;
    return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const getCurrentVillageCoord = () => {
    try {
      if (window.game_data && game_data.village && game_data.village.coord) {
        const m = game_data.village.coord.match(/(\d{1,3})\|(\d{1,3})/);
        if (m) return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
      }
    } catch (e) {}

    try {
      const els = Array.from(document.querySelectorAll('a, span, strong, h1, h2, .village_anchor, .village_name'));
      for (const el of els) {
        if (!el || !el.textContent) continue;
        const c = parseCoords(el.textContent);
        if (c) return c;
      }
    } catch (e) {}

    const manual = prompt('Não consegui detectar a aldeia atual automaticamente. Digite as coordenadas no formato X|Y (ex: 123|456):');
    if (manual) {
      const c = parseCoords(manual);
      if (c) return c;
    }
    return null;
  };

  const collectPlayerVillages = () => {
    const villages = [];

    try {
      for (const key of Object.keys(window)) {
        try {
          const val = window[key];
          if (!val) continue;
          if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
            for (const item of val) {
              if (!item) continue;
              if (('x' in item && 'y' in item) || ('coord' in item && item.coord)) {
                const name = item.name || item.village_name || item.title || '';
                const x = item.x || (item.coord && parseCoords(item.coord)?.x);
                const y = item.y || (item.coord && parseCoords(item.coord)?.y);
                const id = item.id || item.village_id || item.village;
                if (x && y) villages.push({ name: name || (x+'|'+y), x, y, id, href: item.url || null });
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    try {
      const links = Array.from(document.querySelectorAll('a[href*="village="]'));
      for (const a of links) {
        const text = a.textContent.trim();
        const coords = parseCoords(text);
        const href = a.getAttribute('href');
        let id = null;
        const idMatch = href && href.match(/[?&]village=(\d+)/);
        if (idMatch) id = idMatch[1];
        if (coords) {
          if (!villages.some(v => v.x === coords.x && v.y === coords.y)) {
            villages.push({ name: text, x: coords.x, y: coords.y, id, href });
          }
        }
      }
    } catch (e) {}

    try {
      const allTextNodes = Array.from(document.querySelectorAll('body *')).map(n => n.textContent).filter(Boolean);
      for (const t of allTextNodes) {
        const coords = parseCoords(t);
        if (coords && !villages.some(v => v.x === coords.x && v.y === coords.y)) {
          const name = t.replace(/\s*\(?\d{1,3}\|\d{1,3}\)?\s*/, '').trim().slice(0, 60) || `${coords.x}|${coords.y}`;
          villages.push({ name, x: coords.x, y: coords.y, id: null, href: null });
        }
      }
    } catch (e) {}

    const unique = [];
    for (const v of villages) {
      if (!unique.some(u => u.x === v.x && u.y === v.y)) unique.push(v);
    }
    return unique;
  };

  const makePanel = (results, origin, radius) => {
    const existing = document.getElementById('tw-radius-search-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'tw-radius-search-panel';
    panel.style.position = 'fixed';
    panel.style.right = '20px';
    panel.style.top = '60px';
    panel.style.zIndex = 99999;
    panel.style.maxHeight = '70vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#f8f4ef';
    panel.style.border = '2px solid #4b3d2f';
    panel.style.padding = '10px';
    panel.style.borderRadius = '6px';
    panel.style.minWidth = '320px';
    panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>Resultados — raio ${radius} tiles</strong>
        <div>
          <button id="tw-radius-close" style="margin-right:6px">Fechar</button>
          <button id="tw-radius-copy">Copiar CSV</button>
        </div>
      </div>
      <div style="font-size:12px;color:#333;margin-bottom:8px">Aldeia atual: ${origin.x}|${origin.y} — encontradas ${results.length} aldeias dentro do raio.</div>
      <table id="tw-radius-table" style="width:100%;font-size:13px;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid #ccc">
            <th style="text-align:left;padding:6px">#</th>
            <th style="text-align:left;padding:6px">Aldeia</th>
            <th style="text-align:left;padding:6px">Coords</th>
            <th style="text-align:left;padding:6px">Dist</th>
            <th style="text-align:left;padding:6px">Ação</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    document.body.appendChild(panel);

    const tbody = panel.querySelector('tbody');
    results.sort((a, b) => a.distance - b.distance);
    results.forEach((v, i) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px dashed #ddd';
      tr.innerHTML = `
        <td style="padding:6px;vertical-align:middle">${i + 1}</td>
        <td style="padding:6px;vertical-align:middle">${escapeHtml(v.name || '')}</td>
        <td style="padding:6px;vertical-align:middle">${v.x}|${v.y}</td>
        <td style="padding:6px;vertical-align:middle">${v.distance.toFixed(2)}</td>
        <td style="padding:6px;vertical-align:middle">
          ${v.href ? `<a href="${v.href}">Ir</a>` : `<a href="?screen=map&x=${v.x}&y=${v.y}">Ver mapa</a>`}
        </td>
      `;
      tbody.appendChild(tr);
    });

    panel.querySelector('#tw-radius-close').addEventListener('click', () => panel.remove());
    panel.querySelector('#tw-radius-copy').addEventListener('click', () => {
      const csv = ['name,x,y,distance'];
      for (const r of results) csv.push(`"${(r.name||'').replace(/"/g,'""')}",${r.x},${r.y},${r.distance.toFixed(2)}`);
      copyToClipboard(csv.join('\n'));
      alert('CSV copiado para a área de transferência.');
    });
  };

  const escapeHtml = s => (s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  const copyToClipboard = text => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  };

  (function main() {
    const origin = getCurrentVillageCoord();
    if (!origin) {
      alert('Coordenadas da aldeia atual não fornecidas. Aborting.');
      return;
    }

    let radius = prompt('Digite o raio (em tiles) para buscar suas aldeias a partir da aldeia atual. Ex: 10');
    if (radius === null) return;
    radius = parseFloat(String(radius).replace(',', '.'));
    if (isNaN(radius) || radius < 0) {
      alert('Valor de raio inválido.');
      return;
    }

    const villages = collectPlayerVillages();
    if (!villages || villages.length === 0) {
      alert('Não encontrei nenhuma aldeia sua automaticamente na página. Tente abrir a lista de aldeias (barra lateral) e executar novamente.');
      return;
    }

    const results = villages.map(v => Object.assign({}, v, { distance: dist(origin, { x: v.x, y: v.y }) }))
      .filter(v => v.distance <= radius && !(v.x === origin.x && v.y === origin.y));

    makePanel(results, origin, radius);
    console.log('TW - Busca por raio:', { origin, radius, found: results.length, results });
  })();

})();

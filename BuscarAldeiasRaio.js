// ==UserScript==
// @name         TW - Buscar aldeias por raio (Tabela Coordenadas e Distância)
// @namespace    https://tribalwars/
// @version      1.5
// @description  Exibe em tabela as coordenadas e distância das suas aldeias dentro de um raio, com painel Dialog.show estilizado.
// @match        *://*.tribalwars.*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // === Funções auxiliares ===
  const parseCoords = str => {
    const m = str.match(/(\d{1,3})\|(\d{1,3})/);
    if (!m) return null;
    return { x: parseInt(m[1]), y: parseInt(m[2]) };
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const getCurrentVillageCoord = () => {
    if (window.game_data?.village?.coord) {
      const c = parseCoords(game_data.village.coord);
      if (c) return c;
    }
    const els = Array.from(document.querySelectorAll('.village_name, .village_anchor, a, h1, h2, span, strong'));
    for (const el of els) {
      const c = parseCoords(el.textContent);
      if (c) return c;
    }
    const manual = prompt('Não consegui detectar a aldeia atual. Digite as coordenadas (ex: 123|456):');
    return manual ? parseCoords(manual) : null;
  };

  const collectPlayerVillages = () => {
    const villages = [];
    const links = Array.from(document.querySelectorAll('a[href*="village="]'));
    for (const a of links) {
      const coords = parseCoords(a.textContent.trim());
      if (coords && !villages.some(v => v.x === coords.x && v.y === coords.y)) {
        villages.push(coords);
      }
    }
    return villages;
  };

  const copyToClipboard = text => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  };

  // === Painel principal ===
  const abrirPainel = () => {
    const origin = getCurrentVillageCoord();
    if (!origin) {
      UI.ErrorMessage('Não foi possível detectar a aldeia atual.');
      return;
    }

    const html = `
      <div style="font-size:13px;color:#333;margin-bottom:10px">
        <b>Aldeia atual:</b> ${origin.x}|${origin.y}
      </div>

      <div style="margin-bottom:10px">
        <label><b>Raio:</b></label>
        <input type="number" id="radiusInput" min="1" value="10" style="width:80px;margin-left:5px;text-align:center">
        <button class="btn" id="searchBtn">Buscar</button>
      </div>

      <div id="radiusResults" style="max-height:380px;overflow:auto;border:1px solid #ccc;padding:4px;background:#fdfaf5">
        <i>Nenhuma busca realizada ainda.</i>
      </div>

      <br>
      <center>
        <button class="btn" id="copyCsvBtn" disabled>Copiar coordenadas</button>
        <button class="btn" id="closeDialogBtn">Fechar</button>
      </center>
    `;

    Dialog.show('radius_search', html);

    document.querySelector('#searchBtn').addEventListener('click', () => {
      const radius = parseFloat(document.querySelector('#radiusInput').value);
      if (isNaN(radius) || radius <= 0) {
        UI.ErrorMessage('Digite um raio válido.');
        return;
      }

      const villages = collectPlayerVillages();
      if (!villages.length) {
        UI.ErrorMessage('Nenhuma aldeia encontrada na página.');
        return;
      }

      const results = villages
        .map(v => ({ ...v, distance: dist(origin, v) }))
        .filter(v => v.distance <= radius && !(v.x === origin.x && v.y === origin.y))
        .sort((a, b) => a.distance - b.distance);

      atualizarTabela(results, origin, radius);
    });

    document.querySelector('#copyCsvBtn').addEventListener('click', () => {
      const coords = JSON.parse(sessionStorage.getItem('twRadiusCoords') || '[]');
      if (!coords.length) return;
      const list = coords.map(c => `${c.x}|${c.y}`).join('\n');
      copyToClipboard(list);
      UI.InfoMessage('Coordenadas copiadas para a área de transferência.');
    });

    document.querySelector('#closeDialogBtn').addEventListener('click', () => {
      Dialog.close('radius_search');
    });
  };

  // === Atualiza resultado em formato de tabela ===
  const atualizarTabela = (results, origin, radius) => {
    const div = document.querySelector('#radiusResults');
    if (!results.length) {
      div.innerHTML = `<i>Nenhuma aldeia encontrada dentro de ${radius} tiles.</i>`;
      document.querySelector('#copyCsvBtn').disabled = true;
      return;
    }

    let tabela = `
      <div style="margin-bottom:6px">
        <b>${results.length}</b> aldeias encontradas dentro de <b>${radius}</b> tiles.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center">
        <thead>
          <tr style="background:#ddd;font-weight:bold">
            <th style="border:1px solid #aaa;padding:4px">Coordenadas</th>
            <th style="border:1px solid #aaa;padding:4px">Distância</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(v => `
            <tr>
              <td style="border:1px solid #ccc;padding:3px">${v.x}|${v.y}</td>
              <td style="border:1px solid #ccc;padding:3px">${v.distance.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    div.innerHTML = tabela;
    document.querySelector('#copyCsvBtn').disabled = false;
    sessionStorage.setItem('twRadiusCoords', JSON.stringify(results));
  };

  abrirPainel();
})();

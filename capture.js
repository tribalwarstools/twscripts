// ==UserScript==
// @name         Captura de Coordenadas no Mapa
// @namespace    https://seurepositorio.github.io/
// @version      1.0
// @description  Captura coordenadas de aldeias ao clicar no mapa e exibe em um painel lateral.
// @author       SeuNome
// @match        https://*.tribalwars.*/game.php*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (typeof TWMap === 'undefined') {
    UI.ErrorMessage('Mapa não carregado!');
    return;
  }

  // Cria o painel na interface
  const panel = document.createElement('div');
  panel.id = 'coord-capture-panel';
  panel.style.position = 'fixed';
  panel.style.top = '100px';
  panel.style.right = '20px';
  panel.style.background = '#f4f4f4';
  panel.style.border = '2px solid #333';
  panel.style.padding = '10px';
  panel.style.zIndex = 9999;
  panel.style.borderRadius = '10px';
  panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  panel.style.fontSize = '12px';
  panel.style.width = '200px';

  panel.innerHTML = `
    <strong>Coordenadas capturadas</strong><br><br>
    <div id="coord-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; background: #fff;"></div>
    <br>
    <button id="clear-coords" style="width:100%; margin-bottom:5px;">Limpar</button>
    <button id="copy-coords" style="width:100%;">Copiar</button>
  `;

  document.body.appendChild(panel);

  const listEl = document.getElementById('coord-list');
  const clearBtn = document.getElementById('clear-coords');
  const copyBtn = document.getElementById('copy-coords');

  const coords = [];

  function updateList() {
    listEl.innerHTML = coords.map(coord => `<div>${coord}</div>`).join('');
  }

  // Captura clique no mapa
  function onVillageClick(e, tile) {
    if (!tile || !tile.village) return;
    const coord = `${tile.village.x}|${tile.village.y}`;
    if (!coords.includes(coord)) {
      coords.push(coord);
      updateList();
      UI.SuccessMessage(`Capturado: ${coord}`);
    } else {
      UI.InfoMessage(`Coordenada ${coord} já capturada.`);
    }
  }

  // Adiciona o evento no mapa
  TWMap.map._listeners.click = onVillageClick;

  clearBtn.addEventListener('click', () => {
    coords.length = 0;
    updateList();
    UI.SuccessMessage('Lista de coordenadas limpa.');
  });

  copyBtn.addEventListener('click', () => {
    const text = coords.join(' ');
    navigator.clipboard.writeText(text).then(() => {
      UI.SuccessMessage('Coordenadas copiadas!');
    }).catch(() => {
      UI.ErrorMessage('Erro ao copiar coordenadas.');
    });
  });

  UI.SuccessMessage('Painel de coordenadas ativado. Clique em aldeias no mapa!');
})();

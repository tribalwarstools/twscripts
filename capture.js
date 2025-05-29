// ==UserScript==
// @name         Captura de Coordenadas (TW)
// @namespace    https://seurepositorio.github.io/
// @version      1.1
// @description  Captura coordenadas de aldeias ao clicar no mapa no novo sistema do Tribal Wars (mapOverlay). Interface com painel lateral incluso.
// @author       Você
// @match        https://*.tribalwars.*/game.php*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const coords = [];

  function buildUI() {
    const panel = document.createElement('div');
    panel.id = 'coord-capture-panel';
    panel.style.position = 'fixed';
    panel.style.top = '100px';
    panel.style.right = '20px';
    panel.style.background = '#f8f8f8';
    panel.style.border = '2px solid #444';
    panel.style.padding = '10px';
    panel.style.zIndex = 9999;
    panel.style.fontSize = '12px';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    panel.style.width = '200px';

    panel.innerHTML = `
      <b>Coordenadas capturadas</b><br><br>
      <div id="coord-list" style="max-height: 120px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; background: #fff;"></div>
      <br>
      <button id="copy-coords" style="width:100%; margin-bottom:5px;">Copiar</button>
      <button id="clear-coords" style="width:100%;">Limpar</button>
    `;

    document.body.appendChild(panel);

    // Eventos
    document.getElementById('copy-coords').addEventListener('click', () => {
      if (coords.length === 0) return UI.InfoMessage('Nenhuma coordenada para copiar.');
      navigator.clipboard.writeText(coords.join(' '));
      UI.SuccessMessage('Coordenadas copiadas!');
    });

    document.getElementById('clear-coords').addEventListener('click', () => {
      coords.length = 0;
      updateList();
      UI.SuccessMessage('Lista limpa.');
    });
  }

  function updateList() {
    const listEl = document.getElementById('coord-list');
    listEl.innerHTML = coords.map(coord => `<div>${coord}</div>`).join('');
  }

  function waitForMap() {
    if (
      typeof mapOverlay !== 'undefined' &&
      mapOverlay.map &&
      typeof mapOverlay.map._handleClick === 'function'
    ) {
      integrateClick();
    } else {
      setTimeout(waitForMap, 200);
    }
  }

  function integrateClick() {
    if (mapOverlay.map._DShandleClick) return; // já foi modificado anteriormente

    mapOverlay.map._DShandleClick = mapOverlay.map._handleClick;

    mapOverlay.map._handleClick = function (e) {
      const tile = this.coordByEvent(e);
      if (!tile) return;

      const coord = `${tile.x}|${tile.y}`;

      if (!coords.includes(coord)) {
        coords.push(coord);
        updateList();
        UI.SuccessMessage(`Capturado: ${coord}`);
      } else {
        UI.InfoMessage(`Coordenada ${coord} já está na lista.`);
      }

      // Chama o manipulador original
      return mapOverlay.map._DShandleClick.call(this, e);
    };

    UI.SuccessMessage('Clique em aldeias no mapa para capturar coordenadas.');
  }

  // Inicializa
  buildUI();
  waitForMap();
})();

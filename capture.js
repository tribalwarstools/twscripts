// ==UserScript==
// @name         Captura de Coordenadas no Mapa
// @namespace    https://seurepositorio.github.io/
// @version      1.0
// @description  Captura coordenadas ao clicar em aldeias no mapa do Tribal Wars.
// @author       SeuNome
// @match        https://*.tribalwars.*/game.php*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function waitForTWMap(callback) {
    if (typeof window.TWMap !== 'undefined' && TWMap.map && TWMap.map.mapHandler) {
      callback();
    } else {
      setTimeout(() => waitForTWMap(callback), 200);
    }
  }

  waitForTWMap(() => {
    const coords = [];

    // Cria o painel de interface
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '100px';
    panel.style.right = '20px';
    panel.style.width = '200px';
    panel.style.background = '#fff';
    panel.style.border = '2px solid #444';
    panel.style.padding = '10px';
    panel.style.zIndex = 9999;
    panel.style.fontSize = '12px';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    panel.innerHTML = `
      <b>Coordenadas capturadas</b><br><br>
      <div id="coord-list" style="max-height: 120px; overflow-y: auto; border: 1px solid #ccc; padding: 5px;"></div>
      <br>
      <button id="copy-coords" style="width:100%; margin-bottom:5px;">Copiar</button>
      <button id="clear-coords" style="width:100%;">Limpar</button>
    `;
    document.body.appendChild(panel);

    const listEl = document.getElementById('coord-list');
    const copyBtn = document.getElementById('copy-coords');
    const clearBtn = document.getElementById('clear-coords');

    function updateList() {
      listEl.innerHTML = coords.map(c => `<div>${c}</div>`).join('');
    }

    // Escutador real nos tiles do mapa
    const originalHandler = TWMap.map.mapHandler.onClick;
    TWMap.map.mapHandler.onClick = function (event, data) {
      if (data && data.villageId && data.villageX && data.villageY) {
        const coord = `${data.villageX}|${data.villageY}`;
        if (!coords.includes(coord)) {
          coords.push(coord);
          updateList();
          UI.SuccessMessage(`Capturado: ${coord}`);
        } else {
          UI.InfoMessage(`Já capturado: ${coord}`);
        }
      }
      if (typeof originalHandler === 'function') {
        originalHandler.apply(this, arguments); // mantém funcionalidade padrão
      }
    };

    clearBtn.addEventListener('click', () => {
      coords.length = 0;
      updateList();
      UI.SuccessMessage('Lista limpa.');
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(coords.join(' ')).then(() => {
        UI.SuccessMessage('Coordenadas copiadas!');
      });
    });

    UI.SuccessMessage('Clique em aldeias para capturar coordenadas.');
  });
})();

// ==UserScript==
// @name         Captura de Coordenadas (Tribal Wars)
// @namespace    https://seurepositorio.github.io/
// @version      1.2
// @description  Captura coordenadas ao clicar em aldeias no mapa (compatível com sistema atual do jogo). Painel visual incluso.
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

  function addVillageClickListeners() {
    const villageEls = document.querySelectorAll('.village');

    villageEls.forEach(el => {
      el.removeEventListener('click', onVillageClick); // evita múltiplos binds
      el.addEventListener('click', onVillageClick);
    });
  }

  function onVillageClick(e) {
    const title = this.getAttribute('title'); // Ex: "Aldeia (123|456) K55"
    const match = title?.match(/\((\d{3}\|\d{3})\)/);
    if (!match) return;

    const coord = match[1];
    if (!coords.includes(coord)) {
      coords.push(coord);
      updateList();
      UI.SuccessMessage(`Capturado: ${coord}`);
    } else {
      UI.InfoMessage(`Coordenada ${coord} já está na lista.`);
    }

    // permite clique normal (como abrir popup de aldeia)
    e.stopPropagation();
  }

  function observeVillageRendering() {
    const observer = new MutationObserver(addVillageClickListeners);
    observer.observe(document.body, { childList: true, subtree: true });
    addVillageClickListeners(); // executa uma vez inicial
  }

  // Inicializa
  buildUI();
  observeVillageRendering();
})();

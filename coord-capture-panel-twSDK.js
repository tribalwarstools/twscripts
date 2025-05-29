// ==UserScript==
// @name         Captura de Coordenadas (com twSDK)
// @namespace    https://seurepositorio.github.io/
// @version      1.0
// @description  Captura coordenadas ao clicar em aldeias no mapa do Tribal Wars, com painel integrado via twSDK.js. Exibe continente K da coordenada capturada. Estilo TW incluído.
// @author       Você
// @match        https://*.tribalwars.*/game.php*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const sdkUrl = 'https://tribalwarstools.github.io/twscripts/twSDK.js';

  function loadTwSDK(callback) {
    if (typeof window.twSDK !== 'undefined') {
      callback();
    } else {
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.onload = callback;
      document.head.appendChild(script);
    }
  }

  function startScript() {
    const scriptConfig = {
      scriptData: {
        name: 'Captura de Coordenadas',
        version: '1.0',
        author: 'Você',
        authorUrl: 'https://seurepositorio.github.io/',
        helpLink: 'https://twscripts.dev/',
      },
      translations: {},
      allowedMarkets: ['br', 'pt'],
      allowedScreens: [],
      allowedModes: [],
      isDebug: false,
      enableCountApi: false,
    };

    window.twSDK.init(scriptConfig);

    const coords = [];

    function buildUI() {
      const html = `
        <p>Clique em aldeias no <strong>mapa</strong> para capturar coordenadas.</p>
        <div id="coord-list" class="ra-table-container ra-mb10" style="max-height: 120px; border: 1px solid #ccc; padding: 5px; background: #fff;"></div>
        <button id="copy-coords" class="btn" style="width:100%; margin-bottom:5px;">Copiar</button>
        <button id="clear-coords" class="btn" style="width:100%;">Limpar</button>
      `;

      twSDK.renderFixedWidget(html, 'coord-capture-widget', 'coord-capture', '', '360px', 'Captura de Coordenadas');

      document.getElementById('copy-coords').addEventListener('click', () => {
        if (coords.length === 0) return UI.InfoMessage('Nenhuma coordenada para copiar.');
        twSDK.copyToClipboard(coords.join(' '));
        UI.SuccessMessage('Coordenadas copiadas!');
      });

      document.getElementById('clear-coords').addEventListener('click', () => {
        coords.length = 0;
        updateList();
        UI.SuccessMessage('Lista limpa.');
      });
    }

    function updateList() {
      const el = document.getElementById('coord-list');
      el.innerHTML = coords
        .map(c => `<div>${c} (K${twSDK.getContinentByCoord(c)})</div>`)
        .join('');
    }

    function onVillageClick(e) {
      const title = this.getAttribute('title');
      const match = title?.match(/\((\d{3}\|\d{3})\)/);
      if (!match) return;

      const coord = match[1];
      if (!coords.includes(coord)) {
        coords.push(coord);
        updateList();
        UI.SuccessMessage(`Capturado: ${coord} (K${twSDK.getContinentByCoord(coord)})`);
      } else {
        UI.InfoMessage(`Coordenada ${coord} já está na lista.`);
      }

      e.stopPropagation();
    }

    function addListeners() {
      const villageEls = document.querySelectorAll('.village');
      villageEls.forEach(el => {
        el.removeEventListener('click', onVillageClick);
        el.addEventListener('click', onVillageClick);
      });
    }

    function observeMap() {
      const observer = new MutationObserver(addListeners);
      observer.observe(document.body, { childList: true, subtree: true });
      addListeners();
    }

    buildUI();
    observeMap();
  }

  loadTwSDK(startScript);
})();

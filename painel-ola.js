// ==UserScript==
// @name         Painel Olá (twSDK)
// @namespace    https://seurepositorio.github.io/
// @version      1.0
// @description  Exibe um painel com a frase "Olá" usando o sistema visual do twSDK.js no Tribal Wars.
// @author       Você
// @match        https://*.tribalwars.*/game.php*
// @grant        none
// ==/UserScript==

(function () {
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
    // Configuração mínima do SDK
    const config = {
      scriptData: {
        name: 'Painel Olá',
        version: '1.0',
        author: 'Você',
        authorUrl: '',
        helpLink: '',
      },
      allowedMarkets: ['br', 'pt'],
    };

    window.twSDK.init(config);

    // Renderiza o painel com a frase
    const conteudo = `<p style="font-size: 16px;">👋 Olá!</p>`;
    window.twSDK.renderFixedWidget(conteudo, 'painel-ola-widget', 'painel-ola', '', '280px', 'Painel Olá');
  }

  loadTwSDK(startScript);
})();

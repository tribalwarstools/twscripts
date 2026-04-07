// ==UserScript==
// @name         -TW Anti-Logoff
// @namespace    https://tribalwarstools.github.io/
// @version      1.1
// @description  Impede o logoff automático no Tribal Wars com ações simuladas regulares e mantém o estado após reload
// @author       Você
// @match        https://*.tribalwars.com.br/game.php*
// @icon         https://www.tribalwars.com.br/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    if (!window.antiLogoffCarregado) {
        window.antiLogoffCarregado = true;

        function loadScript() {
            if (typeof $ !== 'undefined' && $.getScript) {
                $.getScript('https://cdn.jsdelivr.net/gh/TribalWarsTools/twscripts/antilogoff.js');

            } else {
                // Se jQuery não carregou ainda, tenta novamente em 100ms
                setTimeout(loadScript, 100);
            }
        }

        loadScript();
    }

})();

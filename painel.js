(function () {
    'use strict';

    const btnId = 'copy-coord-fixed-btn';

    // Cria botão fixo próximo ao mapa
    function createButton() {
        if (document.getElementById(btnId)) return;

        const btn = document.createElement('button');
        btn.id = btnId;
        btn.textContent = '📌 Copiar Coordenada';
        btn.style.position = 'absolute'; // vai posicionar relativo ao mapa
        btn.style.padding = '6px 10px';
        btn.style.backgroundColor = '#804000';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.5)';
        btn.style.zIndex = 9999;

        // Vai ser filho do mapa para posicionar relativo a ele
        const map = document.getElementById('map');
        if (!map) return;
        map.style.position = map.style.position || 'relative'; // garantir posicionamento relativo

        map.appendChild(btn);
    }

    // Atualiza posição e texto do botão
    function updateButtonCoord() {
        const popup = document.getElementById('map_popup');
        if (!popup || popup.style.display === 'none') {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
            return;
        }

        const th = popup.querySelector('th[colspan="2"]');
        if (!th) return;

        const match = th.textContent.match(/\((\d{3}\|\d{3})\)/);
        if (!match) return;

        const coord = match[1];

        createButton();
        const btn = document.getElementById(btnId);
        btn.style.display = 'block';
        btn.setAttribute('data-coord', coord);
        btn.textContent = `📌 Copiar ${coord}`;

        // Posicionar o botão no canto inferior direito do mapa (por exemplo)
        btn.style.top = (map.clientHeight - btn.offsetHeight - 10) + 'px';
        btn.style.left = (map.clientWidth - btn.offsetWidth - 10) + 'px';
    }

    // Observer para detectar popup aberto
    const observer = new MutationObserver(() => {
        updateButtonCoord();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mensagem inicial
    UI.InfoMessage('📌 Script "Copiar Coordenada" ativo!3', 3000);
})();

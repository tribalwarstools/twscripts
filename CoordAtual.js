(function () {
    'use strict';

    const POPUP_NAME = 'tw-village-popup';
    const POPUP_URL = 'about:blank'; // pode ser substituído por um hosted HTML externo futuramente

    const village = game_data.village;

    // Reutiliza a janela se já estiver aberta
    let popup = window.open('', POPUP_NAME, 'width=350,height=250,resizable=yes');

    if (!popup || popup.closed) {
        UI.ErrorMessage('Popup bloqueado! Permita popups para usar este script.');
        return;
    }

    // Se estiver carregando pela primeira vez
    if (popup.location.href === 'about:blank') {
        popup.document.write(`
            <html>
            <head>
                <title>Aldeia Atual</title>
                <style>
                    body {
                        font-family: Verdana, sans-serif;
                        background: #f4e4bc;
                        color: #333;
                        padding: 15px;
                    }
                    h2 {
                        margin-top: 0;
                    }
                    button {
                        margin-top: 10px;
                        padding: 6px 10px;
                        background: #804000;
                        color: #fff;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background: #a0522d;
                    }
                </style>
            </head>
            <body>
                <h2 id="village-name">Aldeia</h2>
                <p><strong>Coordenadas:</strong> <span id="village-coord">---</span></p>
                <p><strong>Pontos:</strong> <span id="village-points">---</span></p>
                <button onclick="navigator.clipboard.writeText(document.getElementById('village-coord').textContent)">Copiar Coordenada</button>

                <script>
                    window.addEventListener('message', function(e) {
                        if (!e.data || typeof e.data !== 'object') return;
                        const data = e.data;
                        document.getElementById('village-name').textContent = '🏰 ' + data.name;
                        document.getElementById('village-coord').textContent = data.coord;
                        document.getElementById('village-points').textContent = data.points;
                    });
                </script>
            </body>
            </html>
        `);
        popup.document.close();
    }

    // Envia dados da aldeia ao popup
    const payload = {
        name: village.name,
        coord: village.coord,
        points: village.points.toLocaleString()
    };

    // Espera pequeno tempo caso popup esteja carregando
    setTimeout(() => {
        popup.postMessage(payload, '*');
    }, 300);
})();

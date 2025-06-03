(function () {
    'use strict';

    const village = game_data.village;

    const popup = window.open('', 'tw-coord-popup', 'width=350,height=250,resizable=yes');

    if (!popup) {
        UI.ErrorMessage('Popup bloqueado! Permita popups para este site.');
        return;
    }

    popup.document.write(`
        <html>
        <head>
            <title>Informações da Aldeia</title>
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
            <h2>🏰 ${village.name}</h2>
            <p><strong>Coordenadas:</strong> ${village.coord}</p>
            <p><strong>Pontos:</strong> ${village.points.toLocaleString()}</p>
            <button onclick="navigator.clipboard.writeText('${village.coord}')">Copiar Coordenada</button>
        </body>
        </html>
    `);

    popup.document.close();
})();

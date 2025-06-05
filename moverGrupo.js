(function () {
    'use strict';

    // Verifica se o jogador está na tela correta
    if (!window.game_data || !window.game_data.player || !window.location.href.includes('overview_villages')) {
        UI.ErrorMessage('Abra a tela "Todas as aldeias" para usar esta ferramenta.');
        return;
    }

    function abrirJanelaGrupo() {
        // Cria o HTML da janela
        const html = `
            <div id="mover-grupo-janela" class="popup_box" style="width: 400px; max-width: 90%;">
                <h3>Mover Aldeias para Grupo</h3>
                <div style="margin-bottom: 10px;">
                    <label for="grupo-id">ID do Grupo:</label>
                    <input type="number" id="grupo-id" style="width: 100%;" placeholder="Insira o ID do grupo de destino">
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="coords">Coordenadas (separadas por espaço ou nova linha):</label>
                    <textarea id="coords" rows="5" style="width: 100%;" placeholder="000|000 000|000 ..."></textarea>
                </div>
                <div style="text-align: right;">
                    <button class="btn btn-confirm" id="mover-confirmar">Mover</button>
                    <button class="btn" onclick="$('#mover-grupo-janela').remove()">Cancelar</button>
                </div>
            </div>
        `;

        // Adiciona a janela ao corpo da página
        $('body').append(`<div class="popup_box_container" id="mover-grupo-container">${html}</div>`);

        // Centraliza a janela
        $('#mover-grupo-container').css({
            top: '100px',
            left: 'calc(50% - 200px)',
            position: 'absolute',
            zIndex: 9999
        });

        // Evento de clique no botão de confirmar
        $('#mover-confirmar').on('click', async function () {
            const grupoId = $('#grupo-id').val().trim();
            const coordsInput = $('#coords').val().trim();

            if (!grupoId || !coordsInput) {
                UI.ErrorMessage("Preencha todos os campos.");
                return;
            }

            const coords = coordsInput
                .split(/[\s\n]+/)
                .map(c => c.trim())
                .filter(c => /^\d{3}\|\d{3}$/.test(c));

            if (coords.length === 0) {
                UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
                return;
            }

            UI.SuccessMessage(`Movendo ${coords.length} aldeia(s) para o grupo ${grupoId}...`);

            const villages = window.game_data.villages;

            for (const coord of coords) {
                const village = villages.find(v => v.coord === coord);
                if (!village) {
                    UI.ErrorMessage(`Aldeia ${coord} não encontrada.`);
                    continue;
                }

                try {
                    await $.post('/game.php', {
                        screen: 'groups',
                        ajaxaction: 'assign',
                        h: window.Game.marketHash,
                        village_id: village.id,
                        group_id: grupoId
                    });
                } catch (e) {
                    console.error(`Erro ao mover ${coord}:`, e);
                    UI.ErrorMessage(`Erro ao mover ${coord}`);
                }
            }

            UI.SuccessMessage("Processo concluído.");
            $('#mover-grupo-janela').remove();
        });
    }

    // Define a função global
    window.abrirJanelaGrupo = abrirJanelaGrupo;
})();

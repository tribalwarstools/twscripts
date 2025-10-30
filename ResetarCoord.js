(function() {
    const id = "painelResetApoio";

    if (document.getElementById(id)) return; // evita abrir duas vezes

    const content = `
        <div style="text-align:center; padding:15px;">
            <h3 style="margin-bottom:15px;">🛡️ Gerenciar coordenadas apoiadas</h3>
            <button class="btn btn-confirm-no" id="btnResetApoio">Resetar coordenadas</button>
            <button class="btn btn-confirm-yes" id="btnRestartApoio" style="margin-left:10px;">Recomeçar</button>
        </div>
    `;

    Dialog.show(id, content);

    // Botão: remove a chave global do apoio
    document.getElementById("btnResetApoio").onclick = () => {
        const key = "coordsApoio_" + game_data.world;
        localStorage.removeItem(key);
        UI.InfoMessage("Todas as coordenadas de apoio foram resetadas!", 3000, "success");
    };

    // Botão: recomeça — limpa e cria estrutura vazia
    document.getElementById("btnRestartApoio").onclick = () => {
        const key = "coordsApoio_" + game_data.world;
        localStorage.removeItem(key);

        const initialData = [];
        localStorage.setItem(key, JSON.stringify(initialData));

        UI.InfoMessage("Coordenadas de apoio reiniciadas com estrutura inicial!", 3000, "success");
    };
})();

(function() {
    const id = "painelResetGeral";

    if (document.getElementById(id)) return; // evita duplicar painel

    const content = `
        <div style="text-align:center; padding:15px;">
            <h3 style="margin-bottom:15px;">⚔️ Gerenciar Coordenadas (Atacadas + Apoio)</h3>
            <button class="btn btn-confirm-no" id="btnResetGeral">Resetar Tudo</button>
            <button class="btn btn-confirm-yes" id="btnRestartGeral" style="margin-left:10px;">Recomeçar Tudo</button>
        </div>
    `;

    Dialog.show(id, content);

    const mundos = game_data.world;
    const keys = [
        "coordsAtacadas_" + mundos,
        "coordsApoio_" + mundos
    ];

    // Resetar (remove completamente as chaves)
    document.getElementById("btnResetGeral").onclick = () => {
        keys.forEach(k => localStorage.removeItem(k));
        UI.InfoMessage("Todas as coordenadas (atacadas e apoio) foram resetadas!", 4000, "success");
    };

    // Recomeçar (limpa e recria estrutura vazia)
    document.getElementById("btnRestartGeral").onclick = () => {
        keys.forEach(k => localStorage.setItem(k, JSON.stringify([])));
        UI.InfoMessage("Coordenadas reiniciadas com estrutura inicial!", 4000, "success");
    };
})();

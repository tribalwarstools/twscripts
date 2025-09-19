(function() {
    const id = "painelResetAtacadas";

    if (document.getElementById(id)) return; // evita duplicar

    const content = `
        <div style="text-align:center; padding:15px;">
            <h3 style="margin-bottom:15px;">⚔️ Gerenciar coordenadas atacadas</h3>
            <button class="btn btn-confirm-no" id="btnResetGlobal">Resetar coordenadas</button>
            <button class="btn btn-confirm-yes" id="btnRestartGlobal" style="margin-left:10px;">Recomeçar</button>
        </div>
    `;

    Dialog.show(id, content);

    // Botão: reseta a chave global do mundo atual
    document.getElementById("btnResetGlobal").onclick = () => {
        const key = "coordsAtacadas_" + game_data.world;
        localStorage.removeItem(key);
        UI.InfoMessage("Todas as coordenadas atacadas foram resetadas!", 3000, "success");
    };

    // Botão: recomeça (reseta + cria estrutura inicial)
    document.getElementById("btnRestartGlobal").onclick = () => {
        const key = "coordsAtacadas_" + game_data.world;
        localStorage.removeItem(key);

        // Estrutura inicial vazia, por exemplo
        const initialData = [];
        localStorage.setItem(key, JSON.stringify(initialData));

        UI.InfoMessage("Coordenadas reiniciadas com estrutura inicial!", 3000, "success");
    };
})();

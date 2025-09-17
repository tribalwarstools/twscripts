(function() {
    const id = "painelResetAtacadas";

    if (document.getElementById(id)) return; // evita duplicar

    const content = `
        <div style="text-align:center; padding:15px;">
            <h3 style="margin-bottom:15px;">⚔️ Resetar coordenadas</h3>
            <button class="btn btn-confirm-no" id="btnResetGlobal">Resetar coordenadas</button>
        </div>
    `;

    Dialog.show(id, content);

    // Botão: reseta a chave global do mundo atual
    document.getElementById("btnResetGlobal").onclick = () => {
        const key = "coordsAtacadas_" + game_data.world; // chave global
        localStorage.removeItem(key);
        UI.InfoMessage("Todas as coordenadas atacadas foram resetadas!", 3000, "success");
    };
})();

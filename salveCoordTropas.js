(function () {
    function abrirJanelaCoordenadas() {
        const html = `
            <div class="vis">
                <h3>Inserir coordenadas</h3>
                <p>Cole abaixo as coordenadas no formato <b>000|000</b>, separadas por espaço, vírgula ou nova linha:</p>
                <textarea id="campoCoordenadas" style="width: 95%; height: 100px;"></textarea>
                <br><br>
                <button class="btn btn-confirm-yes" onclick="importarCoordenadas()">Importar</button>
                <button class="btn" onclick="limparCoordenadas()">Limpar</button>
                <button class="btn" onclick="Dialog.close()">Fechar</button>
            </div>
        `;

        Dialog.show("dialogo_coordenadas", html);
    }

    function importarCoordenadas() {
        const texto = document.getElementById("campoCoordenadas").value;
        const coords = texto.match(/\d{3}\|\d{3}/g) || [];

        if (coords.length === 0) {
            UI.ErrorMessage("Nenhuma coordenada válida encontrada!");
            return;
        }

        UI.SuccessMessage(`${coords.length} coordenadas importadas.`);
        console.log("Coordenadas importadas:", coords);
        // Aqui você pode fazer o que quiser com as coordenadas (ex: salvar, filtrar, etc.)
    }

    function limparCoordenadas() {
        document.getElementById("campoCoordenadas").value = "";
    }

    // Tornar funções acessíveis globalmente, se necessário
    window.abrirJanelaCoordenadas = abrirJanelaCoordenadas;
    window.importarCoordenadas = importarCoordenadas;
    window.limparCoordenadas = limparCoordenadas;

    // Chamada direta, se desejar abrir automaticamente
    abrirJanelaCoordenadas();
})();

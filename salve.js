(function () {
    function abrirJanelaTropas() {
        const tropas = [
            ["spear", "Lanceiro"],
            ["sword", "Espadachim"],
            ["axe", "Machado"],
            ["archer", "Arqueiro"],
            ["light", "Cav. Leve"],
            ["marcher", "Arq. Cavalo"],
            ["heavy", "Cav. Pesada"],
            ["knight", "Paladino"],
            ["spy", "Espião"],
            ["ram", "Ariete"],
            ["catapult", "Catapulta"],
            ["snob", "Nobre"]
        ];

        const makeRow = (units) => `
            <tr>
                ${units.map(([id, title]) =>
                    `<th><img src="/graphic/unit/unit_${id}.png" title="${title}"/></th>`
                ).join("")}
            </tr>
            <tr>
                ${units.map(([id]) =>
                    `<td><input type="number" id="${id}" min="0" value="0" style="width: 50px;"></td>`
                ).join("")}
            </tr>`;

        const html = `
            <div class="vis" style="max-width:800px">
                <h3>Enviar Tropas para Coordenadas (1.2)</h3>
                <p>Insira coordenadas no formato <b>000|000</b>, separadas por espaço ou nova linha:</p>
                <textarea id="campoCoordenadas" style="width: 100%; height: 80px;"></textarea>
                <hr>
                <p><b>Quantidade de Tropas:</b></p>
                <table class="vis" style="width:100%; text-align:center; margin-bottom:10px;">
                    ${makeRow(tropas.slice(0, 4))}     <!-- Infantaria -->
                    ${makeRow(tropas.slice(4, 8))}     <!-- Cavalaria -->
                    ${makeRow(tropas.slice(8, 12))}    <!-- Suporte/Esp -->
                </table>

                <div style="display:flex; justify-content:space-between; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                    <button class="btn btn-confirm-yes" onclick="importarTropas()">✅ Importar e Salvar</button>
                    <button class="btn" onclick="limparCampos()">🧹 Limpar</button>
                    <button class="btn" onclick="mostrarPreview()">👁️ Mostrar Preview</button>
                    <button class="btn" onclick="Dialog.close()">❌ Fechar</button>
                </div>

                <div id="previewContainer" style="margin-top:10px; max-height:150px; overflow-y:auto; background:#f9f9f9; padding:10px; border:1px solid #ccc;"></div>
            </div>
        `;

        Dialog.show("janela_tropas", html);
        carregarDados();
    }

    function coletarTropas() {
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "knight", "spy", "ram", "catapult", "snob"];
        const tropas = {};
        ids.forEach(id => tropas[id] = +document.getElementById(id).value || 0);
        return tropas;
    }

    function importarTropas() {
        const coordsRaw = document.getElementById("campoCoordenadas").value;
        const coords = coordsRaw.match(/\d{3}\|\d{3}/g) || [];
        if (coords.length === 0) {
            UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
            return;
        }

        const tropas = coletarTropas();
        salvarDados(coordsRaw, tropas);
        UI.SuccessMessage(`Importado e salvo ${coords.length} coordenadas com tropas.`);
        mostrarPreview();
    }

    function limparCampos() {
        document.getElementById("campoCoordenadas").value = "";
        Object.keys(coletarTropas()).forEach(id => {
            document.getElementById(id).value = "0";
        });
        document.getElementById("previewContainer").innerHTML = "";
        localStorage.removeItem("tropasSalvas");
        localStorage.removeItem("coordsSalvas");
    }

    function salvarDados(coordsText, tropasObj) {
        localStorage.setItem("coordsSalvas", coordsText);
        localStorage.setItem("tropasSalvas", JSON.stringify(tropasObj));
    }

    function carregarDados() {
        const coordsSalvas = localStorage.getItem("coordsSalvas");
        const tropasSalvas = localStorage.getItem("tropasSalvas");

        if (coordsSalvas) document.getElementById("campoCoordenadas").value = coordsSalvas;

        if (tropasSalvas) {
            const tropas = JSON.parse(tropasSalvas);
            Object.keys(tropas).forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = tropas[id];
            });
        }

        if (coordsSalvas && tropasSalvas) mostrarPreview();
    }

    function mostrarPreview() {
        const coordsText = document.getElementById("campoCoordenadas").value;
        const tropas = coletarTropas();
        const coords = coordsText.match(/\d{3}\|\d{3}/g) || [];

        if (coords.length === 0) {
            document.getElementById("previewContainer").innerHTML = "<i>Nenhuma coordenada válida para mostrar.</i>";
            return;
        }

        let html = `<b>Preview:</b><br>`;
        html += `<span style="color:#666;">${coords.length} coordenadas:</span><br>`;
        html += coords.join(", ") + "<br><br>";
        html += `<span style="color:#666;">Tropas:</span><br>`;
        html += Object.entries(tropas)
            .filter(([_, qtd]) => qtd > 0)
            .map(([uni, qtd]) => `${uni}: <b>${qtd}</b>`)
            .join(", ");

        document.getElementById("previewContainer").innerHTML = html;
    }

    // Expor funções e abrir janela
    window.abrirJanelaTropas = abrirJanelaTropas;
    window.importarTropas = importarTropas;
    window.limparCampos = limparCampos;
    window.mostrarPreview = mostrarPreview;

    abrirJanelaTropas();
})();

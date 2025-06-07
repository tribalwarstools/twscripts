(function () {
    function abrirJanelaTropas() {
        const html = `
            <div class="vis" style="padding:10px;">
                <h3>Enviar Tropas para Coordenadas (1.1)</h3>
                <p>Insira as coordenadas no formato <b>000|000</b>, separadas por espaço ou nova linha:</p>
                <textarea id="campoCoordenadas" style="width: 98%; height: 60px;"></textarea>
                <hr>
                <p><b>Quantidade de tropas:</b></p>
                <table class="vis" style="width: 100%; text-align: left;">
                    ${gerarTabelaTropas()}
                </table>
                <br>
                <button class="btn btn-confirm-yes" onclick="importarTropas()">Importar e Salvar</button>
                <button class="btn" onclick="limparCampos()">Limpar</button>
                <button class="btn" onclick="mostrarPreview()">Mostrar Resultado</button>
                <div id="previewContainer" style="margin-top:10px; max-height: 150px; overflow-y: auto; background:#f0f0f0; padding:5px; border: 1px solid #ccc;"></div>
            </div>
        `;

        Dialog.show("janela_tropas", html);
        carregarDados();
    }

    function gerarTabelaTropas() {
        const unidades = [
            ["spear", "Lanceiro"], ["sword", "Espadachim"],
            ["axe", "Machado"], ["archer", "Arqueiro"],
            ["light", "Cav. Leve"], ["marcher", "Arq. Cav."],
            ["heavy", "Cav. Pesada"], ["spy", "Espião"],
            ["ram", "Ariete"], ["catapult", "Catapulta"],
            ["knight", "Paladino"], ["snob", "Nobre"]
        ];

        let html = "";
        for (let i = 0; i < unidades.length; i += 2) {
            html += "<tr>";
            for (let j = 0; j < 2; j++) {
                const [id, nome] = unidades[i + j] || [];
                if (id) {
                    html += `
                        <td><img src="/graphic/unit/unit_${id}.png" title="${nome}" /> ${nome}</td>
                        <td><input type="number" id="${id}" min="0" value="0" style="width: 60px;"></td>
                    `;
                } else {
                    html += "<td></td><td></td>";
                }
            }
            html += "</tr>";
        }
        return html;
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

    function coletarTropas() {
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        const tropas = {};
        ids.forEach(id => {
            const elem = document.getElementById(id);
            tropas[id] = elem ? +elem.value || 0 : 0;
        });
        return tropas;
    }

    function limparCampos() {
        document.getElementById("campoCoordenadas").value = "";
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        ids.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.value = "0";
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
            Object.keys(tropas).forEach(unidade => {
                const elem = document.getElementById(unidade);
                if (elem) elem.value = tropas[unidade];
            });
        }

        if (coordsSalvas && tropasSalvas) mostrarPreview();
    }

    function mostrarPreview() {
        const coordsText = document.getElementById("campoCoordenadas").value;
        const coords = coordsText.match(/\d{3}\|\d{3}/g) || [];
        const tropas = coletarTropas();

        if (coords.length === 0) {
            document.getElementById("previewContainer").innerHTML = "<i>Nenhuma coordenada válida para mostrar.</i>";
            return;
        }

        let html = `<b>Preview:</b><br>`;
        html += `Coordenadas (${coords.length}):<br>`;
        html += coords.join(", ") + "<br><br>";
        html += "Tropas:<br>";
        html += Object.entries(tropas)
            .filter(([_, qtd]) => qtd > 0)
            .map(([uni, qtd]) => `${uni}: ${qtd}`)
            .join(", ");

        document.getElementById("previewContainer").innerHTML = html;
    }

    // Exporta para janela
    window.abrirJanelaTropas = abrirJanelaTropas;
    window.importarTropas = importarTropas;
    window.limparCampos = limparCampos;
    window.mostrarPreview = mostrarPreview;

    abrirJanelaTropas();
})();

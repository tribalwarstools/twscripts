(function () {
    function abrirJanelaTropas() {
        const html = `
            <div class="vis">
                <h3>Enviar Tropas para Coordenadas</h3>
                <p>Insira as coordenadas no formato <b>000|000</b>, separadas por espaço ou nova linha:</p>
                <textarea id="campoCoordenadas" style="width: 95%; height: 80px;"></textarea>
                <hr>
                <p>Quantidade de tropas:</p>
                <table class="vis" style="width: 100%; text-align: center;">
                    <tr>
                        <th><img src="/graphic/unit/unit_spear.png" title="Lanceiro" /></th>
                        <th><img src="/graphic/unit/unit_sword.png" title="Espadachim" /></th>
                        <th><img src="/graphic/unit/unit_axe.png" title="Machado" /></th>
                        <th><img src="/graphic/unit/unit_light.png" title="Cav. Leve" /></th>
                        <th><img src="/graphic/unit/unit_spy.png" title="Espião" /></th>
                        <th><img src="/graphic/unit/unit_heavy.png" title="Cav. Pesada" /></th>
                    </tr>
                    <tr>
                        <td><input type="number" id="spear" min="0" value="0" style="width: 50px;"></td>
                        <td><input type="number" id="sword" min="0" value="0" style="width: 50px;"></td>
                        <td><input type="number" id="axe" min="0" value="0" style="width: 50px;"></td>
                        <td><input type="number" id="light" min="0" value="0" style="width: 50px;"></td>
                        <td><input type="number" id="spy" min="0" value="0" style="width: 50px;"></td>
                        <td><input type="number" id="heavy" min="0" value="0" style="width: 50px;"></td>
                    </tr>
                </table>
                <br>
                <button class="btn btn-confirm-yes" onclick="importarTropas()">Importar e Salvar</button>
                <button class="btn" onclick="limparCampos()">Limpar</button>
                <button class="btn" onclick="mostrarPreview()">Mostrar Preview</button>
                <button class="btn" onclick="Dialog.close()">Fechar</button>
                <div id="previewContainer" style="margin-top:10px; max-height: 150px; overflow-y: auto; background:#f0f0f0; padding:5px; border: 1px solid #ccc;"></div>
            </div>
        `;

        Dialog.show("janela_tropas", html);

        carregarDados(); // Preenche os campos se tiver dados salvos
    }

    function importarTropas() {
        const coordsRaw = document.getElementById("campoCoordenadas").value;
        const coords = coordsRaw.match(/\d{3}\|\d{3}/g) || [];
        if (coords.length === 0) {
            UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
            return;
        }

        const tropas = {
            spear: +document.getElementById("spear").value || 0,
            sword: +document.getElementById("sword").value || 0,
            axe: +document.getElementById("axe").value || 0,
            light: +document.getElementById("light").value || 0,
            spy: +document.getElementById("spy").value || 0,
            heavy: +document.getElementById("heavy").value || 0
        };

        salvarDados(coordsRaw, tropas);
        UI.SuccessMessage(`Importado e salvo ${coords.length} coordenadas com tropas.`);
        mostrarPreview();
    }

    function limparCampos() {
        document.getElementById("campoCoordenadas").value = "";
        ["spear", "sword", "axe", "light", "spy", "heavy"].forEach(id => {
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
            Object.keys(tropas).forEach(unidade => {
                const elem = document.getElementById(unidade);
                if (elem) elem.value = tropas[unidade];
            });
        }

        if (coordsSalvas && tropasSalvas) mostrarPreview();
    }

    function mostrarPreview() {
        const coordsText = document.getElementById("campoCoordenadas").value;
        const tropas = {
            spear: +document.getElementById("spear").value || 0,
            sword: +document.getElementById("sword").value || 0,
            axe: +document.getElementById("axe").value || 0,
            light: +document.getElementById("light").value || 0,
            spy: +document.getElementById("spy").value || 0,
            heavy: +document.getElementById("heavy").value || 0
        };

        const coords = coordsText.match(/\d{3}\|\d{3}/g) || [];

        if (coords.length === 0) {
            document.getElementById("previewContainer").innerHTML = "<i>Nenhuma coordenada válida para mostrar.</i>";
            return;
        }

        let html = `<b>Preview:</b><br>`;
        html += `Coordenadas (${coords.length}):<br>`;
        html += coords.join(", ") + "<br><br>";
        html += "Tropas:<br>";
        html += Object.entries(tropas)
            .map(([uni, qtd]) => `${uni}: ${qtd}`)
            .join(", ");

        document.getElementById("previewContainer").innerHTML = html;
    }

    window.abrirJanelaTropas = abrirJanelaTropas;
    window.importarTropas = importarTropas;
    window.limparCampos = limparCampos;
    window.mostrarPreview = mostrarPreview;

    abrirJanelaTropas();
})();

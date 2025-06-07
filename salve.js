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
                <button class="btn btn-confirm-yes" onclick="importarTropas()">Importar</button>
                <button class="btn" onclick="limparCampos()">Limpar</button>
                <button class="btn" onclick="Dialog.close()">Fechar</button>
            </div>
        `;

        Dialog.show("janela_tropas", html);
    }

    function importarTropas() {
        const coords = document.getElementById("campoCoordenadas").value.match(/\d{3}\|\d{3}/g) || [];
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

        UI.SuccessMessage(`Importado ${coords.length} coordenadas com tropas.`);
        console.log("Coordenadas:", coords);
        console.log("Tropas:", tropas);

        // Aqui pode ser incluída lógica adicional
    }

    function limparCampos() {
        document.getElementById("campoCoordenadas").value = "";
        ["spear", "sword", "axe", "light", "spy", "heavy"].forEach(id => {
            document.getElementById(id).value = "0";
        });
    }

    window.abrirJanelaTropas = abrirJanelaTropas;
    window.importarTropas = importarTropas;
    window.limparCampos = limparCampos;

    abrirJanelaTropas();
})();

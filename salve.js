function abrirJanelaTropas() {
    let htmlTropas = `
    <div class="vis">
        <table class="vis" style="width:100%; text-align:center;">
            <thead>
                <tr><th colspan="5">Infantaria</th></tr>
                <tr>
                    <th><img src="/graphic/unit/unit_spear.png" title="Lanceiro" /></th>
                    <th><img src="/graphic/unit/unit_sword.png" title="Espadachim" /></th>
                    <th><img src="/graphic/unit/unit_axe.png" title="Machado" /></th>
                    <th><img src="/graphic/unit/unit_archer.png" title="Arqueiro" /></th>
                    <th><img src="/graphic/unit/unit_spy.png" title="Espião" /></th>
                </tr>
                <tr>
                    <td><input type="number" id="spear" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="sword" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="axe" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="archer" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="spy" min="0" value="0" style="width:50px;"></td>
                </tr>

                <tr><th colspan="5">Cavalaria</th></tr>
                <tr>
                    <th><img src="/graphic/unit/unit_light.png" title="Cav. Leve" /></th>
                    <th><img src="/graphic/unit/unit_marcher.png" title="Arqueiro a Cavalo" /></th>
                    <th><img src="/graphic/unit/unit_heavy.png" title="Cav. Pesada" /></th>
                    <th><img src="/graphic/unit/unit_ram.png" title="Ariete" /></th>
                    <th><img src="/graphic/unit/unit_catapult.png" title="Catapulta" /></th>
                </tr>
                <tr>
                    <td><input type="number" id="light" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="marcher" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="heavy" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="ram" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="catapult" min="0" value="0" style="width:50px;"></td>
                </tr>

                <tr><th colspan="5">Especiais</th></tr>
                <tr>
                    <th><img src="/graphic/unit/unit_knight.png" title="Paladino" /></th>
                    <th><img src="/graphic/unit/unit_snob.png" title="Nobre" /></th>
                    <th colspan="3"></th>
                </tr>
                <tr>
                    <td><input type="number" id="knight" min="0" value="0" style="width:50px;"></td>
                    <td><input type="number" id="snob" min="0" value="0" style="width:50px;"></td>
                    <td colspan="3"></td>
                </tr>
            </thead>
        </table>

        <center style="margin-top:10px;">
            <button class="btn btn-confirm-yes" onclick="importarTropas()">Importar</button>
            <button class="btn" onclick="limparTropas()">Limpar</button>
        </center>
    </div>`;

    Dialog.show("janelaTropas", htmlTropas);

    window.importarTropas = function () {
        let unidades = ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
        let tropas = {};
        unidades.forEach(unidade => {
            tropas[unidade] = parseInt(document.getElementById(unidade).value) || 0;
        });
        console.log("Tropas importadas:", tropas);
        UI.SuccessMessage("Tropas importadas com sucesso!");
        // Aqui você pode continuar com o uso de `tropas` como desejar
    };

    window.limparTropas = function () {
        document.querySelectorAll("#janelaTropas input[type='number']").forEach(input => input.value = 0);
    };
}

window.abrirJanelaTropas = abrirJanelaTropas;

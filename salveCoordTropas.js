function abrirJanelaTropas() {
    const unidades = [
        "spear", "sword", "axe", "archer", "spy",
        "light", "marcher", "heavy", "ram", "catapult",
        "knight", "snob"
    ];

    let tropasSalvas = JSON.parse(localStorage.getItem("tropas_padrao")) || {};

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
                    ${unidades.slice(0, 5).map(u => `<td><input type="number" id="${u}" min="0" value="${tropasSalvas[u] || 0}" style="width:50px;"></td>`).join("")}
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
                    ${unidades.slice(5, 10).map(u => `<td><input type="number" id="${u}" min="0" value="${tropasSalvas[u] || 0}" style="width:50px;"></td>`).join("")}
                </tr>

                <tr><th colspan="5">Especiais</th></tr>
                <tr>
                    <th><img src="/graphic/unit/unit_knight.png" title="Paladino" /></th>
                    <th><img src="/graphic/unit/unit_snob.png" title="Nobre" /></th>
                    <th colspan="3"></th>
                </tr>
                <tr>
                    ${unidades.slice(10).map(u => `<td><input type="number" id="${u}" min="0" value="${tropasSalvas[u] || 0}" style="width:50px;"></td>`).join("")}
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
        let tropas = {};
        unidades.forEach(unidade => {
            tropas[unidade] = parseInt(document.getElementById(unidade).value) || 0;
        });
        localStorage.setItem("tropas_padrao", JSON.stringify(tropas));
        UI.SuccessMessage("Tropas salvas com sucesso!");
        console.log("Tropas salvas:", tropas);
    };

    window.limparTropas = function () {
        unidades.forEach(unidade => {
            document.getElementById(unidade).value = 0;
        });
        UI.SuccessMessage("Campos zerados.");
    };
}

window.abrirJanelaTropas = abrirJanelaTropas;

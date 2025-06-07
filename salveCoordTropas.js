function abrirJanelaTropas() {
    const unidades = [
        "spear", "sword", "axe", "archer", "spy",
        "light", "marcher", "heavy", "ram", "catapult",
        "knight", "snob"
    ];

    const nomesUnidades = {
        spear: "Lanceiro",
        sword: "Espadachim",
        axe: "Machado",
        archer: "Arqueiro",
        spy: "Espião",
        light: "Cav. Leve",
        marcher: "Arq. Cavalo",
        heavy: "Cav. Pesada",
        ram: "Ariete",
        catapult: "Catapulta",
        knight: "Paladino",
        snob: "Nobre"
    };

    // Tenta carregar do cache
    let tropasSalvas = {};
    try {
        const dataCache = localStorage.getItem('tropasCache');
        if (dataCache) tropasSalvas = JSON.parse(dataCache);
    } catch {
        tropasSalvas = {};
    }

    // Monta o HTML do formulário
    let html = `<div class="vis"><table class="vis" style="width:100%">`;
    unidades.forEach(unidade => {
        const valor = tropasSalvas[unidade] ?? '';
        html += `
            <tr>
                <td style="width:150px">${nomesUnidades[unidade]}</td>
                <td><input type="number" min="0" id="input_${unidade}" value="${valor}" style="width:100px"></td>
            </tr>
        `;
    });
    html += `</table>`;

    // Botões: salvar, limpar, preview
    html += `
        <br>
        <center>
            <button class="btn btn-confirm-yes" id="btnSalvar">Salvar</button>
            <button class="btn" id="btnLimpar">Limpar</button>
            <button class="btn" id="btnPreview">Preview</button>
        </center>
        <br>
        <div id="previewArea" style="max-height:200px; overflow:auto; border:1px solid #ccc; padding:5px; display:none;"></div>
    </div>`;

    // Abre o dialog do Tribal Wars
    Dialog.show('JanelaTropas', html);

    // Função salvar
    function salvar() {
        let dados = {};
        let valido = false;
        unidades.forEach(unidade => {
            let val = parseInt(document.getElementById(`input_${unidade}`).value) || 0;
            dados[unidade] = val;
            if (val > 0) valido = true;
        });
        if (!valido) {
            UI.InfoMessage("Insira ao menos um valor maior que zero.", 3000, "error");
            return;
        }
        localStorage.setItem('tropasCache', JSON.stringify(dados));
        UI.InfoMessage("Tropas salvas com sucesso!", 3000, "success");
        mostrarPreview();
    }

    // Função limpar
    function limpar() {
        unidades.forEach(unidade => {
            document.getElementById(`input_${unidade}`).value = '';
        });
        localStorage.removeItem('tropasCache');
        document.getElementById('previewArea').style.display = 'none';
        UI.InfoMessage("Campos limpos e cache removido.", 3000, "success");
    }

    // Função mostrar preview
    function mostrarPreview() {
        let dados = localStorage.getItem('tropasCache');
        if (!dados) {
            UI.InfoMessage("Nenhum dado salvo para mostrar.", 3000, "warning");
            return;
        }
        dados = JSON.parse(dados);
        let texto = '<b>Preview das tropas salvas:</b><br><ul>';
        for (const [unidade, qtd] of Object.entries(dados)) {
            if (qtd > 0) texto += `<li>${nomesUnidades[unidade]}: ${qtd}</li>`;
        }
        texto += '</ul>';
        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = texto;
        previewArea.style.display = 'block';
    }

    // Eventos dos botões
    document.getElementById('btnSalvar').addEventListener('click', salvar);
    document.getElementById('btnLimpar').addEventListener('click', limpar);
    document.getElementById('btnPreview').addEventListener('click', mostrarPreview);

    // Mostrar preview automático ao abrir se já tiver dados
    if (Object.keys(tropasSalvas).length > 0) {
        mostrarPreview();
    }
}

// Para expor a função globalmente, se quiser chamar direto pelo console ou botão
window.abrirJanelaTropas = abrirJanelaTropas;

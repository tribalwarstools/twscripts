(async function () {
    // --- Funções auxiliares ---

    function decodeName(str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    }

    async function fetchWorldData(type) {
        const url = `https://${window.location.host}/map/${type}.txt`;
        const res = await fetch(url);
        const text = await res.text();
        return text.trim().split('\n').map(line => line.split(','));
    }

    function buildDropdown(array, entity) {
        let html = `
            <tr>
                <td><label for="ra${entity}"><b>${entity === 'Players' ? 'Jogador' : 'Tribo'}</b></label></td>
                <td>
                    <input type="text" list="list${entity}" id="ra${entity}" style="width: 250px;" placeholder="Digite ou selecione">
                    <datalist id="list${entity}">
        `;
        array.forEach(item => {
            if (entity === 'Players') html += `<option value="${decodeName(item[1])}">`;
            if (entity === 'Tribes') html += `<option value="${decodeName(item[2])}">`;
        });
        html += `</datalist></td></tr>`;
        return html;
    }

    function getVillagesByEntity(villages, players, tribes, name, type) {
        if (type === 'Players') {
            const player = players.find(p => decodeName(p[1]) === name);
            if (!player) return [];
            const playerId = player[0];
            return villages.filter(v => v[4] === playerId).map(v => `${v[2]}|${v[3]}`);
        }
        if (type === 'Tribes') {
            const tribe = tribes.find(t => decodeName(t[2]) === name);
            if (!tribe) return [];
            const tribeId = tribe[0];
            const playerIds = players.filter(p => p[2] === tribeId).map(p => p[0]);
            return villages.filter(v => playerIds.includes(v[4])).map(v => `${v[2]}|${v[3]}`);
        }
        return [];
    }

    function displayCoords(coords) {
        if (!coords || coords.length === 0) {
            textareaCoords.value = "";
            btnCopiar.disabled = true;
            previewContainer.innerHTML = `<i>Nenhuma coordenada encontrada.</i>`;
        } else {
            textareaCoords.value = coords.join(' ');
            btnCopiar.disabled = false;
            previewContainer.innerHTML = "";
        }
    }

    // --- Gerador da tabela de tropas ---

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
                        <td><img src="/graphic/unit/unit_${id}.png" title="${nome}" style="vertical-align:middle;"/> ${nome}</td>
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

    function coletarTropas() {
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        const tropas = {};
        ids.forEach(id => {
            const elem = document.getElementById(id);
            tropas[id] = elem ? +elem.value || 0 : 0;
        });
        return tropas;
    }

    function mostrarPreview() {
        const coordsText = textareaCoords.value;
        const coords = coordsText.match(/\d{3}\|\d{3}/g) || [];
        const tropas = coletarTropas();

        if (coords.length === 0) {
            previewContainer.innerHTML = "<i>Nenhuma coordenada válida para mostrar.</i>";
            return;
        }

        const nomesUnidades = {
            spear: "Lanceiro",
            sword: "Espadachim",
            axe: "Machado",
            archer: "Arqueiro",
            light: "Cav. Leve",
            marcher: "Arq. Cav.",
            heavy: "Cav. Pesada",
            spy: "Espião",
            ram: "Ariete",
            catapult: "Catapulta",
            knight: "Paladino",
            snob: "Nobre"
        };

        let html = `<b>Pré-visualização:</b><br>`;
        html += `Coordenadas (${coords.length}):<br>`;
        html += coords.join(", ") + "<br><br>";
        html += "Tropas configuradas:<br>";
        html += Object.entries(tropas)
            .filter(([_, qtd]) => qtd > 0)
            .map(([uni, qtd]) => `${nomesUnidades[uni] || uni}: ${qtd}`)
            .join(", ");

        previewContainer.innerHTML = html;
    }

    function salvarDadosManualmente() {
        const coordsRaw = textareaCoords.value;
        const tropas = coletarTropas();
        localStorage.setItem("coordsSalvas", coordsRaw);
        localStorage.setItem("tropasSalvas", JSON.stringify(tropas));
        alert("Dados salvos com sucesso.");
    }

    function limparCampos() {
        textareaCoords.value = "";
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        ids.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.value = "0";
        });
        previewContainer.innerHTML = "";
        localStorage.removeItem("tropasSalvas");
        localStorage.removeItem("coordsSalvas");
        btnCopiar.disabled = true;
    }

    function colarCoordenadas() {
        navigator.clipboard.readText().then(texto => {
            textareaCoords.value = texto;
            alert("Coordenadas coladas.");
            btnCopiar.disabled = textareaCoords.value.trim().length === 0;
        }).catch(() => {
            alert("Falha ao acessar a área de transferência.");
        });
    }

    function copiarCoordenadas() {
        if (textareaCoords.value.trim().length === 0) {
            alert("Nenhuma coordenada para copiar.");
            return;
        }
        navigator.clipboard.writeText(textareaCoords.value).then(() => {
            alert("Coordenadas copiadas para a área de transferência.");
        });
    }

    // --- Layout do painel com estilo TW ---
    const style = `
        <style>
            #twCoordPanel {
                position: fixed;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                background: #f4e4bc;
                border: 2px solid #804000;
                padding: 10px;
                z-index: 9999;
                font-size: 12px;
                min-width: 520px;
                max-width: 700px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                font-family: Tahoma, Geneva, Verdana, sans-serif;
            }
            #twCoordPanel table {
                width: 100%;
                border-spacing: 5px;
                margin-bottom: 10px;
            }
            #twCoordPanel h3 {
                margin-top: 0;
                color: #804000;
                text-align: center;
            }
            #twCoordPanel .btn {
                padding: 4px 8px;
                background: #d2b48c;
                border: 1px solid #804000;
                cursor: pointer;
                margin-right: 5px;
                font-size: 12px;
            }
            #twCoordPanel textarea {
                font-size: 11px;
                font-family: monospace;
                width: 100%;
                height: 70px;
                resize: vertical;
                margin-bottom: 5px;
            }
            #twCoordPanel #previewContainer {
                margin-top: 10px;
                max-height: 150px;
                overflow-y: auto;
                background: #f0f0f0;
                padding: 5px;
                border: 1px solid #ccc;
                font-size: 11px;
            }
            #twCoordPanel label {
                font-weight: bold;
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', style);

    // --- Criação do painel ---
    const panel = document.createElement('div');
    panel.id = 'twCoordPanel';

    panel.innerHTML = `
        <h3>Gerenciador de Coordenadas e Tropas</h3>
        <table id="coordTable"></table>

        <label for="textareaCoords">Coordenadas:</label>
        <textarea id="textareaCoords" placeholder="Selecione jogador/tribo ou cole coordenadas manualmente"></textarea>

        <button class="btn" id="btnColar">Colar Coordenadas</button>
        <button class="btn" id="btnCopiar" disabled>📋 Copiar Coordenadas</button>
        <button class="btn" id="btnSalvar">Salvar Dados</button>
        <button class="btn" id="btnLimpar">Limpar Campos</button>
        <button class="btn" id="btnPreview">Mostrar Preview</button>

        <hr>

        <h3>Configurar Tropas para Envio</h3>
        <table id="tropasTable" class="vis"></table>

        <div id="previewContainer"></div>
    `;

    document.body.appendChild(panel);

    // --- Elementos ---
    const coordTable = document.getElementById('coordTable');
    const textareaCoords = document.getElementById('textareaCoords');
    const btnColar = document.getElementById('btnColar');
    const btnCopiar = document.getElementById('btnCopiar');
    const btnSalvar = document.getElementById('btnSalvar');
    const btnLimpar = document.getElementById('btnLimpar');
    const btnPreview = document.getElementById('btnPreview');
    const previewContainer = document.getElementById('previewContainer');
    const tropasTable = document.getElementById('tropasTable');

    // --- Monta dropdowns de jogador e tribo ---
    const villages = await fetchWorldData('village');
    const players = await fetchWorldData('player');
    const tribes = await fetchWorldData('ally');

    coordTable.innerHTML =
        buildDropdown(players, 'Players') +
        buildDropdown(tribes, 'Tribes');

    // --- Preenche tabela de tropas ---
    tropasTable.innerHTML = gerarTabelaTropas();

    // --- Eventos ---
    document.getElementById('raPlayers').addEventListener('change', function () {
        const name = this.value.trim();
        const coords = getVillagesByEntity(villages, players, tribes, name, 'Players');
        displayCoords(coords);
    });

    document.getElementById('raTribes').addEventListener('change', function () {
        const name = this.value.trim();
        const coords = getVillagesByEntity(villages, players, tribes, name, 'Tribes');
        displayCoords(coords);
    });

    btnColar.addEventListener('click', colarCoordenadas);
    btnCopiar.addEventListener('click', copiarCoordenadas);
    btnSalvar.addEventListener('click', salvarDadosManualmente);
    btnLimpar.addEventListener('click', limparCampos);
    btnPreview.addEventListener('click', mostrarPreview);

    // --- Carrega dados salvos ao iniciar ---
    (function carregarDados() {
        const coordsSalvas = localStorage.getItem("coordsSalvas");
        const tropasSalvas = localStorage.getItem("tropasSalvas");

        if (coordsSalvas) textareaCoords.value = coordsSalvas;
        if (tropasSalvas) {
            const tropasObj = JSON.parse(tropasSalvas);
            for (const [id, val] of Object.entries(tropasObj)) {
                const input = document.getElementById(id);
                if (input) input.value = val;
            }
        }
        btnCopiar.disabled = textareaCoords.value.trim().length === 0;
    })();

})();

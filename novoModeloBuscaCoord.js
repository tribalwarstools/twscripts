(function () {
    UI.InfoMessage('Iniciando versão 1.3...');

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

    function coletarTropas() {
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        const tropas = {};
        ids.forEach(id => {
            const elem = document.getElementById(id);
            tropas[id] = elem ? +elem.value || 0 : 0;
        });
        return tropas;
    }

    function importarCoordenadas() {
        const coordsRaw = document.getElementById("campoCoordenadas").value;
        const coords = coordsRaw.match(/\d{3}\|\d{3}/g) || [];
        if (coords.length === 0) {
            UI.ErrorMessage("Nenhuma coordenada válida encontrada.");
            return;
        }
        localStorage.setItem("coordsSalvas", coordsRaw);
        UI.SuccessMessage(`Importado ${coords.length} coordenadas.`);
    }

    function salvarDadosManualmente() {
        //const coordsRaw = document.getElementById("campoCoordenadas").value;
        const tropas = coletarTropas();
        //localStorage.setItem("coordsSalvas", coordsRaw);
        localStorage.setItem("tropasSalvas", JSON.stringify(tropas));
        UI.SuccessMessage("Dados salvos com sucesso.");
    }

    function colarCoordenadas() {
        navigator.clipboard.readText().then(texto => {
            document.getElementById("campoCoordenadas").value = texto;
            UI.SuccessMessage("Coordenadas coladas.");
        }).catch(() => {
            UI.ErrorMessage("Falha ao acessar a área de transferência.");
        });
    }

    function limparCampos() {
        document.getElementById("campoCoordenadas").value = "";
        const ids = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy", "spy", "ram", "catapult", "knight", "snob"];
        ids.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.value = "0";
        });
        document.getElementById("previewContainer").innerHTML = "";
        document.getElementById("raPlayers").value = "";
        document.getElementById("raTribes").value = "";
        localStorage.removeItem("tropasSalvas");
        localStorage.removeItem("coordsSalvas");
        UI.SuccessMessage("Todos os campos foram limpos.");
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
    }

    function mostrarPreview() {
        const coordsText = document.getElementById("campoCoordenadas").value;
        const coords = coordsText.match(/\d{3}\|\d{3}/g) || [];
        const tropas = coletarTropas();

        if (coords.length === 0) {
            document.getElementById("previewContainer").innerHTML = "<i>Nenhuma coordenada válida para mostrar.</i>";
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

        document.getElementById("previewContainer").innerHTML = html;
    }

    function decodeName(str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    }

    async function fetchWorldData(type) {
        const url = `https://${window.location.host}/map/${type}.txt`;
        const res = await fetch(url);
        const text = await res.text();
        return text.trim().split('\n').map(line => line.split(','));
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

    async function abrirJanelaCompleta() {
        const villages = await fetchWorldData('village');
        const players = await fetchWorldData('player');
        const tribes = await fetchWorldData('ally');

        const html = `
        <div class="vis" style="padding:10px; max-width: 700px;">
            <h2>Gerenciador de Envio de Tropas</h2>

            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 8px;">
                <div style="flex:1 1 300px;">
                    <label for="raPlayers"><b>Jogador:</b></label><br>
                    <input list="listPlayers" id="raPlayers" style="width: 50%;" placeholder="Digite ou escolha o jogador...">
                    <datalist id="listPlayers">
                        ${players.map(p => `<option value="${decodeName(p[1])}">`).join('')}
                    </datalist>
                </div>
                <div style="flex:1 1 300px;">
                    <label for="raTribes"><b>Tribo:</b></label><br>
                    <input list="listTribes" id="raTribes" style="width: 50%;" placeholder="Digite ou escolha a tribo...">
                    <datalist id="listTribes">
                        ${tribes.map(t => `<option value="${decodeName(t[2])}">`).join('')}
                    </datalist>
                </div>
            </div>

            <label for="campoCoordenadas" style="display:block; margin-bottom: 4px;"><b>Coordenadas (formato 000|000):</b></label>
            <textarea id="campoCoordenadas" style="width: 98%; height: 80px; resize: vertical;" placeholder="Cole as coordenadas aqui"></textarea>

            <div style="margin: 8px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn" id="btnColar" style="flex: 1 1 120px; min-width: 100px;">Colar</button>
                <button class="btn" id="btnImportar" style="flex: 1 1 120px; min-width: 100px;">Importar Coordenadas</button>
            </div>

            <h3>Quantidade de Tropas</h3>
            <table class="vis" style="width: 100%; text-align: left; margin-bottom: 8px;">
                ${gerarTabelaTropas()}
            </table>

            <div style="margin-bottom: 8px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn" id="btnSalvar" style="flex: 1 1 120px; min-width: 100px;">Salvar</button>
                <button class="btn" id="btnLimpar" style="flex: 1 1 120px; min-width: 100px;">Limpar</button>
                <button class="btn" id="btnPreview" style="flex: 1 1 120px; min-width: 100px;">Mostrar Resultado</button>
            </div>

            <div id="previewContainer" style="max-height: 140px; overflow-y: auto; background:#f0f0f0; padding:5px; border: 1px solid #ccc;"></div>
        </div>
        `;

        Dialog.show("janela_tropas", html);

        const raPlayers = document.getElementById('raPlayers');
        const raTribes = document.getElementById('raTribes');
        const campoCoordenadas = document.getElementById('campoCoordenadas');

        function atualizarCoordenadasPorJogador(nome) {
            if (!nome.trim()) return;
            const coords = getVillagesByEntity(villages, players, tribes, nome, 'Players');
            campoCoordenadas.value = coords.join(' ');
        }

        function atualizarCoordenadasPorTribo(nome) {
            if (!nome.trim()) return;
            const coords = getVillagesByEntity(villages, players, tribes, nome, 'Tribes');
            campoCoordenadas.value = coords.join(' ');
        }

        raPlayers.addEventListener('change', () => {
            const nome = raPlayers.value;
            atualizarCoordenadasPorJogador(nome);
            raTribes.value = "";
        });

        raTribes.addEventListener('change', () => {
            const nome = raTribes.value;
            atualizarCoordenadasPorTribo(nome);
            raPlayers.value = "";
        });

        document.getElementById("btnColar").onclick = colarCoordenadas;
        document.getElementById("btnImportar").onclick = importarCoordenadas;
        document.getElementById("btnSalvar").onclick = salvarDadosManualmente;
        document.getElementById("btnLimpar").onclick = limparCampos;
        document.getElementById("btnPreview").onclick = mostrarPreview;

        carregarDados();
    }

    abrirJanelaCompleta();
})();

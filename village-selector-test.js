(async function () {
    const groups = [];
    const coordToId = {};
    const STORAGE_KEY_GROUP = "tw_last_selected_group";
    const STORAGE_KEY_COUNT = "tw_lastCount_renamer";

    const parseCoords = (coord) => {
        const [x, y] = coord.split("|");
        return { x, y };
    };

    // Carrega mapa para mapear coordenadas → ID
    const mapData = await $.get("map/village.txt");
    const lines = mapData.trim().split("\n");
    lines.forEach(line => {
        const [id, name, x, y] = line.split(",");
        const coord = `${x}|${y}`;
        coordToId[coord] = id;
    });

    // Carrega grupos do jogador
    const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
    groupData.result.forEach(group => {
        groups.push({ group_id: group.group_id, group_name: group.name });
    });

    // Monta HTML do painel com seleção, tabela e renomeador
    const html = `
        <div class="vis" style="padding: 10px; max-width: 600px;">
            <h2>Grupos de Aldeias</h2>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <label for="groupSelect"><b>Selecione um grupo:</b></label>
                <select id="groupSelect" style="
                    padding: 4px;
                    background: #f4e4bc;
                    color: #000;
                    border: 1px solid #603000;
                    font-weight: bold;
                "></select>
                <span id="villageCount" style="font-weight: bold;"></span>
            </div>
            <div id="groupVillages" style="max-height: 300px; overflow-y: auto; margin-bottom: 10px;"></div>

            <hr>

            <h3>Renomear aldeias do grupo selecionado</h3>
            <label><input type="checkbox" id="useNumbering"> Usar numeração automática</label><br>
            <label style="display:inline-block; margin-top:6px;">Número inicial: <input type="number" id="startNumber" value="1" min="1" style="width: 60px;"></label><br>
            <label style="display:inline-block; margin-top:6px;">Quantidade de dígitos: <input type="number" id="padLength" value="3" min="1" max="5" style="width: 50px;"></label><br>
            <label style="display:inline-block; margin-top:6px;">Nome base: <input type="text" id="baseName" maxlength="32" style="width: 250px;" placeholder="Nome base das aldeias"></label><br>
            <button id="renameGroupBtn" class="btn" style="margin-top: 10px;">Renomear aldeias do grupo</button>
            <div id="renameStatus" style="margin-top: 10px; font-weight: bold;"></div>
        </div>
    `;

    Dialog.show("tw_group_viewer_renamer", html);

    const select = document.getElementById("groupSelect");
    const $groupVillages = $("#groupVillages");
    const $renameStatus = $("#renameStatus");

    // Placeholder
    const placeholder = document.createElement("option");
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.hidden = false;
    placeholder.textContent = "Selecione um grupo";
    select.appendChild(placeholder);

    // Adiciona grupos ao select
    groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.group_id;
        opt.textContent = g.group_name || "(sem nome)";
        if (!g.group_name) {
            opt.disabled = true;
            opt.style.color = "#999";
        }
        select.appendChild(opt);
    });

    // Carrega grupo salvo e atualiza seleção
    const savedGroupId = localStorage.getItem(STORAGE_KEY_GROUP);
    if (savedGroupId) {
        select.value = savedGroupId;
    }

    // Atualiza o campo startNumber com o contador salvo
    let lastCountSaved = localStorage.getItem(STORAGE_KEY_COUNT);
    if (lastCountSaved && !isNaN(lastCountSaved)) {
        $("#startNumber").val(Number(lastCountSaved) + 1);
    }

    // Função para carregar aldeias do grupo selecionado
    async function loadGroupVillages(groupId) {
        if (!groupId) return;

        localStorage.setItem(STORAGE_KEY_GROUP, groupId);

        placeholder.hidden = true;

        $groupVillages.html("<i>Carregando aldeias...</i>");
        $("#villageCount").text("");

        const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", {
            group_id: groupId
        });

        const doc = new DOMParser().parseFromString(response.html, "text/html");
        const rows = doc.querySelectorAll("#group_table tbody tr");

        if (!rows.length) {
            $groupVillages.html("<p><i>Nenhuma aldeia no grupo.</i></p>");
            $("#villageCount").text("(0 aldeias)");
            return;
        }

        let output = `<table class="vis" width="100%">
            <thead><tr><th>Nome</th><th>Coordenadas</th><th>Ações</th></tr></thead><tbody>`;
        let total = 0;

        rows.forEach(row => {
            const tds = row.querySelectorAll("td");
            if (tds.length >= 2) {
                const name = tds[0].textContent.trim();
                const coords = tds[1].textContent.trim();
                const id = coordToId[coords];
                const link = id
                    ? `<a href="/game.php?village=${id}&screen=overview" target="_blank">${name}</a>`
                    : name;

                output += `<tr>
                    <td>${link}</td>
                    <td><span class="coord-val">${coords}</span></td>
                    <td><button class="btn copy-coord" data-coord="${coords}">📋</button></td>
                </tr>`;
                total++;
            }
        });
        output += `</tbody></table>`;

        $groupVillages.html(output);
        $("#villageCount").text(`(${total} aldeias)`);

        // Evento copiar coordenada
        $(".copy-coord").on("click", function () {
            const coord = $(this).data("coord");
            navigator.clipboard.writeText(coord);
            UI.SuccessMessage(`Coordenada ${coord} copiada!`);
        });
    }

    // Evento de seleção do grupo
    select.addEventListener("change", e => {
        loadGroupVillages(e.target.value);
    });

    // Se já tem grupo salvo, carrega as aldeias
    if (savedGroupId) {
        loadGroupVillages(savedGroupId);
    }

    // Função para renomear aldeias do grupo
    async function renameGroupVillages() {
        const useNumbering = $("#useNumbering").prop("checked");
        let startNumber = Number($("#startNumber").val());
        const padLength = Number($("#padLength").val());
        const baseName = $("#baseName").val().trim();

        if (!baseName && !useNumbering) {
            UI.InfoMessage("Informe o nome base ou ative a numeração.");
            return;
        }
        if (!startNumber || startNumber < 1) startNumber = 1;

        const rows = $("#groupVillages table tbody tr");
        if (rows.length === 0) {
            UI.InfoMessage("Nenhuma aldeia para renomear.");
            return;
        }

        $renameStatus.text("Iniciando renomeação...");
        $("#renameGroupBtn").prop("disabled", true);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const coord = $(row).find(".coord-val").text().trim();
            const villageId = coordToId[coord];

            if (!villageId) {
                $renameStatus.text(`ID não encontrado para a aldeia na linha ${i+1}`);
                continue;
            }

            // Procura o botão renomear da aldeia no DOM principal
            const renameIcon = $(`.rename-icon[data-village-id="${villageId}"]`);
            if (renameIcon.length === 0) {
                $renameStatus.text(`Botão renomear não encontrado para aldeia ID ${villageId}`);
                continue;
            }

            renameIcon.click();

            // Monta o novo nome
            const numberPart = useNumbering ? String(startNumber + i).padStart(padLength, "0") : "";
            const newName = `${numberPart} ${baseName}`.trim();

            $(".vis input[type='text']").val(newName);

            // Confirma renomeação clicando no botão (assumindo que seja o único input button visível)
            $("input[type='button']").click();

            $renameStatus.text(`Renomeando aldeia ${i + 1} de ${rows.length}: ${newName}`);

            // Salva último contador no localStorage
            localStorage.setItem(STORAGE_KEY_COUNT, startNumber + i);

            // Delay para evitar sobrecarga (ajuste se quiser)
            await new Promise(r => setTimeout(r, 300));
        }

        $renameStatus.text("Renomeação finalizada!");
        UI.SuccessMessage("Todas as aldeias do grupo foram renomeadas.");
        $("#renameGroupBtn").prop("disabled", false);

        // Atualiza o campo startNumber para próxima renomeação
        $("#startNumber").val(startNumber + rows.length);
    }

    // Botão renomear
    $("#renameGroupBtn").on("click", renameGroupVillages);
})();

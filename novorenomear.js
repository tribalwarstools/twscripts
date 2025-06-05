javascript:
(async function () {
    const groups = [];
    const coordToId = {};
    const STORAGE_KEY = "tw_last_selected_group";

    // Função para pausar (delay)
    const sleep = ms => new Promise(res => setTimeout(res, ms));

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

    // Interface com painel + renomeação embutida
    const html = `
        <div class="vis" style="padding: 10px; width: 720px;">
            <h2>Grupos de Aldeias</h2>
            <div style="display: flex; align-items: center; gap: 10px;">
                <label for="groupSelect"><b>Selecione um grupo:</b></label>
                <select id="groupSelect" style="
                    padding: 4px;
                    background: #f4e4bc;
                    color: #000;
                    border: 1px solid #603000;
                    font-weight: bold;
                    flex-grow: 1;
                "></select>
                <span id="villageCount" style="font-weight: bold;"></span>
            </div>
            <hr>

            <div style="margin-bottom: 10px;">
                <div class="info_box">
                    <div class="content" style="margin-left: 4px; font-size: 12px; line-height: 1.3em;">
                        <b>1 -</b> Example 1, starting with 001.<br>
                        <b>2 -</b> Example 3, starting with 3 digits.
                    </div>
                </div>
                <input id="firstbox" type="checkbox" style="margin-right:4px;"> Numerar aldeias<br>
                <input id="start" type="text" placeholder="1" size="3" style="width: 40px; margin-right:4px;">
                <input id="end" type="text" placeholder="3" size="3" style="width: 40px;">
            </div>

            <div style="margin-bottom: 10px;">
                <input id="secondbox" type="checkbox" style="margin-right:4px;"> Incluir texto fixo<br>
                <input id="textname" type="text" placeholder="Seu texto aqui" maxlength="32" style="width: 100%; padding: 4px; font-weight: bold;">
            </div>

            <div style="padding-top: 8px; margin-bottom: 10px;">
                <input id="rename" type="button" class="btn" value="Renomear Aldeias">
                <input id="save" type="button" class="btn" value="Salvar Opções">
            </div>

            <div id="renameStatus" style="font-weight: bold; margin-bottom: 10px;"></div>

            <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
        </div>
    `;
    Dialog.show("tw_group_viewer", html);
    $("#popup_box_tw_group_viewer").css({ width: "720px", maxWidth: "90vw" });

    const select = document.getElementById("groupSelect");
    const savedGroupId = localStorage.getItem(STORAGE_KEY);

    // Placeholder no select
    const placeholder = document.createElement("option");
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.hidden = false;
    placeholder.textContent = "Selecione um grupo";
    select.appendChild(placeholder);

    // Preencher opções dos grupos
    groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.group_id;
        opt.textContent = g.group_name || "";
        if (!g.group_name) {
            opt.disabled = true;
            opt.style.color = "#999";
        }
        if (savedGroupId == g.group_id) {
            opt.selected = true;
            placeholder.hidden = true;
        }
        select.appendChild(opt);
    });

    // Carregar configurações salvas de renomeação
    let renameSettings = localStorage.getItem('renameSettings');
    if (renameSettings) {
        renameSettings = JSON.parse(renameSettings);
        $('#firstbox').prop('checked', renameSettings.firstbox);
        $('#start').val(renameSettings.start);
        $('#end').val(renameSettings.end);
        $('#secondbox').prop('checked', renameSettings.secondbox);
        $('#textname').val(renameSettings.textname);
    }

    // Evento salvar opções
    $('#save').on('click', () => {
        renameSettings = {
            firstbox: $('#firstbox').prop('checked'),
            start: $('#start').val(),
            end: $('#end').val(),
            secondbox: $('#secondbox').prop('checked'),
            textname: $('#textname').val(),
        };
        localStorage.setItem('renameSettings', JSON.stringify(renameSettings));
        UI.SuccessMessage('Configurações salvas com sucesso!');
    });

    // Evento seleção grupo - carrega aldeias
    select.addEventListener("change", async function () {
        const groupId = this.value;
        if (!groupId) return;

        localStorage.setItem(STORAGE_KEY, groupId);

        const firstOption = this.querySelector("option[disabled]");
        if (firstOption) firstOption.hidden = true;

        $("#groupVillages").html("<i>Carregando aldeias...</i>");
        $("#villageCount").text("");

        const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", {
            group_id: groupId
        });

        const doc = new DOMParser().parseFromString(response.html, "text/html");
        const rows = doc.querySelectorAll("#group_table tbody tr");

        if (!rows.length) {
            $("#groupVillages").html("<p><i>Nenhuma aldeia no grupo.</i></p>");
            $("#villageCount").text("0 aldeias");
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

                output += `<tr data-village-id="${id}">
                    <td>${link}</td>
                    <td><span class="coord-val">${coords}</span></td>
                    <td><button class="btn copy-coord" data-coord="${coords}">📋</button></td>
                </tr>`;
                total++;
            }
        });
        output += `</tbody></table>`;

        $("#groupVillages").html(output);
        $("#villageCount").text(`${total}`);

        // Botão copiar coordenada
        $(".copy-coord").on("click", function () {
            const coord = $(this).data("coord");
            navigator.clipboard.writeText(coord);
            UI.SuccessMessage(`Coordenada ${coord} copiada!`);
        });
    });

    // Função para renomear aldeias sequencialmente com delay
    $('#rename').on('click', async function (e) {
        e.preventDefault();

        const firstbox = $('#firstbox').prop('checked');
        const startNum = Number($('#start').val());
        const padLength = Number($('#end').val());
        const secondbox = $('#secondbox').prop('checked');
        const fixedText = $('#textname').val();

        const rows = $("#groupVillages table tbody tr");
        if (!rows.length) {
            UI.ErrorMessage("Nenhuma aldeia para renomear!");
            return;
        }

        if (!firstbox && !secondbox) {
            UI.ErrorMessage("Marque pelo menos uma opção: numerar ou texto fixo!");
            return;
        }

        $('#renameStatus').text("Renomeando aldeias...");

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const villageId = row.getAttribute('data-village-id');
            if (!villageId) continue;

            // Construir novo nome
            let newName = "";
            if (firstbox) {
                const numPart = String(startNum + i).padStart(padLength, '0');
                newName += numPart;
            }
            if (secondbox) {
                if (newName.length > 0) newName += " ";
                newName += fixedText;
            }

            try {
                // Enviar requisição para renomear aldeia
                await $.post(`/game.php?village=${villageId}&screen=overview&ajax=rename_village`, {
                    new_name: newName
                });

                UI.SuccessMessage(`Aldeia ${newName} renomeada (${i + 1}/${rows.length})`);
            } catch (error) {
                UI.ErrorMessage(`Falha ao renomear aldeia ${newName} (${i + 1})`);
            }

            // Pequena pausa para evitar flood e problemas no servidor
            await sleep(300);
        }

        $('#renameStatus').text("Renomeação concluída!");
    });

    // Se já houver grupo salvo, carrega
    if (savedGroupId) {
        select.dispatchEvent(new Event("change"));
    }
})();

(async function () {
    if (!window.$) return alert("jQuery não carregado!");

    const STORAGE_KEY_COUNT = "rename_group_count";
    const coordToId = {};

    const groups = await fetchVillageGroups();
    const $sidebar = $(".content-border:first");
    const $content = $(".maincell");
    $sidebar.html(`<h3>Grupos</h3>`);
    $content.html(`
        <h3>Aldeias do Grupo</h3>
        <div style="margin-bottom: 8px;">
            Nome base: <input id="baseName" type="text" />
            <label><input type="checkbox" id="useNumbering" checked /> Usar numeração</label>
            <label>Iniciar em: <input id="startNumber" type="number" value="${localStorage.getItem(STORAGE_KEY_COUNT) || 1}" min="1" style="width: 60px;" /></label>
            <label>Zeros à esquerda: <input id="padLength" type="number" value="2" min="1" style="width: 40px;" /></label>
        </div>
        <button id="previewRenameBtn">Pré-visualizar renomeação</button>
        <button id="renameGroupBtn">Renomear todas</button>
        <div id="renameStatus" style="margin-top: 10px; color: green;"></div>
        <div id="groupVillages" style="margin-top: 15px;"></div>
    `);

    for (const group of groups) {
        const $link = $(`<div><a href="#">${group.name}</a></div>`);
        $link.on("click", async (e) => {
            e.preventDefault();
            const villages = await fetchAllPlayerVillagesByGroup(group.id);
            const $list = $("<table class='vis'><thead><tr><th>#</th><th>Nome atual</th><th>Coordenada</th><th>Próximo nome</th></tr></thead><tbody></tbody></table>");
            villages.forEach((v, i) => {
                const row = $(`
                    <tr>
                        <td>${i + 1}</td>
                        <td class="current-name">${v.name}</td>
                        <td class="coord-val">${v.coord}</td>
                        <td class="next-name"></td>
                    </tr>
                `);
                $list.find("tbody").append(row);
                coordToId[v.coord] = v.id;
            });
            $("#groupVillages").html($list);
            updatePreview();
        });
        $sidebar.append($link);
    }

    $("#useNumbering, #startNumber, #baseName, #padLength").on("input", updatePreview);
    $("#previewRenameBtn").on("click", updatePreview);
    $("#renameGroupBtn").on("click", renameGroupVillages);

    function updatePreview() {
        const useNumbering = $("#useNumbering").prop("checked");
        let startNumber = Number($("#startNumber").val());
        const padLength = Number($("#padLength").val());
        const baseName = $("#baseName").val().trim();

        if (!startNumber || startNumber < 1) startNumber = 1;

        const rows = $("#groupVillages table tbody tr");
        rows.each((i, row) => {
            const numberPart = useNumbering ? String(startNumber + i).padStart(padLength, "0") : "";
            const newName = `${numberPart} ${baseName}`.trim();
            $(row).find(".next-name").text(newName);
        });
    }

    async function renameGroupVillages() {
        const useNumbering = $("#useNumbering").prop("checked");
        let startNumber = Number($("#startNumber").val());
        const padLength = Number($("#padLength").val());
        const baseName = $("#baseName").val().trim();
        const $renameStatus = $("#renameStatus");

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
                $renameStatus.text(`ID não encontrado para aldeia na linha ${i + 1}`);
                continue;
            }

            const renameIcon = $(`.rename-icon[data-village-id="${villageId}"]`);
            if (renameIcon.length === 0) {
                $renameStatus.text(`Botão renomear não encontrado para aldeia ID ${villageId}`);
                continue;
            }

            renameIcon.click();

            await new Promise(r => setTimeout(r, 500));

            const $input = $(".rename_village input[type=text]");
            if ($input.length === 0) {
                $renameStatus.text(`Input de nome não encontrado para aldeia ID ${villageId}`);
                continue;
            }

            const numberPart = useNumbering ? String(startNumber + i).padStart(padLength, "0") : "";
            const newName = `${numberPart} ${baseName}`.trim();

            $input.val(newName).trigger("input");

            const $saveBtn = $(".rename_village input[type=button], .rename_village button:contains('OK'), .rename_village button:contains('Salvar')");
            if ($saveBtn.length === 0) {
                $renameStatus.text(`Botão salvar não encontrado para aldeia ID ${villageId}`);
                continue;
            }

            $saveBtn.first().click();

            $renameStatus.text(`Renomeando aldeia ${i + 1} de ${rows.length}: ${newName}`);
            localStorage.setItem(STORAGE_KEY_COUNT, startNumber + i);

            await new Promise(r => setTimeout(r, 700));
        }

        $renameStatus.text("Renomeação finalizada!");
        UI.SuccessMessage("Todas as aldeias do grupo foram renomeadas.");
        $("#renameGroupBtn").prop("disabled", false);
        $("#startNumber").val(startNumber + rows.length);
    }

    async function fetchVillageGroups() {
        const res = await fetch("/game.php?village=0&screen=overview_villages&mode=groups");
        const text = await res.text();
        const html = $(text);
        const options = html.find("#group_id option");
        return options.map((_, opt) => ({ id: opt.value, name: opt.innerText })).get();
    }

    async function fetchAllPlayerVillagesByGroup(groupId) {
        const res = await fetch(`/game.php?screen=overview_villages&mode=prod&group=${groupId}&page=-1`);
        const text = await res.text();
        const html = $(text);
        const rows = html.find("table.vis.overview_table tr[id^=village_]");
        return rows.map((_, row) => {
            const $row = $(row);
            const name = $row.find("span.quickedit-label").text().trim();
            const coord = name.match(/\d+\|\d+/)?.[0] || "";
            const id = Number($row.attr("id").replace("village_", ""));
            return { id, name, coord };
        }).get();
    }
})();

javascript:
(async function () {
    if (!window.location.href.includes("overview_villages&mode=combined")) {
        UI.InfoMessage("Vá para a visão 'Todas as aldeias' (Visão combinada).");
        return;
    }

    const STORAGE = {
        coordToId: {},
        groups: [],
    };

    const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
    groupData.result.forEach(g => STORAGE.groups.push({ id: g.group_id, name: g.name }));

    const mapTxt = await $.get("/map/village.txt");
    mapTxt.trim().split("\n").forEach(line => {
        const [id, name, x, y] = line.split(",");
        STORAGE.coordToId[`${x}|${y}`] = id;
    });

    const $html = `
    <h3>Renomear Aldeias por Grupo</h3>
    <div style="margin-bottom: 8px;">
        <label><b>Grupo:</b></label>
        <select id="groupSelect" style="min-width: 200px; margin-left: 8px;">
            <option disabled selected>Carregando...</option>
        </select>
    </div>
    <div style="margin-bottom: 8px;">
        <label><b>Texto base:</b></label>
        <input id="textname" type="text" maxlength="32" placeholder="Ex: |A|" style="width: 150px; margin-left: 8px;">
    </div>
    <div style="margin-bottom: 8px;">
        <label><b>Início:</b></label>
        <input id="start" type="number" value="1" style="width: 60px; margin-left: 8px;">
        <label style="margin-left: 8px;"><b>Dígitos:</b></label>
        <input id="digits" type="number" value="2" style="width: 60px; margin-left: 4px;">
    </div>
    <div>
        <button class="btn" id="runRename">Renomear</button>
    </div>
    `;

    Dialog.show("renamer_group", $html);

    // Popular select
    const $select = $("#groupSelect");
    $select.empty().append(`<option disabled selected>Selecione um grupo</option>`);
    STORAGE.groups.forEach(g => {
        $select.append(`<option value="${g.id}">${g.name}</option>`);
    });

    $("#runRename").on("click", async function () {
        const groupId = $select.val();
        const prefix = $("#textname").val().trim();
        const start = parseInt($("#start").val());
        const digits = parseInt($("#digits").val());

        if (!groupId || !prefix || isNaN(start) || isNaN(digits)) {
            UI.ErrorMessage("Preencha todos os campos corretamente.");
            return;
        }

        UI.InfoMessage("Carregando aldeias do grupo...");

        const resp = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", { group_id: groupId });
        const doc = new DOMParser().parseFromString(resp.html, "text/html");
        const rows = doc.querySelectorAll("#group_table tbody tr");

        const groupCoords = Array.from(rows).map(row =>
            row.querySelectorAll("td")[1].textContent.trim()
        );

        const renameIcons = $(".rename-icon");
        let renamed = 0;

        renameIcons.each(function (index) {
            const $row = $(this).closest("tr");
            const coord = $row.find("span[title*='|']").text().trim();

            if (groupCoords.includes(coord)) {
                setTimeout(() => {
                    $(this).click();
                    const input = $(".vis input[type='text']");
                    const num = String(start + renamed).padStart(digits, "0");
                    input.val(`${num} ${prefix}`);
                    $("input[type='button']:contains('OK'), input[type='submit']").click();
                    UI.SuccessMessage(`Renomeado ${renamed + 1}/${groupCoords.length}`);
                }, 250 * renamed);
                renamed++;
            }
        });

        if (renamed === 0) {
            UI.ErrorMessage("Nenhuma aldeia do grupo encontrada na lista atual.");
        } else {
            Dialog.close();
        }
    });
})();

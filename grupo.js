javascript:
(async function () {
    let groups = [];

    // Obter grupos manuais
    const groupData = await $.get("/game.php?&screen=groups&mode=overview&ajax=load_group_menu&");
    groupData.result.forEach(group => {
        if (group.group_id != 0 && group.type != "group_dynamic" && group.type != "separator") {
            groups.push({ group_id: group.group_id, group_name: group.name });
        }
    });

    // Cria a interface com select
    let html = `
        <div class="vis">
            <h2>Grupos de Aldeias</h2>
            <label for="groupSelect">Selecione um grupo:</label>
            <select id="groupSelect" class="btn" style="margin-bottom:10px;">
                <option disabled selected>Carregando...</option>
            </select>
            <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
        </div>
    `;
    Dialog.show("tw_group_viewer", html);

    const select = document.getElementById("groupSelect");
    select.innerHTML = "";
    groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.group_id;
        opt.textContent = g.group_name;
        select.appendChild(opt);
    });

    // Evento ao trocar grupo
    select.addEventListener("change", async function () {
        const groupId = this.value;
        $("#groupVillages").html("<i>Carregando aldeias...</i>");

        const response = await $.post("/game.php?screen=overview_villages&mode=groups&ajax=load_villages_from_group", {
            group_id: groupId
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, "text/html");
        const rows = doc.querySelectorAll("#group_table tbody tr:not(:first-child)");

        if (!rows.length) {
            $("#groupVillages").html("<p><i>Nenhuma aldeia no grupo.</i></p>");
            return;
        }

        let output = `<table class="vis" style="width:100%;">
            <thead><tr><th>Nome</th><th>Coordenadas</th></tr></thead><tbody>`;
        rows.forEach(row => {
            const name = row.querySelector("td:nth-child(1)")?.textContent.trim();
            const coords = row.querySelector("td:nth-child(2)")?.textContent.trim();
            output += `<tr><td>${name}</td><td>${coords}</td></tr>`;
        });
        output += "</tbody></table>";

        $("#groupVillages").html(output);
    });

})();

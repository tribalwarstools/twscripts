javascript:
(async function () {
    const groups = [];
    const coordToId = {};
    const STORAGE_KEY = "tw_last_selected_group";
    const COUNTER_KEY = "tw_rename_counter";

    const parseCoords = (coord) => {
        const [x, y] = coord.split("|");
        return { x, y };
    };

    // Mapeia coordenadas para IDs
    const mapData = await $.get("map/village.txt");
    mapData.trim().split("\n").forEach(line => {
        const [id, name, x, y] = line.split(",");
        coordToId[`${x}|${y}`] = id;
    });

    // Carrega grupos
    const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
    groupData.result.forEach(group => {
        groups.push({ group_id: group.group_id, group_name: group.name });
    });

    // Interface
    const html = `
        <div class="vis" style="padding: 10px; width: 700px;">
            <h2>Grupos de Aldeias</h2>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <label for="groupSelect"><b>Selecione um grupo:</b></label>
                <select id="groupSelect" style="
                    padding: 4px;
                    background: #f4e4bc;
                    color: #000;
                    border: 1px solid #603000;
                    font-weight: bold;
                "></select>
                <button id="renameVillagesBtn" class="btn" style="padding: 4px; font-weight: bold;">Renomear aldeias</button>
                <button id="resetCounter" class="btn" style="padding: 4px;">Resetar contagem</button>
                <span id="villageCount" style="font-weight: bold;"></span>
            </div>
            <hr>
            <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
        </div>
    `;
    Dialog.show("tw_group_viewer", html);

    const select = document.getElementById("groupSelect");
    const savedGroupId = localStorage.getItem(STORAGE_KEY);

    // Placeholder
    const placeholder = document.createElement("option");
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.hidden = false;
    placeholder.textContent = "Selecione um grupo";
    select.appendChild(placeholder);

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
            $("#villageCount").text("0");
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

        $("#groupVillages").html(output);
        $("#villageCount").text(`${total}`);

        $(".copy-coord").on("click", function () {
            const coord = $(this).data("coord");
            navigator.clipboard.writeText(coord);
            UI.SuccessMessage(`Coordenada ${coord} copiada!`);
        });
    });

    // Botão Resetar contagem
    document.getElementById("resetCounter").addEventListener("click", () => {
        localStorage.setItem(COUNTER_KEY, "1");
        UI.SuccessMessage("Contador resetado para 1.");
    });

    // Botão Renomear aldeias
    document.getElementById("renameVillagesBtn").addEventListener("click", async function () {
        const groupId = select.value;
        if (!groupId) return;

        const group = groups.find(g => g.group_id == groupId);
        if (!group) return;

        const defaultTag = (group.group_name || "GRP").trim().toUpperCase().slice(0, 3).replace(/\s/g, '') || "GRP";

        const tagInput = prompt("Informe a TAG para usar na renomeação:", defaultTag);
        if (!tagInput) return;

        const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", {
            group_id: groupId
        });

        const doc = new DOMParser().parseFromString(response.html, "text/html");
        const rows = doc.querySelectorAll("#group_table tbody tr");

        if (!rows.length) {
            UI.ErrorMessage("Nenhuma aldeia no grupo para renomear.");
            return;
        }

        let counter = parseInt(localStorage.getItem(COUNTER_KEY) || "1");
        const renameList = [];

        rows.forEach(row => {
            const tds = row.querySelectorAll("td");
            if (tds.length >= 2) {
                const villageId = tds[0].querySelector("a")?.href.match(/village=(\d+)/)?.[1];
                if (!villageId) return;
                const newName = `${String(counter).padStart(2, "0")} |${tagInput}|`;
                renameList.push({ id: villageId, name: newName });
                counter++;
            }
        });

        // Prévia
        const preview = renameList.map(r => `<tr><td>${r.name}</td></tr>`).join("");
        const confirmHtml = `
            <div class="vis" style="padding: 10px;">
                <h3>Confirmar renomeação?</h3>
                <p>Total: ${renameList.length} aldeias</p>
                <table class="vis">${preview}</table>
                <br>
                <button id="confirmRename" class="btn">Confirmar</button>
                <button id="cancelRename" class="btn">Cancelar</button>
            </div>
        `;
        Dialog.show("confirm_rename", confirmHtml);

        document.getElementById("cancelRename").addEventListener("click", () => Dialog.close());

        document.getElementById("confirmRename").addEventListener("click", async () => {
            Dialog.close();
            for (const r of renameList) {
                await $.post(`/game.php?village=${game_data.village.id}&screen=overview&ajax=rename_village`, {
                    id: r.id,
                    name: r.name
                });
                await new Promise(res => setTimeout(res, 300)); // Delay de 300ms
            }
            localStorage.setItem(COUNTER_KEY, counter);
            UI.SuccessMessage("Aldeias renomeadas com sucesso!");
            select.dispatchEvent(new Event("change"));
        });
    });

    if (savedGroupId) {
        select.dispatchEvent(new Event("change"));
    }
})();
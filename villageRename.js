javascript:
(async function () {
    const COUNTER_KEY = "tw_rename_counter";
    const PENDING_KEY = "tw_pending_rename_group";

    // Espera o DOM carregar se estiver na tela de renomeação
    if (window.location.href.includes("screen=overview_villages") && localStorage.getItem(PENDING_KEY)) {
        document.addEventListener("DOMContentLoaded", () => runRenameScript());
        if (document.readyState === "complete" || document.readyState === "interactive") {
            runRenameScript();
        }
        return;
    }

    async function runRenameScript() {
        const { groupId, nameBase, start } = JSON.parse(localStorage.getItem(PENDING_KEY));
        let counter = parseInt(start);
        let i = 0;
        const total = document.querySelectorAll(".rename-icon").length;

        Dialog.close();

        async function processRename(icon) {
            icon.click();

            await new Promise(resolve => {
                const check = setInterval(() => {
                    const input = document.querySelector('.vis input[type="text"]');
                    if (input) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });

            const input = document.querySelector('.vis input[type="text"]');
            if (input) {
                input.value = `${String(counter).padStart(2, "0")} ${nameBase}`;
                counter++;
                i++;

                // Envia ENTER para simular confirmação (alguns servidores exigem isso)
                input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

                const okBtn = Array.from(document.querySelectorAll('input[type="button"]'))
                    .find(btn => btn.value.toLowerCase().includes("ok") || btn.value.toLowerCase().includes("salvar"));
                if (okBtn) okBtn.click();

                UI.SuccessMessage(`Renomeado ${i}/${total}`);
            }

            await new Promise(resolve => {
                const check = setInterval(() => {
                    const open = document.querySelector('.vis input[type="text"]');
                    if (!open) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });

            icon.remove();
        }

        async function run() {
            const icons = Array.from(document.querySelectorAll(".rename-icon"));
            for (let icon of icons) {
                await processRename(icon);
            }

            localStorage.setItem(COUNTER_KEY, counter);
            localStorage.removeItem(PENDING_KEY);
            UI.SuccessMessage("Renomeação concluída.");
        }

        run();
    }

    // PAINEL PRINCIPAL
    const groups = [];
    const coordToId = {};
    const mapData = await $.get("map/village.txt");
    mapData.trim().split("\n").forEach(line => {
        const [id, name, x, y] = line.split(",");
        coordToId[`${x}|${y}`] = id;
    });

    const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
    groupData.result.forEach(group => {
        groups.push({ group_id: group.group_id, group_name: group.name });
    });

    const html = `
        <div class="vis" style="padding: 10px; width: 700px;">
            <h2>Grupos de Aldeias</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                <label for="groupSelect"><b>Grupo:</b></label>
                <select id="groupSelect" style="padding: 4px; background: #f4e4bc; color: #000; border: 1px solid #603000; font-weight: bold;"></select>
                <label for="renameName"><b>Nome base:</b></label>
                <input type="text" id="renameName" placeholder="Ex: |A|" style="padding: 3px; width: 80px;">
                <label for="renameStart"><b>Início:</b></label>
                <input type="number" id="renameStart" min="1" value="1" style="padding: 3px; width: 60px;">
                <button id="confirmRename" class="btn">Confirmar renomeação</button>
                <button id="resetCounter" class="btn">Resetar contador</button>
                <span id="villageCount" style="font-weight: bold;"></span>
            </div>
            <hr>
            <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
        </div>
    `;
    Dialog.show("tw_group_viewer", html);

    const select = document.getElementById("groupSelect");
    const savedGroupId = localStorage.getItem("tw_last_selected_group");

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
        localStorage.setItem("tw_last_selected_group", groupId);

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

    document.getElementById("resetCounter").addEventListener("click", () => {
        localStorage.setItem(COUNTER_KEY, "1");
        UI.SuccessMessage("Contador resetado para 1.");
    });

    document.getElementById("confirmRename").addEventListener("click", () => {
        const groupId = select.value;
        const nameBase = document.getElementById("renameName").value.trim();
        const start = parseInt(document.getElementById("renameStart").value);

        if (!groupId || !nameBase || isNaN(start)) {
            UI.ErrorMessage("Preencha todos os campos.");
            return;
        }

        localStorage.setItem(PENDING_KEY, JSON.stringify({ groupId, nameBase, start }));
        const url = `/game.php?screen=overview_villages&mode=combined&group=${groupId}`;
        window.location.href = url;
    });

    if (savedGroupId) {
        select.dispatchEvent(new Event("change"));
    }
})();

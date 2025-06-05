(async function () {
  const groups = [];
  const coordToId = {};
  const STORAGE_KEY = "tw_last_selected_group";

  // Mapeia coordenadas para ID de aldeia
  const mapData = await $.get("map/village.txt");
  mapData.trim().split("\n").forEach(line => {
    const [id, name, x, y] = line.split(",");
    coordToId[`${x}|${y}`] = id;
  });

  // Mapeia coordenadas para pontos da aldeia a partir do modo combinado
  const pontosPorCoord = {};
  const overviewDoc = await $.get("/game.php?screen=overview_villages&mode=combined");
  const parsedOverview = new DOMParser().parseFromString(overviewDoc, "text/html");

  parsedOverview.querySelectorAll("#combined_table tbody tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length) {
      const nome = tds[1]?.textContent.trim();
      const coordMatch = nome.match(/\((\d+\|\d+)\)/);
      const pontos = parseInt(tds[3]?.textContent.replace(/\./g, "") || "0", 10);
      if (coordMatch) {
        pontosPorCoord[coordMatch[1]] = pontos;
      }
    }
  });

  // Carrega grupos do jogador
  const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
  groupData.result.forEach(group => {
    groups.push({ group_id: group.group_id, group_name: group.name });
  });

  // Monta HTML do painel
  const html = `
    <div class="vis" style="padding: 10px;">
      <h2>Painel de Scripts</h2>
      <button id="abrirRenamer" class="btn" style="margin-bottom:10px;">Renomeador</button>
      <button id="abrirTotalTropas" class="btn" style="margin-bottom:10px;">Total de Tropas</button>
      <div style="display: flex; align-items: center; gap: 10px;">
        <label for="groupSelect"><b>Grupo:</b></label>
        <select id="groupSelect" style="
          padding: 4px;
          background: #f4e4bc;
          color: #000;
          border: 1px solid #603000;
          font-weight: bold;
        "></select>
        <span id="villageCount" style="font-weight: bold;"></span>
      </div>
      <hr>
      <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
  `;
  Dialog.show("tw_group_viewer", html);
  $("#popup_box_tw_group_viewer").css({ width: "750px", maxWidth: "95vw" });

  const select = document.getElementById("groupSelect");
  const savedGroupId = localStorage.getItem(STORAGE_KEY);

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

  $("#abrirRenamer").on("click", function () {
    $.getScript("https://tribalwarstools.github.io/twscripts/RenomearAld.js")
      .done(() => typeof abrirPainelRenomear === "function"
        ? abrirPainelRenomear()
        : UI.ErrorMessage("Função abrirPainelRenomear não encontrada.")
      )
      .fail(() => UI.ErrorMessage("Erro ao carregar o script de renomeação."));
  });

  $("#abrirTotalTropas").on("click", function () {
    $.getScript("https://tribalwarstools.github.io/twscripts/TotalTropas.js")
      .done(() => setTimeout(() => {
        typeof abrirJanelaContador === "function"
          ? abrirJanelaContador()
          : UI.ErrorMessage("Função abrirJanelaContador não encontrada.");
      }, 100))
      .fail(() => UI.ErrorMessage("Erro ao carregar o script Total de Tropas."));
  });

  select.addEventListener("change", async function () {
    const groupId = this.value;
    if (!groupId) return;

    localStorage.setItem(STORAGE_KEY, groupId);
    const firstOption = this.querySelector("option[disabled]");
    if (firstOption) firstOption.hidden = true;

    $("#groupVillages").html("<i>Carregando aldeias...</i>");
    $("#villageCount").text("");

    const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", { group_id: groupId });
    const doc = new DOMParser().parseFromString(response.html, "text/html");
    const rows = doc.querySelectorAll("#group_table tbody tr");

    if (!rows.length) {
      $("#groupVillages").html("<p><i>Nenhuma aldeia no grupo.</i></p>");
      $("#villageCount").text("0 aldeias");
      return;
    }

    let output = `<table class="vis" width="100%">
      <thead><tr>
        <th>Nome</th><th style="width:90px;">Coordenadas</th><th style="width:80px;">Pontos</th><th>Ações</th>
      </tr></thead><tbody>`;
    let total = 0;

    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const name = tds[0].textContent.trim();
        const coords = tds[1].textContent.trim();
        const id = coordToId[coords];
        const pontos = pontosPorCoord[coords] || 0;
        const link = id
          ? `<a href="/game.php?village=${id}&screen=overview" target="_blank">${name}</a>`
          : name;

        output += `<tr>
          <td>${link}</td>
          <td><span class="coord-val">${coords}</span></td>
          <td style="text-align:right;">${pontos.toLocaleString()}</td>
          <td><button class="btn copy-coord" data-coord="${coords}">📋</button></td>
        </tr>`;
        total++;
      }
    });
    output += `</tbody></table>`;

    $("#groupVillages").html(`
      <button id="copyAllCoords" class="btn" style="margin-bottom: 5px;">📋 Copiar todas as coordenadas</button>
      ${output}
    `);
    $("#villageCount").text(`${total}`);

    $(".copy-coord").on("click", function () {
      const coord = $(this).data("coord");
      navigator.clipboard.writeText(coord);
      UI.SuccessMessage(`Coordenada ${coord} copiada!`);
    });

    $("#copyAllCoords").on("click", function () {
      const coords = [...document.querySelectorAll(".coord-val")]
        .map(el => el.textContent.trim()).join(" ");
      navigator.clipboard.writeText(coords);
      UI.SuccessMessage("Todas as coordenadas copiadas!");
    });
  });

  if (savedGroupId) {
    select.dispatchEvent(new Event("change"));
  }
})();

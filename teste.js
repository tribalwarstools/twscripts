(async function () {
  const groups = [];
  const coordToId = {};
  const villagePointsMap = {};
  const STORAGE_KEY = "tw_last_selected_group";

  // Mapeia coordenadas para ID
  const mapData = await $.get("map/village.txt");
  mapData.trim().split("\n").forEach(line => {
    const [id, , x, y] = line.split(",");
    coordToId[`${x}|${y}`] = id;
  });

  // Carrega grupos
  const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
  groupData.result.forEach(g => groups.push({ group_id: g.group_id, group_name: g.name }));

  // Cria função para atualizar pontuação
  async function loadPoints() {
    const html = await $.get("/game.php?screen=overview_villages&mode=prod&page=-1");
    const $page = $(html);

    const rows = $page.find("#production_table tr");
    rows.each((i, row) => {
      if (i === 0) return;
      const $row = $(row);
      const nameCell = $row.find("span.quickedit-vn");
      const pointsCell = $row.find("td").eq(1);

      const name = nameCell.text().trim();
      const coord = name.match(/\d{3}\|\d{3}/)?.[0];
      const pointsText = pointsCell.text().replace(/\./g, '').replace(',', '');
      const points = parseInt(pointsText, 10);

      if (coord && !isNaN(points)) {
        villagePointsMap[coord] = points;
      }
    });
  }

  // Carrega pontuação inicialmente
  await loadPoints();

  // Painel visual
  const htmlPanel = `
    <div class="vis" style="padding: 10px;">
      <h2>Painel de Scripts (corrigir pont.)</h2>
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <label for="groupSelect"><b>Visualizador de grupo:</b></label>
        <select id="groupSelect" style="padding:4px; background:#f4e4bc; color:#000; border:1px solid #603000; font-weight:bold;"></select>
        <span id="villageCount" style="font-weight: bold;"></span>
        <button id="refreshPoints" class="btn" style="margin-left:auto;">🔄 Atualizar Pontuação</button>
      </div>
      <hr>
      <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
  `;
  Dialog.show("tw_group_viewer", htmlPanel);
  $("#popup_box_tw_group_viewer").css({ width: "750px", maxWidth: "95vw" });

  const select = document.getElementById("groupSelect");
  const placeholder = new Option("Selecione um grupo", "", true, true);
  placeholder.disabled = true;
  select.appendChild(placeholder);

  groups.forEach(g => {
    const opt = new Option(g.group_name, g.group_id, false, g.group_id === "0");
    if (!g.group_name) opt.disabled = true;
    select.appendChild(opt);
  });

  async function renderGroup(groupId) {
    if (!groupId) return;
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

    const villages = [];
    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const name = tds[0].textContent.trim();
        const coords = tds[1].textContent.trim();
        const id = coordToId[coords];
        const points = villagePointsMap[coords] || 0;
        if (id) villages.push({ id, name, coords, points });
      }
    });

    let output = `<button id="copyAllCoords" class="btn" style="margin-bottom:5px;">📋 Copiar todas as coordenadas</button>`;
    output += `<table class="vis" width="100%">
      <thead><tr><th>Nome</th><th style="width:90px;">Coord</th><th style="width:90px;">Pontos</th><th>Ações</th></tr></thead><tbody>`;

    villages.forEach(village => {
      const link = `<a href="/game.php?village=${village.id}&screen=overview" target="_blank">${village.name}</a>`;
      output += `<tr>
        <td>${link}</td>
        <td><span class="coord-val">${village.coords}</span></td>
        <td>${village.points.toLocaleString()}</td>
        <td><button class="btn copy-coord" data-coord="${village.coords}">📋</button></td>
      </tr>`;
    });

    output += "</tbody></table>";
    $("#groupVillages").html(output);
    $("#villageCount").text(`${villages.length} aldeias`);

    $(".copy-coord").on("click", function () {
      const coord = $(this).data("coord");
      navigator.clipboard.writeText(coord);
      UI.SuccessMessage(`Coordenada ${coord} copiada!`);
    });

    $("#copyAllCoords").on("click", function () {
      const coords = [...document.querySelectorAll(".coord-val")].map(el => el.textContent.trim()).join(" ");
      navigator.clipboard.writeText(coords);
      UI.SuccessMessage("Todas as coordenadas copiadas!");
    });
  }

  select.addEventListener("change", async function () {
    const groupId = this.value;
    localStorage.setItem(STORAGE_KEY, groupId);
    await renderGroup(groupId);
  });

  // Botão de atualizar pontuação
  document.getElementById("refreshPoints").addEventListener("click", async () => {
    UI.InfoMessage("Recarregando pontuação...");
    await loadPoints();
    await renderGroup(select.value);
    UI.SuccessMessage("Pontuação atualizada!");
  });

  // Carrega grupo 0 como padrão
  select.value = "0";
  select.dispatchEvent(new Event("change"));
})();

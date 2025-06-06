(async function () {
  const groups = [];
  const coordToId = {};
  let villagePointsMap = {}; // mapa de coord → pontos
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

  // --- FUNÇÃO QUE BUSCA TODAS AS PONTUAÇÕES DE ALDEIAS ---
  async function fetchAllVillagePoints() {
    villagePointsMap = {};

    async function parseVillagesFromHTML(html) {
      let doc = new DOMParser().parseFromString(html, "text/html");
      let rows = doc.querySelectorAll("#production_table tbody tr");
      let villages = [];

      rows.forEach(row => {
        let villageName = row.querySelector("span.quickedit-vn")?.innerText.trim();
        let coordMatch = villageName?.match(/\d{3}\|\d{3}/);
        let coord = coordMatch ? coordMatch[0] : null;
        let pointsText = row.querySelector("td:nth-child(3)")?.innerText.trim();
        let points = pointsText ? parseInt(pointsText.replace(/\./g, '').replace(',', ''), 10) : 0;

        if (coord && villageName && !isNaN(points)) {
          villages.push({ coord, points });
        }
      });

      return villages;
    }

    function getTotalPages(html) {
      let doc = new DOMParser().parseFromString(html, "text/html");
      let pager = doc.querySelector(".pager");
      if (!pager) return 1;
      let pages = Array.from(pager.querySelectorAll("a"))
        .map(a => parseInt(a.textContent))
        .filter(n => !isNaN(n));
      return pages.length > 0 ? Math.max(...pages) : 1;
    }

    const firstPageHtml = await $.get("/game.php?screen=overview_villages&mode=prod&page=1");
    const totalPages = getTotalPages(firstPageHtml);

    let villages = await parseVillagesFromHTML(firstPageHtml);

    for (let page = 2; page <= totalPages; page++) {
      const html = await $.get(`/game.php?screen=overview_villages&mode=prod&page=${page}`);
      villages = villages.concat(await parseVillagesFromHTML(html));
    }

    villages.forEach(v => {
      villagePointsMap[v.coord] = v.points;
    });
  }

  // Chama a função para popular o mapa de pontos antes de montar o painel
  await fetchAllVillagePoints();

  // Painel visual
  const htmlPanel = `
    <div class="vis" style="padding: 10px;">
      <h2>Painel de Scripts 7.0</h2>
      <div style="display: flex; align-items: center; gap: 10px;">
        <label for="groupSelect"><b>Visualizador de grupo:</b></label>
        <select id="groupSelect" style="padding:4px; background:#f4e4bc; color:#000; border:1px solid #603000; font-weight:bold;"></select>
        <span id="villageCount" style="font-weight: bold;"></span>
      </div>
      <hr>
      <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
  `;
  Dialog.show("tw_group_viewer", htmlPanel);
  $("#popup_box_tw_group_viewer").css({ width: "750px", maxWidth: "95vw" });

  const select = document.getElementById("groupSelect");

  // Força iniciar no grupo 0 (Todos)
  const savedGroupId = "0";

  const placeholder = new Option("Selecione um grupo", "", true, false);
  placeholder.disabled = true;
  select.appendChild(placeholder);

  groups.forEach(g => {
    const isSelected = g.group_id == savedGroupId;
    const opt = new Option(g.group_name, g.group_id, false, isSelected);
    if (!g.group_name) opt.disabled = true;
    select.appendChild(opt);
  });

  select.value = savedGroupId;

  select.addEventListener("change", async function () {
    const groupId = this.value;
    if (!groupId) return;
    localStorage.setItem(STORAGE_KEY, groupId);
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

    let output = `<table class="vis" width="100%">
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
    $("#groupVillages").html(`<button id="copyAllCoords" class="btn" style="margin-bottom:5px;">📋 Copiar todas as coordenadas</button>${output}`);
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
  });

  // Dispara o evento para carregar as aldeias do grupo 0 no início
  select.dispatchEvent(new Event("change"));
})();

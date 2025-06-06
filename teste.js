(async function () {
  // Redireciona para a tela combinada, se necessário
  if (!location.href.includes("screen=overview_villages&mode=combined&group=0")) {
    location.href = `/game.php?village=${game_data.village.id}&screen=overview_villages&mode=combined&group=0`;
    return;
  }

  const groups = [];
  const coordToId = {};
  const coordToPoints = {};
  const STORAGE_KEY = "tw_last_selected_group";

  // Mapeia coordenadas para ID
  const mapData = await $.get("map/village.txt");
  mapData.trim().split("\n").forEach(line => {
    const [id, , x, y] = line.split(",");
    coordToId[`${x}|${y}`] = id;
  });

  // Mapeia coordenadas para pontos (na terceira coluna da tabela prod)
  const prodHtml = await $.get("/game.php?screen=overview_villages&mode=prod");
  const prodDoc = new DOMParser().parseFromString(prodHtml, "text/html");
  const rows = prodDoc.querySelectorAll("table#production_table tbody tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    const coordMatch = row.innerText.match(/\d+\|\d+/);
    if (coordMatch && cells.length > 2) {
      const coord = coordMatch[0];
      const pontosTd = cells[2];
      const rawText = pontosTd.textContent.replace(/\./g, "").replace(/,/g, "").trim();
      const points = parseInt(rawText, 10);
      if (!isNaN(points)) {
        coordToPoints[coord] = points;
      }
    }
  });

  // Carrega grupos
  const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
  groupData.result.forEach(g => groups.push({ group_id: g.group_id, group_name: g.name }));

  // Monta painel
  const html = `
    <div class="vis" style="padding: 10px;">
      <h2>Painel de Scripts 2.2</h2>
      <button id="abrirRenamer" class="btn btn-confirm-yes" style="margin-bottom:10px;">Renomear aldeias</button>
      <button id="abrirTotalTropas" class="btn btn-confirm-yes" style="margin-bottom:10px;">Contador de tropas</button>
      <button id="abrirGrupo" class="btn btn-confirm-yes" style="margin-bottom:10px;">Importar grupos</button>
      <div style="display: flex; align-items: center; gap: 10px;">
        <label for="groupSelect"><b>Visualizador de grupo:</b></label>
        <select id="groupSelect" style="padding:4px; background:#f4e4bc; color:#000; border:1px solid #603000; font-weight:bold;"></select>
        <span id="villageCount" style="font-weight: bold;"></span>
      </div>
      <hr>
      <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>
    </div>
  `;
  Dialog.show("tw_group_viewer", html);
  $("#popup_box_tw_group_viewer").css({ width: "750px", maxWidth: "95vw" });

  const select = document.getElementById("groupSelect");
  const placeholder = new Option("Todas as aldeias", "0", true, true);
  placeholder.disabled = false;
  select.appendChild(placeholder);

  groups.forEach(g => {
    const opt = new Option(g.group_name, g.group_id);
    if (!g.group_name) opt.disabled = true;
    select.appendChild(opt);
  });

  $("#abrirRenamer").on("click", () => {
    $.getScript("https://tribalwarstools.github.io/twscripts/RenomearAld.js")
      .done(() => setTimeout(() => {
        if (typeof abrirPainelRenomear === "function") abrirPainelRenomear();
        else UI.ErrorMessage("Função abrirPainelRenomear não encontrada.");
      }, 100))
      .fail(() => UI.ErrorMessage("Erro ao carregar o script de renomeação."));
  });

  $("#abrirTotalTropas").on("click", () => {
    $.getScript("https://tribalwarstools.github.io/twscripts/TotalTropas.js")
      .done(() => setTimeout(() => {
        if (typeof abrirJanelaContador === "function") abrirJanelaContador();
        else UI.ErrorMessage("Função abrirJanelaContador não encontrada.");
      }, 100))
      .fail(() => UI.ErrorMessage("Erro ao carregar o script Total de Tropas."));
  });

  $("#abrirGrupo").on("click", () => {
    $.getScript("https://tribalwarstools.github.io/twscripts/addGrupo.js")
      .done(() => {
        setTimeout(() => {
          if (typeof abrirJanelaGrupo === "function") {
            abrirJanelaGrupo();
          } else {
            UI.ErrorMessage("Função abrirJanelaGrupo não encontrada.");
          }
        }, 100);
      })
      .fail(() => UI.ErrorMessage("Erro ao carregar o script abrirJanelaGrupo."));
  });

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

    function createProgressBar(value, max) {
      const percent = Math.min((value / max) * 100, 100);
      return `
        <div style="background:#ddd; width: 90px; height: 16px; border-radius: 6px; overflow: hidden; position: relative;">
          <div style="background:#4caf50; width: ${percent}%; height: 100%;"></div>
          <div style="position: absolute; width: 100%; text-align: center; top: 0; left: 0; font-size: 12px; font-weight: bold; color: #000;">
            ${value.toLocaleString()}
          </div>
        </div>
      `;
    }

    let output = `<table class="vis" width="100%">
      <thead><tr><th>Nome</th><th style="width:90px;">Coord</th><th style="width:120px;">Pontos</th><th>Ações</th></tr></thead><tbody>`;
    let total = 0;
    const MAX_POINTS = 12000;

    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const name = tds[0].textContent.trim();
        const coords = tds[1].textContent.trim();
        const id = coordToId[coords];
        const points = coordToPoints[coords] || 0;
        const link = id ? `<a href="/game.php?village=${id}&screen=overview" target="_blank">${name}</a>` : name;

        output += `<tr>
          <td>${link}</td>
          <td><span class="coord-val">${coords}</span></td>
          <td>${createProgressBar(points, MAX_POINTS)}</td>
          <td><button class="btn copy-coord" data-coord="${coords}">📋</button></td>
        </tr>`;
        total++;
      }
    });

    output += "</tbody></table>";
    $("#groupVillages").html(`<button id="copyAllCoords" class="btn" style="margin-bottom:5px;">📋 Copiar todas as coordenadas</button>${output}`);
    $("#villageCount").text(`${total} aldeias`);

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

  // Executa automaticamente para o grupo "Todos"
  select.dispatchEvent(new Event("change"));
})();

(async function () {
  const groups = [];
  const coordToId = {};
  const STORAGE_KEY = "tw_last_selected_group";

  // Mapeia coordenadas para ID a partir do arquivo map/village.txt
  const mapData = await $.get("map/village.txt");
  mapData.trim().split("\n").forEach(line => {
    const [id, , x, y] = line.split(",");
    coordToId[`${x}|${y}`] = id;
  });

  // Carrega grupos de aldeias
  const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
  groupData.result.forEach(g => groups.push({ group_id: g.group_id, group_name: g.name }));

  // Monta painel HTML
  const html = `
    <div class="vis" style="padding: 10px;">
      <h2>Painel de Scripts 1110</h2>
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
  const savedGroupId = localStorage.getItem(STORAGE_KEY);
  const placeholder = new Option("Selecione um grupo", "", true, true);
  placeholder.disabled = true;
  select.appendChild(placeholder);

  groups.forEach(g => {
    const opt = new Option(g.group_name, g.group_id, false, g.group_id == savedGroupId);
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

  // Limita número de requisições AJAX simultâneas
  async function parallelLimit(tasks, limit) {
    const results = [];
    const executing = [];

    for (const task of tasks) {
      const p = Promise.resolve().then(() => task());
      results.push(p);

      if (limit <= tasks.length) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }

    return Promise.all(results);
  }

  // Função que busca pontos da aldeia via AJAX (endpoint do TW)
  async function getVillagePointsAjax(villageId) {
    try {
      const response = await $.get(`/game.php?ajax=village_info&village_id=${villageId}`);
      if (response && response.data && response.data.village && typeof response.data.village.points === 'number') {
        return response.data.village.points;
      }
    } catch (e) {
      console.error("Erro ao buscar pontos da aldeia:", villageId, e);
    }
    return 0;
  }

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
        if (id) villages.push({ id, name, coords });
      }
    });

    // Busca pontuações limitando a 5 requisições paralelas para evitar sobrecarga
    const tasks = villages.map(village => () => getVillagePointsAjax(village.id));
    const pointsList = await parallelLimit(tasks, 5);

    let output = `<table class="vis" width="100%">
      <thead><tr><th>Nome</th><th style="width:90px;">Coord</th><th style="width:90px;">Pontos</th><th>Ações</th></tr></thead><tbody>`;

    villages.forEach((village, i) => {
      const points = pointsList[i] || 0;
      const link = `<a href="/game.php?village=${village.id}&screen=overview" target="_blank">${village.name}</a>`;
      output += `<tr>
        <td>${link}</td>
        <td><span class="coord-val">${village.coords}</span></td>
        <td>${points.toLocaleString()}</td>
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

  if (savedGroupId) {
    select.dispatchEvent(new Event("change"));
  }
})();

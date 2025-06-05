(async function () {
  const groups = [];
  const coordToId = {};
  const STORAGE_KEY = "tw_last_selected_group";
  const RENAMER_OPTIONS = "tw_renamer_options";

  // Função para carregar mapa e criar coord → village_id
  async function loadMap() {
    const mapData = await $.get("map/village.txt");
    const lines = mapData.trim().split("\n");
    lines.forEach(line => {
      const [id, name, x, y] = line.split(",");
      const coord = `${x}|${y}`;
      coordToId[coord] = id;
    });
  }

  // Função para carregar grupos do jogador
  async function loadGroups() {
    const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
    groupData.result.forEach(group => {
      groups.push({ group_id: group.group_id, group_name: group.name });
    });
  }

  // Monta HTML do painel completo com renomeador embutido
  function buildHtml() {
    return `
      <div class="vis" style="padding: 10px; width: 680px; max-width: 95vw;">
        <h2>Grupos de Aldeias</h2>
        <div style="display: flex; align-items: center; gap: 10px;">
          <label for="groupSelect"><b>Selecione um grupo:</b></label>
          <select id="groupSelect" style="
              padding: 4px;
              background: #f4e4bc;
              color: #000;
              border: 1px solid #603000;
              font-weight: bold;
              min-width: 250px;
            "></select>
          <span id="villageCount" style="font-weight: bold;"></span>
        </div>
        <hr>
        <div id="groupVillages" style="max-height: 300px; overflow-y: auto;"></div>

        <hr>
        <h3>Renomear Aldeias</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <label><input type="checkbox" id="firstbox"> Numerar a partir de</label>
          <input id="start" type="number" min="0" value="1" style="width: 60px;" disabled>
          <label>com padding de</label>
          <input id="end" type="number" min="1" value="3" style="width: 60px;" disabled>
        </div>
        <div style="margin-top: 8px;">
          <label><input type="checkbox" id="secondbox"> Texto fixo</label>
          <input id="textname" type="text" maxlength="32" placeholder="Seu texto aqui" style="width: 100%;" disabled>
        </div>
        <div style="padding-top: 10px; text-align: right;">
          <button id="rename" class="btn">Renomear Aldeias</button>
          <button id="save" class="btn">Salvar Opções</button>
        </div>
      </div>
    `;
  }

  // Função para salvar opções no localStorage
  function saveOptions() {
    const opts = {
      firstbox: $('#firstbox').prop('checked'),
      start: Number($('#start').val()),
      end: Number($('#end').val()),
      secondbox: $('#secondbox').prop('checked'),
      textname: $('#textname').val(),
    };
    localStorage.setItem(RENAMER_OPTIONS, JSON.stringify(opts));
    UI.SuccessMessage("Opções salvas com sucesso.");
  }

  // Função para carregar opções do localStorage
  function loadOptions() {
    const opts = JSON.parse(localStorage.getItem(RENAMER_OPTIONS) || "{}");
    if (opts.firstbox !== undefined) {
      $('#firstbox').prop('checked', opts.firstbox);
      $('#start').val(opts.start || 1);
      $('#end').val(opts.end || 3);
      $('#secondbox').prop('checked', opts.secondbox);
      $('#textname').val(opts.textname || "");
    }
    toggleInputs();
  }

  // Ativa/desativa inputs conforme checkboxes
  function toggleInputs() {
    $('#start, #end').prop('disabled', !$('#firstbox').prop('checked'));
    $('#textname').prop('disabled', !$('#secondbox').prop('checked'));
  }

  // Carrega aldeias do grupo selecionado
  async function loadVillages(groupId) {
    if (!groupId) return;
    $("#groupVillages").html("<i>Carregando aldeias...</i>");
    $("#villageCount").text("");

    const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", {
      group_id: groupId
    });

    const doc = new DOMParser().parseFromString(response.html, "text/html");
    const rows = doc.querySelectorAll("#group_table tbody tr");

    if (!rows.length) {
      $("#groupVillages").html("<p><i>Nenhuma aldeia no grupo.</i></p>");
      $("#villageCount").text("0 aldeias");
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

    // Copiar coordenada
    $(".copy-coord").on("click", function () {
      const coord = $(this).data("coord");
      navigator.clipboard.writeText(coord);
      UI.SuccessMessage(`Coordenada ${coord} copiada!`);
    });
  }

  // Evento renomear aldeias
  async function renameVillages() {
    // Fecha diálogo para melhorar UX
    Dialog.close();

    const opts = JSON.parse(localStorage.getItem(RENAMER_OPTIONS) || "{}");

    const firstbox = opts.firstbox || false;
    const startNum = firstbox ? Number(opts.start) : null;
    const padLength = firstbox ? Number(opts.end) : null;
    const secondbox = opts.secondbox || false;
    const fixedText = secondbox ? opts.textname : '';

    const villages = [...document.querySelectorAll('#groupVillages table tbody tr')];
    if (villages.length === 0) {
      UI.ErrorMessage("Nenhuma aldeia para renomear.");
      return;
    }

    for (let i = 0; i < villages.length; i++) {
      const row = villages[i];
      const coordSpan = row.querySelector('.coord-val');
      if (!coordSpan) continue;

      const coord = coordSpan.textContent.trim();
      const villageId = coordToId[coord];

      if (!villageId) {
        UI.ErrorMessage(`ID da aldeia não encontrado para ${coord}`);
        continue;
      }

      let newName = "";
      if (startNum !== null && padLength !== null) {
        newName += String(startNum + i).padStart(padLength, "0");
      }
      if (fixedText) {
        if (newName.length > 0) newName += " ";
        newName += fixedText;
      }

      if (!newName) {
        UI.ErrorMessage("Nome novo inválido.");
        continue;
      }

      try {
        const res = await $.post(`/game.php?village=${villageId}&screen=overview&ajax=rename_village`, {
          name: newName,
        });

        if (res && res.success) {
          UI.SuccessMessage(`Aldeia ${coord} renomeada para "${newName}" (${i + 1}/${villages.length})`);
        } else {
          UI.ErrorMessage(`Falha ao renomear aldeia ${coord} (${i + 1}/${villages.length})`);
        }
      } catch (err) {
        UI.ErrorMessage(`Erro na requisição para aldeia ${coord} (${i + 1}/${villages.length})`);
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  // --- EXECUÇÃO PRINCIPAL ---

  await loadMap();
  await loadGroups();

  // Monta painel
  Dialog.show("tw_group_renamer_panel", buildHtml());

  // Preenche select de grupos
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

  // Evento para habilitar/desabilitar inputs
  $('#firstbox').on('change', toggleInputs);
  $('#secondbox').on('change', toggleInputs);

  // Carrega opções salvas
  loadOptions();

  // Evento salvar opções
  $('#save').on('click', saveOptions);

  // Evento renomear
  $('#rename').on('click', renameVillages);

  // Evento mudança grupo
  select.addEventListener("change", async function () {
    const groupId = this.value;
    if (!groupId) return;

    localStorage.setItem(STORAGE_KEY, groupId);

    const firstOption = this.querySelector("option[disabled]");
    if (firstOption) firstOption.hidden = true;

    await loadVillages(groupId);
  });

  // Se tiver grupo salvo, já carrega aldeias
  if (savedGroupId) {
    select.dispatchEvent(new Event("change"));
  }
})();

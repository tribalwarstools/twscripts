(async function () {
  const STORAGE_KEY = 'renameSettings';

  // Função para carregar grupos do jogador
  async function loadGroups() {
    const groups = [];
    try {
      const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
      groupData.result.forEach(g => {
        groups.push({ group_id: g.group_id, group_name: g.name || `Grupo #${g.group_id}` });
      });
    } catch {
      UI.ErrorMessage('Falha ao carregar grupos do jogador.');
    }
    return groups;
  }

  // Função que exibe interface para escolher grupo e configurações
  async function showGroupSelector(groups) {
    const html = `
      <h3>Renomear Aldeias - Seleção de Grupo</h3>
      <div>
        <label><b>Selecione um grupo:</b></label>
        <select id="groupSelect" style="min-width:200px;">
          <option disabled selected>Selecione um grupo</option>
          ${groups.map(g => `<option value="${g.group_id}">${g.group_name}</option>`).join('')}
        </select>
      </div>
      <div style="margin-top:10px;">
        <label><input type="checkbox" id="numCheckbox"> Numerar a partir de:</label>
        <input type="number" id="numStart" value="1" min="1" style="width:60px;">
        <input type="number" id="numDigits" value="3" min="1" max="10" style="width:60px;" title="Número de dígitos para padding">
      </div>
      <div style="margin-top:10px;">
        <label><input type="checkbox" id="textCheckbox"> Texto base para renomear:</label>
        <input type="text" id="textBase" maxlength="32" placeholder="Nome base">
      </div>
      <div style="margin-top:15px;">
        <button id="btnConfirm" class="btn">Confirmar e ir para o grupo</button>
      </div>
    `;

    Dialog.show('renameGroupSelector', html);

    $('#btnConfirm').on('click', () => {
      const groupId = $('#groupSelect').val();
      if (!groupId) {
        UI.ErrorMessage('Selecione um grupo válido.');
        return;
      }

      const settings = {
        groupId,
        numerar: $('#numCheckbox').prop('checked'),
        startNumber: Number($('#numStart').val()) || 1,
        digits: Number($('#numDigits').val()) || 3,
        usarTexto: $('#textCheckbox').prop('checked'),
        textoBase: $('#textBase').val() || '',
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      Dialog.close();

      window.location.href = game_data.link_base_pure + `overview_villages&mode=combined&group=${groupId}`;
    });
  }

  // Função para executar renomeação na página do grupo
  async function runRenamer(settings) {
    if (!window.location.href.includes(`group=${settings.groupId}`)) {
      UI.InfoMessage('Você não está na página do grupo selecionado. Por favor, selecione o grupo novamente.');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const $icons = $('.rename-icon');
    if ($icons.length === 0) {
      UI.ErrorMessage('Não encontrou ícones de renomear na página.');
      return;
    }

    const totalVillages = $icons.length;
    if (totalVillages === 0) {
      UI.ErrorMessage('Nenhuma aldeia para renomear nesta página.');
      return;
    }

    UI.InfoMessage(`Iniciando renomeação de ${totalVillages} aldeias...`);

    for (let i = 0; i < totalVillages; i++) {
      setTimeout(() => {
        const $icon = $icons.eq(i);
        $icon.click();

        const numPart = settings.numerar
          ? String(settings.startNumber + i).padStart(settings.digits, '0')
          : '';

        const texto = settings.usarTexto ? settings.textoBase : '';
        const novoNome = `${numPart} ${texto}`.trim();

        $('.vis input[type="text"]').val(novoNome);
        $('input[type="button"]').click();

        UI.SuccessMessage(`Aldeia ${i + 1} / ${totalVillages} renomeada: "${novoNome}"`);

        localStorage.setItem('lastCount', settings.startNumber + i);

        if (i + 1 === totalVillages) {
          setTimeout(() => {
            UI.SuccessMessage('Renomeação concluída!');
            localStorage.removeItem(STORAGE_KEY);
          }, 500);
        }
      }, i * 300);
    }
  }

  // --- EXECUÇÃO ---

  if (window.location.href.includes('screen=overview_villages')) {
    // Página de aldeias - tentar rodar renomeação
    const savedSettingsRaw = localStorage.getItem(STORAGE_KEY);
    if (savedSettingsRaw) {
      const settings = JSON.parse(savedSettingsRaw);
      await runRenamer(settings);
    } else {
      UI.InfoMessage('Nenhuma configuração de renomeação salva. Execute a seleção de grupo primeiro.');
    }
  } else {
    // Qualquer outra página - abrir seletor
    const groups = await loadGroups();
    if (groups.length === 0) {
      UI.ErrorMessage('Nenhum grupo encontrado.');
      return;
    }
    await showGroupSelector(groups);
  }
})();

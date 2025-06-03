(() => {
  const PANEL_ID = 'tw-village-panel';
  if (document.getElementById(PANEL_ID)) {
    document.getElementById(PANEL_ID).remove();
  }

  // Função para extrair aldeias da tabela
  function extrairAldeias() {
    const aldeias = [];
    const linhas = document.querySelectorAll('table.vis.overview_table tbody tr');

    linhas.forEach(linha => {
      const link = linha.querySelector('a[href*="village="]');
      const labelSpan = linha.querySelector('.quickedit-label');

      if (link && labelSpan) {
        const href = link.getAttribute('href');
        const matchId = href.match(/village=(\d+)/);
        if (!matchId) return;

        const id = matchId[1];
        const labelText = labelSpan.textContent.trim();
        const coordMatch = labelText.match(/\((\d+\|\d+)\)/);
        const coord = coordMatch ? coordMatch[1] : '';
        let nome = labelText.replace(/\(\d+\|\d+\)/, '').trim();

        // Verifica se existe nome renomeado no localStorage
        const renomeados = loadRenomeados();
        if (renomeados[id]) {
          nome = renomeados[id];
        }

        aldeias.push({ id, nome, coord });
      }
    });
    return aldeias;
  }

  // LocalStorage keys
  const KEY_FAVORITOS = 'tw_village_favoritos';
  const KEY_RENOMEADOS = 'tw_village_renomeados';

  function loadFavoritos() {
    try {
      return JSON.parse(localStorage.getItem(KEY_FAVORITOS)) || [];
    } catch {
      return [];
    }
  }

  function saveFavoritos(list) {
    localStorage.setItem(KEY_FAVORITOS, JSON.stringify(list));
  }

  function loadRenomeados() {
    try {
      return JSON.parse(localStorage.getItem(KEY_RENOMEADOS)) || {};
    } catch {
      return {};
    }
  }

  function saveRenomeados(obj) {
    localStorage.setItem(KEY_RENOMEADOS, JSON.stringify(obj));
  }

  // Criar painel
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style = `
    position: fixed;
    top: 100px;
    right: 40px;
    width: 350px;
    max-height: 500px;
    overflow-y: auto;
    background: #f4e4bc;
    border: 2px solid #804000;
    border-radius: 10px;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.6);
    padding: 10px;
    z-index: 9999;
    font-family: Verdana, sans-serif;
    cursor: default;
  `;

  panel.innerHTML = `
    <div id="drag-header" style="font-weight: bold; font-size: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; cursor: move;">
      <span>🏰 Aldeias Extraídas</span>
      <button id="btn-close" style="background: transparent; border: none; font-size: 16px; cursor: pointer;">✖</button>
    </div>

    <div id="village-list" style="margin-bottom: 15px;"></div>

    <hr style="margin:10px 0;">

    <div id="favoritos-container">
      <b>⭐ Favoritos</b>
      <div id="favoritos-list" style="margin-top: 5px;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  // Fechar painel
  document.getElementById('btn-close').onclick = () => panel.remove();

  // Função para copiar texto e mostrar alerta nativo
  function copiarTexto(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copiado: ${text}`);
    }).catch(() => {
      alert('Erro ao copiar para área de transferência.');
    });
  }

  // Renderizar aldeias extraídas
  function renderAldeias() {
    const container = document.getElementById('village-list');
    const aldeias = extrairAldeias();
    if (aldeias.length === 0) {
      container.innerHTML = '<i>Nenhuma aldeia encontrada na tabela.</i>';
      return;
    }

    container.innerHTML = '';
    aldeias.forEach(v => {
      const div = document.createElement('div');
      div.style = 'margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;';

      const nomeSpan = document.createElement('span');
      nomeSpan.textContent = `${v.nome} (${v.coord})`;
      nomeSpan.style = 'flex-grow:1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

      // Botões
      const btnCopy = document.createElement('button');
      btnCopy.textContent = '📋 Copiar';
      btnCopy.style = 'margin-left: 5px;';
      btnCopy.onclick = () => copiarTexto(v.coord);

      const btnRename = document.createElement('button');
      btnRename.textContent = '✏️ Renomear';
      btnRename.style = 'margin-left: 5px;';
      btnRename.onclick = () => {
        const novoNome = prompt('Digite o novo nome para a aldeia:', v.nome);
        if (novoNome && novoNome.trim() !== '') {
          const renomeados = loadRenomeados();
          renomeados[v.id] = novoNome.trim();
          saveRenomeados(renomeados);
          renderAldeias();
          renderFavoritos();
        }
      };

      const btnFavoritar = document.createElement('button');
      btnFavoritar.textContent = '⭐ Favoritar';
      btnFavoritar.style = 'margin-left: 5px;';
      btnFavoritar.onclick = () => {
        const favoritos = loadFavoritos();
        if (favoritos.find(f => f.id === v.id)) {
          alert('Esta aldeia já está nos favoritos.');
          return;
        }
        favoritos.push({ id: v.id, nome: v.nome, coord: v.coord });
        saveFavoritos(favoritos);
        alert('Aldeia adicionada aos favoritos!');
        renderFavoritos();
      };

      div.appendChild(nomeSpan);
      div.appendChild(btnCopy);
      div.appendChild(btnRename);
      div.appendChild(btnFavoritar);

      container.appendChild(div);
    });
  }

  // Renderizar favoritos
  function renderFavoritos() {
    const container = document.getElementById('favoritos-list');
    const favoritos = loadFavoritos();
    if (favoritos.length === 0) {
      container.innerHTML = '<i>Nenhum favorito adicionado.</i>';
      return;
    }

    container.innerHTML = '';
    favoritos.forEach((fav, idx) => {
      const div = document.createElement('div');
      div.style = 'margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;';

      const nomeSpan = document.createElement('span');
      nomeSpan.textContent = `${fav.nome} (${fav.coord})`;
      nomeSpan.style = 'flex-grow:1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

      const btnCopy = document.createElement('button');
      btnCopy.textContent = '📋 Copiar';
      btnCopy.style = 'margin-left: 5px;';
      btnCopy.onclick = () => copiarTexto(fav.coord);

      const btnRemover = document.createElement('button');
      btnRemover.textContent = '❌ Remover';
      btnRemover.style = 'margin-left: 5px;';
      btnRemover.onclick = () => {
        const favoritos = loadFavoritos();
        favoritos.splice(idx, 1);
        saveFavoritos(favoritos);
        alert('Aldeia removida dos favoritos.');
        renderFavoritos();
      };

      div.appendChild(nomeSpan);
      div.appendChild(btnCopy);
      div.appendChild(btnRemover);

      container.appendChild(div);
    });
  }

  // Tornar painel arrastável
  const header = document.getElementById('drag-header');
  let isDragging = false, offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', e => {
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
    panel.style.right = 'auto';
  }
  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
  }

  renderAldeias();
  renderFavoritos();

  return panel;
})();

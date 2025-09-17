(async function abrirPainelAddAtalho(defaultName = '') {
  async function adicionarAtalho(name, href) {
    try {
      const token = window.csrf_token || (typeof twSDK !== 'undefined' && await twSDK.getCSRFToken()) || null;
      if (!token) {
        UI.ErrorMessage('Token CSRF não encontrado.');
        return false;
      }
      const data = `hotkey=&name=${encodeURIComponent(name)}&href=${encodeURIComponent(href)}&h=${token}`;
      await jQuery.ajax({
        url: '/game.php?screen=settings&mode=quickbar_edit&action=quickbar_edit&',
        method: 'POST',
        data,
      });
      UI.SuccessMessage('Atalho adicionado com sucesso!');
      return true;
    } catch (e) {
      UI.ErrorMessage('Erro ao adicionar atalho: ' + e.message);
      return false;
    }
  }

  const hrefFixo = `javascript:$.getScript('https://tribalwarstools.github.io/ConfigTropas/ScriptAtaque.js');`;

  const $html = `
    <div style="font-size:11px; line-height:1.2;">
      <h2 align="center">Adicionar atalho</h2>
      <table class="vis" style="width:100%; margin-top:4px;">
        <tr>
          <td>Nome do atalho:</td>
          <td>
            <input id="inputName" type="text" maxlength="30" style="width:50%;" placeholder="Nome do atalho" value="${defaultName}">
          </td>
        </tr>
        <tr>
          <td>URL do script:</td>
          <td style="display: flex; align-items: center; gap: 4px;">
            <input id="inputHref" type="text" style="width:98%;" readonly value="${hrefFixo}">
            <button id="btnCopiarHref" class="btn" title="Copiar URL">📋</button>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:center; padding-top:6px;">
            <input id="btnAdd" type="button" class="btn" value="Adicionar Atalho">
          </td>
        </tr>
      </table>
    </div>
  `;

  Dialog.show('add_quickbar', $html);

  $('#btnCopiarHref').on('click', () => {
    const hrefInput = document.getElementById('inputHref');
    hrefInput.select();
    hrefInput.setSelectionRange(0, 99999); // Para dispositivos móveis
    document.execCommand('copy');
    UI.SuccessMessage('URL copiada para a área de transferência!');
  });

  $('#btnAdd').on('click', async () => {
    const name = $('#inputName').val().trim();
    if (!name) {
      UI.ErrorMessage('Digite um nome para o atalho.');
      return;
    }
    await adicionarAtalho(name, hrefFixo);
    Dialog.close();
    location.href = `/game.php?screen=place&village=${game_data.village.id}`;
  });
})();

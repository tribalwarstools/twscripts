(async function abrirPainelAddAtalho() {
  // Função para adicionar o atalho na quickbar
  async function adicionarAtalho(name, href) {
    try {
      // Pega o token CSRF
      const token = window.csrf_token || (typeof twSDK !== 'undefined' && await twSDK.getCSRFToken()) || null;
      if (!token) {
        UI.ErrorMessage('Token CSRF não encontrado.');
        return false;
      }

      // Dados para o POST
      const data = `hotkey=&name=${encodeURIComponent(name)}&href=${encodeURIComponent(href)}&h=${token}`;

      // Envia o POST para adicionar
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

  // HTML da interface
  const $html = `
    <div style="font-size:11px; line-height:1.2;">
      <h2 align="center">Adicionar atalho quickbar</h2>
      <table class="vis" style="width:100%; margin-top:4px;">
        <tr>
          <td>Nome do atalho:</td>
          <td><input id="inputName" type="text" maxlength="30" style="width:100%;" placeholder="MeuScript"></td>
        </tr>
        <tr>
          <td>Link do script:</td>
          <td><input id="inputHref" type="text" maxlength="200" style="width:100%;" placeholder="https://example.com/meuscript.js"></td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:center; padding-top:6px;">
            <input id="btnAdd" type="button" class="btn" value="Adicionar Atalho">
          </td>
        </tr>
      </table>
    </div>
  `;

  // Mostrar diálogo com a interface
  Dialog.show('add_quickbar', $html);

  // Atrelando evento do botão depois que o dialog aparece
  $('#btnAdd').on('click', async () => {
    const name = $('#inputName').val().trim();
    const href = $('#inputHref').val().trim();

    if (!name || !href) {
      UI.ErrorMessage('Preencha nome e link do atalho.');
      return;
    }

    // Chama a função para adicionar o atalho
    await adicionarAtalho(name, href);

    // Fecha o diálogo após adicionar
    Dialog.close();
  });
})();

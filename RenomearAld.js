(function () {
  function abrirPainelRenomear() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Acesse "overview_villages" para usar o Renamer.');
      return;
    }

    const contadorAtual = parseInt(localStorage.getItem('renamer_counter') || '1', 10);

    const $html = `
      <div style="font-size:11px; line-height:1.2;">
        <div style="text-align:center; font-weight:bold;">Renamer</div>
        <table class="vis" style="width:100%; margin-top:4px;">
          <tr>
            <td><input id="firstbox" type="checkbox"> Num</td>
            <td><input id="end" type="number" min="1" max="10" value="2" style="width:35px;"></td>
          </tr>
          <tr>
            <td><input id="secondbox" type="checkbox"> Txt</td>
            <td><input id="textname" type="text" maxlength="32" style="width:90px;" placeholder="Nome"></td>
          </tr>
          <tr>
            <td>Atual:</td>
            <td><span id="contadorAtual" style="color:green;">${contadorAtual}</span></td>
          </tr>
          <tr>
            <td>Início:</td>
            <td><input id="setCounter" type="number" style="width:50px;"></td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:center; padding-top:4px;">
              <input id="rename" type="button" class="btn" value="Go">
              <input id="resetCounter" type="button" class="btn" value="Reset">
              <input id="save" type="button" class="btn" value="Salvar">
            </td>
          </tr>
        </table>
        <div style="text-align:center; font-size:10px; margin-top:4px;">
          <strong>v2.1 - <span style="color:red;">KINGS</span></strong>
        </div>
      </div>`;

    Dialog.show('rename', $html);

    // Carregar configurações
    let config = JSON.parse(localStorage.getItem('renamer_config') || '{}');
    $('#firstbox').prop('checked', config.firstbox || false);
    $('#end').val(config.end || 3);
    $('#secondbox').prop('checked', config.secondbox || false);
    $('#textname').val(config.textname || '');

    // Salvar configurações
    $('#save').on('click', () => {
      config = {
        firstbox: $('#firstbox').prop('checked'),
        end: parseInt($('#end').val()) || 3,
        secondbox: $('#secondbox').prop('checked'),
        textname: $('#textname').val()
      };
      localStorage.setItem('renamer_config', JSON.stringify(config));
      UI.SuccessMessage('Configurações salvas.');
    });

    // Resetar tudo
    $('#resetCounter').on('click', () => {
      // Limpar localStorage
      localStorage.removeItem('renamer_counter');
      localStorage.removeItem('renamer_config');

      // Resetar campos visuais
      $('#firstbox').prop('checked', false);
      $('#end').val('3');
      $('#secondbox').prop('checked', false);
      $('#textname').val('');
      $('#setCounter').val('');
      $('#contadorAtual').text('1');

      UI.SuccessMessage('Tudo resetado e limpo.');
    });

    // Renomear aldeias
    $('#rename').on('click', function (e) {
      e.preventDefault();

      const usarNumeracao = $('#firstbox').prop('checked');
      const digitos = parseInt($('#end').val()) || 3;
      const usarTexto = $('#secondbox').prop('checked');
      const textoBase = $('#textname').val() || '';
      const novoInicio = parseInt($('#setCounter').val());

      let contador = !isNaN(novoInicio) ? novoInicio : parseInt(localStorage.getItem('renamer_counter') || '1', 10);
      if (!isNaN(novoInicio)) {
        localStorage.setItem('renamer_counter', contador.toString());
      }

      Dialog.close();

      const $aldeias = $('.rename-icon');
      const total = $aldeias.length;

      $aldeias.each(function (i) {
        const $btn = this;
        setTimeout(() => {
          $($btn).click();
          const novoNome = `${usarNumeracao ? String(contador++).padStart(digitos, '0') : ''} ${usarTexto ? textoBase : ''}`.trim();
          $('.vis input[type="text"]').val(novoNome);
          $('input[type="button"]').click();
          UI.SuccessMessage(`Renomeada: ${i + 1}/${total}`);
          if (i + 1 === total) {
            localStorage.setItem('renamer_counter', String(contador));
          }
        }, i * 300);
      });
    });
  }

  window.abrirPainelRenomear = abrirPainelRenomear;
})();

(function () {
  function abrirPainelRenomear() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Você precisa estar na tela de overview_villages para usar o Renamer.');
      return;
    }

    const contadorAtual = parseInt(localStorage.getItem('renamer_counter') || '1', 10);

    const $html = `
      <h3 align="center">Renamer</h3>
      <table class="vis" style="width: 100%; font-size: 12px;">
        <tr>
          <td><label><input id="firstbox" type="checkbox"> Numeração</label></td>
          <td>Dígitos: <input id="end" type="number" min="1" max="10" style="width: 50px;"></td>
        </tr>
        <tr>
          <td><label><input id="secondbox" type="checkbox"> Texto</label></td>
          <td><input id="textname" type="text" placeholder="Texto base" maxlength="32" style="width: 100%;"></td>
        </tr>
        <tr>
          <td>Contador atual:</td>
          <td><span id="contadorAtual" style="color: green;">${contadorAtual}</span></td>
        </tr>
        <tr>
          <td>Iniciar de:</td>
          <td><input id="setCounter" type="number" placeholder="Novo valor" style="width: 80px;"></td>
        </tr>
        <tr>
          <td colspan="2" align="center" style="padding-top: 6px;">
            <input id="rename" type="button" class="btn" value="Renomear">
            <input id="resetCounter" type="button" class="btn" value="Resetar">
            <input id="save" type="button" class="btn" value="Salvar">
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 6px;">
        <small><strong>v2.1 por <span style="color:red;">K I N G S</span></strong></small>
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

    // Resetar contador
    $('#resetCounter').on('click', () => {
      localStorage.setItem('renamer_counter', '1');
      $('#contadorAtual').text('1');
      UI.SuccessMessage('Contador resetado para 1.');
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

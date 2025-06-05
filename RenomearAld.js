(function () {
  function abrirPainelRenomear() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Você precisa estar na tela de overview_villages para usar o Renamer.');
      return;
    }

    const contadorAtual = parseInt(localStorage.getItem('renamer_counter') || '1', 10);

    const $html = `<h3 align="center">Renamer</h3>
      <div class="info_box">
        <div class="content" style="margin-left: 4px">
          <b>Numeração:</b> É contínua entre usos.<br>
          <b>Dica:</b> Use "Resetar" para começar novamente, ou defina o início abaixo.
        </div>
      </div>
      <div style="margin-top: 6px">
        <label><input id="firstbox" type="checkbox"> Usar numeração automática</label><br>
        Dígitos (ex: 3 → 001): <input id="end" type="number" min="1" max="10" style="width: 60px;">
      </div>
      <div style="margin-top: 6px">
        <label><input id="secondbox" type="checkbox"> Texto base</label><br>
        <input id="textname" type="text" placeholder="Nome da aldeia" maxlength="32" style="width: 200px;">
      </div>
      <div style="margin-top: 6px">
        <b>Contador atual:</b> <span id="contadorAtual" style="color: green;">${contadorAtual}</span><br>
        Iniciar a partir de: <input id="setCounter" type="number" style="width: 80px;" placeholder="Novo valor">
      </div>
      <div style="padding-top: 10px;">
        <input id="rename" type="button" class="btn" value="Renomear Aldeias">
        <input id="resetCounter" type="button" class="btn" value="Resetar Contador">
        <input id="save" type="button" class="btn" value="Salvar Opções">
      </div>
      <br>
      <div>
        <small><strong>Rename Villages v2.1 por <span style="color: red;">K I N G S</span></strong></small>
      </div>`;

    Dialog.show('rename', $html);

    // Carregar configurações
    let config = JSON.parse(localStorage.getItem('renamer_config') || '{}');
    $('#firstbox').prop('checked', config.firstbox || false);
    $('#end').val(config.end || 3);
    $('#secondbox').prop('checked', config.secondbox || false);
    $('#textname').val(config.textname || '');

    // Botão salvar
    $('#save').on('click', () => {
      config = {
        firstbox: $('#firstbox').prop('checked'),
        end: parseInt($('#end').val()) || 3,
        secondbox: $('#secondbox').prop('checked'),
        textname: $('#textname').val()
      };
      localStorage.setItem('renamer_config', JSON.stringify(config));
      UI.SuccessMessage('As configurações foram salvas com sucesso.');
    });

    // Botão resetar
    $('#resetCounter').on('click', () => {
      localStorage.setItem('renamer_counter', '1');
      $('#contadorAtual').text('1');
      UI.SuccessMessage('Contador resetado para 1.');
    });

    // Botão renomear
    $('#rename').on('click', function (e) {
      e.preventDefault();

      const usarNumeracao = $('#firstbox').prop('checked');
      const digitos = parseInt($('#end').val()) || 3;
      const usarTexto = $('#secondbox').prop('checked');
      const textoBase = $('#textname').val() || '';
      const novoInicio = parseInt($('#setCounter').val());

      let contador = !isNaN(novoInicio) ? novoInicio : parseInt(localStorage.getItem('renamer_counter') || '1', 10);

      if (!isNaN(novoInicio)) {
        localStorage.setItem('renamer_counter', novoInicio.toString());
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

  // Tornar global
  window.abrirPainelRenomear = abrirPainelRenomear;
})();

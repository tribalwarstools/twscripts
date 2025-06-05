(function () {
  function abrirPainelRenomear() {
    if (!window.location.href.includes('screen=overview_villages')) {
      UI.InfoMessage('Você precisa estar na tela de overview_villages para usar o Renamer.');
      return;
    }

    const $html = `<h3 align="center">Renamer</h3>
      <div>
        <div class="info_box">
          <div class="content" style="margin-left: 4px">
            <b>1 -</b> Numeração automática contínua.<br>
            <b>2 -</b> Define quantos dígitos usar no número (ex: 3 → 001).
          </div>
        </div>
        <label><input id="firstbox" type="checkbox"> Usar numeração</label>
        <input id="end" type="number" placeholder="Dígitos (ex: 3)" min="1" max="10" size="1" style="width: 80px;">
      </div>
      <div style="margin-top: 4px">
        <label><input id="secondbox" type="checkbox"> Texto do nome</label>
        <input id="textname" type="text" placeholder="Texto base" maxlength="32">
      </div>
      <div style="padding-top: 8px;">
        <input id="rename" type="button" class="btn" value="Renomear Aldeias">
        <input id="resetCounter" type="button" class="btn" value="Resetar Contador">
        <input id="save" type="button" class="btn" value="Salvar Opções">
      </div>
      <br>
      <div>
        <small>
          <strong>Rename Villages v2.0 por <span style="color: red;">K I N G S</span></strong>
        </small>
      </div>`;

    Dialog.show('rename', $html);

    // Carregar configurações salvas
    let config = JSON.parse(localStorage.getItem('renamer_config') || '{}');
    $('#firstbox').prop('checked', config.firstbox || false);
    $('#end').val(config.end || 3);
    $('#secondbox').prop('checked', config.secondbox || false);
    $('#textname').val(config.textname || '');

    // Contador salvo
    let contador = parseInt(localStorage.getItem('renamer_counter') || '1', 10);

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

    $('#resetCounter').on('click', () => {
      contador = 1;
      localStorage.setItem('renamer_counter', '1');
      UI.SuccessMessage('Contador resetado para 1.');
    });

    $('#rename').on('click', function (e) {
      e.preventDefault();
      const usarNumeracao = $('#firstbox').prop('checked');
      const digitos = parseInt($('#end').val()) || 3;
      const usarTexto = $('#secondbox').prop('checked');
      const textoBase = $('#textname').val() || '';

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

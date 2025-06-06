(function () {
  function abrirPainelRenomear() {
    if (!window.location.href.includes('screen=overview_villages&mode=combined')) {
      window.location.href = game.settings.url + '&screen=overview_villages&mode=combined';
      return;
    }

    const contadorAtual = parseInt(localStorage.getItem('renamer_counter') || '1', 10);

    const $html = `
      <div style="font-size:11px; line-height:1.2;">
        <h2 align='center'>Renomear aldeias</h2>
        <table class="vis" style="width:100%; margin-top:4px;">
          <tr>
            <td><input id="firstbox" type="checkbox"> Dígitos</td>
            <td><input id="end" type="number" min="1" max="10" value="2" style="width:35px;"></td>
          </tr>
          <tr>
            <td><input id="prefixbox" type="checkbox"> Prefixo</td>
            <td><input id="prefix" type="text" maxlength="10" style="width:50px;" placeholder="Ex: 08"></td>
          </tr>
          <tr>
            <td><input id="secondbox" type="checkbox"> Nome</td>
            <td><input id="textname" type="text" maxlength="32" style="width:90px;" placeholder="Nome"></td>
          </tr>
          <tr>
            <td>Prévia:</td>
            <td>
              <span id="preview" style="color:blue;">-</span>
              <input id="verPreview" class="btn" type="button" value="Visualizar" style="margin-left:4px; padding:1px 4px;">
            </td>
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
              <input id="rename" type="button" class="btn" value="Renomear">
              <input id="resetCounter" type="button" class="btn" value="Reset">
              <input id="save" type="button" class="btn" value="Salvar">
            </td>
          </tr>
        </table>
        <div style="text-align:center; font-size:10px; margin-top:4px;">
          <strong>Versão - <span style="color:red;">2.1</span></strong>
        </div>
      </div>`;

    Dialog.show('rename', $html);

    // Carregar configurações
    let config = JSON.parse(localStorage.getItem('renamer_config') || '{}');
    $('#firstbox').prop('checked', config.firstbox || false);
    $('#end').val(config.end || 2);
    $('#prefixbox').prop('checked', config.prefixbox || false);
    $('#prefix').val(config.prefix || '');
    $('#secondbox').prop('checked', config.secondbox || false);
    $('#textname').val(config.textname || '');

    $('#verPreview').on('click', () => {
      const usarNumero = $('#firstbox').prop('checked');
      const digitos = parseInt($('#end').val()) || 2;
      const numero = usarNumero ? String(contadorAtual).padStart(digitos, '0') : '';

      const usarPrefixo = $('#prefixbox').prop('checked');
      const prefixo = usarPrefixo ? $('#prefix').val().trim() : '';

      const usarTexto = $('#secondbox').prop('checked');
      const nome = usarTexto ? $('#textname').val().trim() : '';

      const partes = [];
      if (numero) partes.push(numero);
      if (prefixo) partes.push(prefixo);
      if (nome) partes.push(nome);

      const resultado = partes.join(' ') || '-';
      $('#preview').text(resultado);
    });

    $('#save').on('click', () => {
      config = {
        firstbox: $('#firstbox').prop('checked'),
        end: parseInt($('#end').val()) || 2,
        prefixbox: $('#prefixbox').prop('checked'),
        prefix: $('#prefix').val(),
        secondbox: $('#secondbox').prop('checked'),
        textname: $('#textname').val()
      };
      localStorage.setItem('renamer_config', JSON.stringify(config));
      UI.SuccessMessage('Configurações salvas.');
    });

    $('#resetCounter').on('click', () => {
      localStorage.removeItem('renamer_counter');
      localStorage.removeItem('renamer_config');
      $('#firstbox').prop('checked', false);
      $('#end').val('2');
      $('#prefixbox').prop('checked', false);
      $('#prefix').val('');
      $('#secondbox').prop('checked', false);
      $('#textname').val('');
      $('#setCounter').val('');
      $('#contadorAtual').text('1');
      $('#preview').text('-');
      UI.SuccessMessage('Tudo resetado e limpo.');
    });

    $('#rename').on('click', function (e) {
      e.preventDefault();

      const usarNumero = $('#firstbox').prop('checked');
      const digitos = parseInt($('#end').val()) || 2;
      const usarPrefixo = $('#prefixbox').prop('checked');
      const prefixo = $('#prefix').val().trim();
      const usarTexto = $('#secondbox').prop('checked');
      const textoBase = $('#textname').val().trim();

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
          const partes = [];
          if (usarNumero) partes.push(String(contador++).padStart(digitos, '0'));
          if (usarPrefixo && prefixo) partes.push(prefixo);
          if (usarTexto && textoBase) partes.push(textoBase);
          const novoNome = partes.join(' ');
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

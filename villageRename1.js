if (window.location.href.includes('screen=overview_villages')) {
  const $html = `
    <h3 align="center">Renamer</h3>
    <div>
      <div class="info_box">
        <div class="content" style="margin-left: 4px">
          <b>1 -</b> Example 1, starting with 001.<br>
          <b>2 -</b> Example 3, starting with 3 digits.
        </div>
      </div>
      <input id="firstbox" type="checkbox">
      <input id="start" type="text" placeholder="1" size="3">
      <input id="end" type="text" placeholder="3" size="1">
    </div>
    <div style="margin-top: 4px">
      <input id="secondbox" type="checkbox">
      <input id="textname" type="text" placeholder="Your text here" maxlength="32">
    </div>
    <div style="padding-top: 8px;">
      <input id="rename" type="button" class="btn" value="Rename Villages">
      <input id="save" type="button" class="btn" value="Save Options">
    </div>
    <br>
    <div>
      <small>
        <strong>Rename Villages v1.2 by <span style="color: red;">K I N G S</span></strong>
      </small>
    </div>`;

  Dialog.show('rename', $html);

  // Carregue suas aldeias do grupo aqui — exemplo array com IDs de aldeias
  // Você deve alimentar essa lista com as aldeias do grupo selecionado
  const villages = [...]; // ex: ['12345', '12346', '12347'] — IDs das aldeias do grupo

  let set = localStorage.getItem('set');
  let lastCount = localStorage.getItem('lastCount');

  if (set) {
    set = JSON.parse(set);
    $('#firstbox').prop('checked', set.firstbox);
    $('#start').val(set.start);
    $('#end').val(set.end);
    $('#secondbox').prop('checked', set.secondbox);
    $('#textname').val(set.textname);
  }

  if (lastCount) {
    const startVal = Number($('#start').val());
    const savedCount = Number(lastCount);
    if (!isNaN(savedCount) && savedCount >= startVal) {
      $('#start').val(savedCount + 1);
    }
  }

  $('#save').on('click', () => {
    set = {
      firstbox: $('#firstbox').prop('checked'),
      start: $('#start').val(),
      end: $('#end').val(),
      secondbox: $('#secondbox').prop('checked'),
      textname: $('#textname').val(),
    };
    localStorage.setItem('set', JSON.stringify(set));
    UI.SuccessMessage('The settings have been saved successfully.');
  });

  $('#rename').on('click', function (e) {
    e.preventDefault();

    if (!villages || villages.length === 0) {
      UI.ErrorMessage('Nenhuma aldeia selecionada para renomear.');
      return;
    }

    const firstboxChecked = $('#firstbox').prop('checked');
    const startNumber = Number($('#start').val());
    const padLength = Number($('#end').val());
    const secondboxChecked = $('#secondbox').prop('checked');
    const textName = $('#textname').val();

    Dialog.close();

    const $icons = $('.rename-icon');

    if ($icons.length < villages.length) {
      UI.ErrorMessage('Número de ícones de renomear menor que o número de aldeias.');
      return;
    }

    villages.forEach((villageId, i) => {
      setTimeout(() => {
        const $icon = $icons.eq(i);
        if ($icon.length === 0) {
          UI.ErrorMessage(`Ícone de renomear não encontrado no índice ${i}`);
          return;
        }
        $icon.click();

        const numberPart = firstboxChecked
          ? String(startNumber + i).padStart(padLength, '0')
          : '';

        $('.vis input[type="text"]').val(`${numberPart} ${secondboxChecked ? textName : ''}`);
        $('input[type="button"]').click();

        UI.SuccessMessage(`Success: ${i + 1} / ${villages.length}`);
        localStorage.setItem('lastCount', startNumber + i);
      }, i * 250);
    });
  });
} else {
  UI.InfoMessage('Redirecting...');
  window.location.href = game_data.link_base_pure + 'overview_villages&mode=combined&group=0';
}

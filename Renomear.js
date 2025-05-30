if (window.location.href.includes('screen=overview_villages')) {
	const $html = `<h3 align="center">Renomear Aldeias</h3>
	
		<input id="firstbox" type="checkbox">
		<input id="start" type="text" placeholder="Início" size="1">
		<input id="end" type="text" placeholder="Dígitos" size="1">
	</div>
	<div style="margin-top: 4px">
		<input id="secondbox" type="checkbox">
		<input id="textname" type="text" placeholder="Seu texto aqui" maxlength="32">
	</div>
	<div style="padding-top: 8px;">
		<input id="rename" type="button" class="btn" value="Renomear">
		<input id="save" type="button" class="btn" value="Salvar">
	</div>
	<br>
	<div>
		<small>
			<strong>versão em PT-BR</span></strong>
		</small>
	</div>`;

	Dialog.show('rename', $html);
	let set = localStorage.getItem('set');

	if (set) {
		set = JSON.parse(set);
		$('#firstbox').prop('checked', set.firstbox);
		$('#start').val(set.start);
		$('#end').val(set.end);
		$('#secondbox').prop('checked', set.secondbox);
		$('#textname').val(set.textname);
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

		UI.SuccessMessage('As configurações foram salvas com sucesso.');
	});

	$('#rename').on('click', function (s) {
		s.preventDefault();
		let n, e;

		if ($('#firstbox').prop('checked')) {
			n = Number($('#start').val());
			e = Number($('#end').val());
		}

		const a = $('#secondbox').prop('checked') ? $('#textname').val() : '';
		const total = game_data.player.villages;

		Dialog.close();

		$('.rename-icon').each(function (i) {
			let $this = this;
			setTimeout(function () {
				$($this).click();
				$('.vis input[type="text"]').val(
					`${n && e !== undefined ? String(n + i).padStart(e, '0') : ''} ${a}`
				);
				$('input[type="button"]').click();
				UI.SuccessMessage(' Sucesso: ' + (i + 1) + '/' + total);
			}, i * 200);
		});
	});
} else
	UI.InfoMessage('Redirecionando...'),
		(window.location.href =
			game_data.link_base_pure + 'overview_villages&mode=combined&group=0');

if (window.location.href.includes('screen=overview_villages')) {
	const coordToId = {};

	// Carrega mapa para mapear coordenadas → ID (async)
	async function loadMapCoords() {
		const mapData = await $.get("map/village.txt");
		const lines = mapData.trim().split("\n");
		lines.forEach(line => {
			const [id, name, x, y] = line.split(",");
			const coord = `${x}|${y}`;
			coordToId[coord] = id;
		});
	}

	async function loadGroups() {
		const groups = [];
		const groupData = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
		groupData.result.forEach(group => {
			groups.push({ group_id: group.group_id, group_name: group.name });
		});
		return groups;
	}

	const $html = `
		<h3 align="center">Renamer</h3>
		<div>
			<label for="groupSelect"><b>Selecione um grupo:</b></label>
			<select id="groupSelect" style="
				padding: 4px;
				background: #f4e4bc;
				color: #000;
				border: 1px solid #603000;
				font-weight: bold;
				margin-bottom: 10px;
			">
				<option disabled selected>Carregando grupos...</option>
			</select>
		</div>
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
				<strong>Rename Villages v1.2 by<span style="color: red;"> K I N G S </span></strong>
			</small>
		</div>
	`;

	Dialog.show('rename', $html);

	// Carrega as coordenadas do mapa
	await loadMapCoords();

	// Carrega grupos e popula select
	const groups = await loadGroups();
	const $select = $('#groupSelect');
	$select.empty();

	// Adiciona placeholder
	const placeholder = $('<option disabled selected>Selecione um grupo</option>');
	$select.append(placeholder);

	groups.forEach(g => {
		const opt = $('<option>').val(g.group_id).text(g.group_name || 'Sem nome');
		$select.append(opt);
	});

	// Carrega config salva
	let set = localStorage.getItem('set');
	let lastCount = localStorage.getItem('lastCount');

	if (set) {
		set = JSON.parse(set);
		$('#firstbox').prop('checked', set.firstbox);
		$('#start').val(set.start);
		$('#end').val(set.end);
		$('#secondbox').prop('checked', set.secondbox);
		$('#textname').val(set.textname);
		if(set.groupId) {
			$select.val(set.groupId);
			placeholder.prop('hidden', true);
		}
	}

	if (lastCount) {
		let startVal = Number($('#start').val());
		let savedCount = Number(lastCount);
		if (!isNaN(savedCount) && savedCount >= startVal) {
			$('#start').val(savedCount + 1);
		}
	}

	$('#save').on('click', () => {
		const config = {
			firstbox: $('#firstbox').prop('checked'),
			start: $('#start').val(),
			end: $('#end').val(),
			secondbox: $('#secondbox').prop('checked'),
			textname: $('#textname').val(),
			groupId: $('#groupSelect').val(),
		};
		localStorage.setItem('set', JSON.stringify(config));
		UI.SuccessMessage('The settings have been saved successfully.');
	});

	$('#rename').on('click', async function (e) {
		e.preventDefault();

		const nChecked = $('#firstbox').prop('checked');
		const nStart = Number($('#start').val());
		const nEnd = Number($('#end').val());
		const textName = $('#secondbox').prop('checked') ? $('#textname').val() : '';
		const groupId = $('#groupSelect').val();

		if (!groupId) {
			UI.ErrorMessage('Selecione um grupo antes de renomear.');
			return;
		}

		if (nChecked && (isNaN(nStart) || isNaN(nEnd))) {
			UI.ErrorMessage('Por favor, insira valores válidos para início e quantidade de dígitos.');
			return;
		}

		Dialog.close();

		UI.InfoMessage('Carregando aldeias do grupo, aguarde...');

		// Pega aldeias do grupo via ajax
		const response = await $.post("/game.php?screen=groups&ajax=load_villages_from_group", {
			group_id: groupId
		});

		const doc = new DOMParser().parseFromString(response.html, "text/html");
		const rows = doc.querySelectorAll("#group_table tbody tr");

		if (!rows.length) {
			UI.ErrorMessage('Nenhuma aldeia no grupo selecionado.');
			return;
		}

		// Monta array com os IDs das aldeias
		const villages = [];
		rows.forEach(row => {
			const tds = row.querySelectorAll("td");
			if (tds.length >= 2) {
				const coords = tds[1].textContent.trim();
				const id = coordToId[coords];
				if (id) villages.push(id);
			}
		});

		// Renomeia aldeias do grupo
		villages.forEach((villageId, i) => {
			setTimeout(() => {
				const $icon = $(`.rename-icon[data-village-id="${villageId}"]`);
				if ($icon.length === 0) {
					UI.ErrorMessage(`Ícone de renomear não encontrado para aldeia ${villageId}`);
					return;
				}

				$icon.click();

				const numberPart = (nChecked) ? String(nStart + i).padStart(nEnd, '0') : '';
				$('.vis input[type="text"]').val(`${numberPart} ${textName}`);
				$('input[type="button"]').click();

				UI.SuccessMessage(`Success: ${i + 1} / ${villages.length}`);
				localStorage.setItem('lastCount', nStart + i);
			}, i * 250);
		});
	});
} else {
	UI.InfoMessage('Redirecting...');
	window.location.href = game_data.link_base_pure + 'overview_villages&mode=combined&group=0';
}

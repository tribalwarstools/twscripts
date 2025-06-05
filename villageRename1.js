javascript:
(async function () {
	const STORAGE_KEY = "tw_rename_config";

	function showInterface(groups) {
		const html = `
			<h3 align="center">Renomear Aldeias</h3>
			<div class="vis" style="padding: 8px;">
				<label><b>Grupo:</b></label>
				<select id="groupSelect" class="group-select" style="margin-left: 5px;">
					<option disabled selected hidden>Selecione um grupo</option>
					${groups.map(g => `<option value="${g.group_id}">${g.group_name}</option>`).join("")}
				</select>
				<br><br>
				<label><input type="checkbox" id="firstbox"> Numeração automática</label>
				<input id="start" type="number" placeholder="Início" value="1" size="4">
				<input id="end" type="number" placeholder="Dígitos" value="2" size="2">
				<br><br>
				<label><input type="checkbox" id="secondbox" checked> Nome base:</label>
				<input id="textname" type="text" placeholder="Ex: |A|" maxlength="32" style="width: 200px">
				<br><br>
				<input id="confirm" type="button" class="btn" value="Confirmar e ir para o grupo">
			</div>
		`;
		Dialog.show("rename_config", html);

		$("#confirm").on("click", () => {
			const groupId = $("#groupSelect").val();
			if (!groupId) return UI.ErrorMessage("Selecione um grupo.");

			const config = {
				groupId: groupId,
				firstbox: $("#firstbox").prop("checked"),
				start: parseInt($("#start").val()) || 1,
				end: parseInt($("#end").val()) || 2,
				secondbox: $("#secondbox").prop("checked"),
				textname: $("#textname").val() || ""
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
			window.location.href = game_data.link_base_pure + `overview_villages&mode=combined&group=${groupId}`;
		});
	}

	async function fetchGroups() {
		const res = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
		return res.result.filter(g => g.group_id).map(g => ({
			group_id: g.group_id,
			group_name: g.name || "Grupo sem nome"
		}));
	}

	function doRename(config) {
		const renameIcons = $(".rename-icon");
		if (!renameIcons.length) {
			UI.ErrorMessage("Nenhum ícone de renomear encontrado.");
			return;
		}

		const { firstbox, start, end, secondbox, textname } = config;
		const total = renameIcons.length;

		renameIcons.each(function (i) {
			setTimeout(() => {
				const numberPart = firstbox ? String(start + i).padStart(end, "0") : "";
				const finalName = `${numberPart}${secondbox ? " " + textname : ""}`.trim();

				$(this).click();
				$(".vis input[type='text']").val(finalName);
				$("input[type='button']").click();
				UI.SuccessMessage(`Renomeado: ${i + 1}/${total}`);
			}, i * 300);
		});

		// Limpa configuração após execução
		localStorage.removeItem(STORAGE_KEY);
	}

	// Se estamos na tela de renomear e há config salva → executa
	if (window.location.href.includes("overview_villages&mode=combined")) {
		const config = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
		if (config) {
			setTimeout(() => doRename(config), 1000);
		} else {
			UI.InfoMessage("Nenhuma configuração de renomeação salva. Execute a seleção de grupo primeiro.");
		}
	} else {
		const groups = await fetchGroups();
		showInterface(groups);
	}
})();

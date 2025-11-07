var scriptData = {
    name: 'Planejador de Ataque em Massa',
    version: 'v1.1.8',
    author: 'RedAlert',
    authorUrl: 'https://twscripts.dev/',
    helpLink:
        'https://forum.tribalwars.net/index.php?threads/mass-attack-planner.285331/',
};

// Entrada do Usuário
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Local Storage
var LS_PREFIX = `ra_massAttackPlanner_`;
var TIME_INTERVAL = 60 * 60 * 1000 * 24 * 30; /* atualizar dados a cada 30 dias */
var LAST_UPDATED_TIME = localStorage.getItem(`${LS_PREFIX}_last_updated`) ?? 0;

var unitInfo;

// Init Debug
initDebug();

/* Buscar info das unidades apenas quando necessário */
(function () {
    if (LAST_UPDATED_TIME !== null) {
        if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
            fetchUnitInfo();
        } else {
            unitInfo = JSON.parse(
                localStorage.getItem(`${LS_PREFIX}_unit_info`)
            );
            init(unitInfo);
        }
    } else {
        fetchUnitInfo();
    }
})();

// Inicializador do Script
function init(unitInfo) {
    var currentDateTime = getCurrentDateTime();

    // correção caso o mundo não tenha paladino
    let knightSpeed = 0;
    const worldUnits = game_data.units;
    if (worldUnits.includes('knight')) {
        knightSpeed = unitInfo?.config['knight'].speed || 0;
    } else {
        jQuery('#support_unit option[data-option-unit="knight"]').attr(
            'disabled'
        );
    }

    const content = `
			<div class="ra-mb15">
				<label for="arrival_time">Horário de Chegada</label>
				<input id="arrival_time" type="text" placeholder="aaaa-mm-dd hh:mm:ss" value="${currentDateTime}">
			</div>
			<input type="hidden" id="nobleSpeed" value="${unitInfo.config['snob'].speed}" />
			<div class="ra-flex">
				<div class="ra-flex-6">
					<div class="ra-mb15">
						<label for="nuke_unit">Unidade mais lenta do Nuke</label>
						<select id="nuke_unit">
							<option value="${unitInfo.config['axe'].speed}">Machado</option>
							<option value="${unitInfo.config['light'].speed}">CL/MA/Paladino</option>
							<option value="${unitInfo.config['heavy'].speed}">CP</option>
							<option value="${unitInfo.config['ram'].speed}" selected="selected">Ariete/Catapulta</option>
						</select>
					</div>
				</div>
				<div class="ra-flex-6">
					<div class="ra-mb15">
						<label for="support_unit">Unidade mais lenta do Apoio</label>
						<select id="support_unit">
							<option value="${unitInfo.config['spear'].speed}">Lança/Arqueiro</option>
							<option value="${unitInfo.config['sword'].speed}" selected="selected">Espada</option>
							<option value="${unitInfo.config['spy'].speed}">Batedor</option>
							<option value="${knightSpeed}" data-option-unit="knight">Paladino</option>
							<option value="${unitInfo.config['heavy'].speed}">CP</option>
							<option value="${unitInfo.config['catapult'].speed}">Catapulta</option>
						</select>
					</div>
				</div>
			</div>
			<div class="ra-mb15">
				<label for="target_coords">Coordenadas Alvos</label>
				<textarea id="target_coords"></textarea>
			</div>
			<div class="ra-flex">
				<div class="ra-flex-4">
					<div class="ra-mb15">
						<label for="nobel_coords">Coordenadas de Nobres</label>
						<textarea id="nobel_coords"></textarea>
					</div>
					<div class="ra-mb15">
						<label for="nobel_count">Nobres por Alvo</label>
						<input id="nobel_count" type="text" value="1">
					</div>
				</div>
				<div class="ra-flex-4">
					<div class="ra-mb15">
						<label for="nuke_coords">Coordenadas de Nukes</label>
						<textarea id="nuke_coords"></textarea>
					</div>
					<div class="ra-mb15">
						<label for="nuke_count">Nukes por Alvo</label>
						<input id="nuke_count" type="text" value="1">
					</div>
				</div>
				<div class="ra-flex-4">
					<div class="ra-mb15">
						<label for="support_coords">Coordenadas de Apoio</label>
						<textarea id="support_coords"></textarea>
					</div>
					<div class="ra-mb15">
						<label for="support_count">Apoios por Alvo</label>
						<input id="support_count" type="text" value="1">
					</div>
				</div>
			</div>
			<div class="ra-mb15">
				<a id="submit_btn" class="button" onClick="handleSubmit();">Gerar Plano!</a>
			</div>
			<div class="ra-mb15">
				<label for="results">Resultados</label>
				<textarea id="results"></textarea>
			</div>
		`;

    const windowContent = prepareWindowContent(content);
    attackPlannerWindow = window.open(
        '',
        '',
        'left=10px,top=10px,width=480,height=670,toolbar=0,resizable=0,location=0,menubar=0,scrollbars=0,status=0'
    );
    attackPlannerWindow.document.write(windowContent);
}

// Helper: Layout da Janela
function prepareWindowContent(windowBody) {
    const windowHeader = `<h1 class="ra-fs18 ra-fw600">${scriptData.name}</h1>`;
    const windowFooter = `<small><strong>${scriptData.name} ${scriptData.version}</strong> - <a href="${scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">${scriptData.author}</a> - <a href="${scriptData.helpLink}" target="_blank" rel="noreferrer noopener">Ajuda</a></small>`;
    const windowStyle = `
		<style>
			body { background-color: #f4e4bc; font-family: Verdana, Arial, sans-serif; font-size: 14px; line-height: 1; }
			main { max-width: 768px; margin: 0 auto; }
			h1 { font-size: 27px; }
			a { font-weight: 700; text-decoration: none; color: #603000; }
			small { font-size: 10px; }
			input[type="text"],
			select { display: block; width: 100%; padding: 5px; border: 1px solid #999; box-sizing: border-box; }
			input[type="text"]:focus,
			textarea:focus { border: 1px solid #603000; background-color: #eee; outline: none; }
			label { font-weight: 600; margin-bottom: 5px; display: block; font-size: 12px; }
			textarea { width: 100%; height: 80px; padding: 5px; resize: none; box-sizing: border-box; }
			.ra-mb15 { margin-bottom: 15px; }
			.ra-flex { display: flex; justify-content: space-between; flex-wrap: wrap; }
			.ra-flex-6 { flex: 0 0 48%; }
			.ra-flex-4 { flex: 0 0 30%; }
			.button { background-color: #603000; color: #fff; padding: 10px 20px; cursor: pointer; display: inline-block; text-transform: uppercase; }
		</style>
	`;

    const html = `
		<!DOCTYPE html>
		<html lang="pt-BR">
		<head>
			<meta charset="UTF-8">
			<title>${scriptData.name} ${scriptData.version}</title>
			${windowStyle}
		</head>
		<body>
			<main>
				${windowHeader}
				${windowBody}
				${windowFooter}
			</main>
			<script>
				function loadJS(url, callback) {
					var scriptTag = document.createElement('script');
					scriptTag.src = url;
					scriptTag.onload = callback;
					document.body.appendChild(scriptTag);
				}

				loadJS('https://code.jquery.com/jquery-3.6.0.min.js', function() {
					loadJS('https://twscripts.dev/scripts/attackPlannerHelper.js', function() {
						console.log('Bibliotecas Carregadas');
					});
				});
			</script>
		</body>
		</html>
	`;

    return html;
}

// Helper: Data/Hora Atual
function getCurrentDateTime() {
    let currentDateTime = new Date();

    var currentYear = currentDateTime.getFullYear();
    var currentMonth = (currentDateTime.getMonth() + 1).toString().padStart(2, '0');
    var currentDate = currentDateTime.getDate().toString().padStart(2, '0');
    var currentHours = currentDateTime.getHours().toString().padStart(2, '0');
    var currentMinutes = currentDateTime.getMinutes().toString().padStart(2, '0');
    var currentSeconds = currentDateTime.getSeconds().toString().padStart(2, '0');

    return `${currentYear}-${currentMonth}-${currentDate} ${currentHours}:${currentMinutes}:${currentSeconds}`;
}

/* Buscar Info das Unidades */
function fetchUnitInfo() {
    jQuery.ajax({
        url: '/interface.php?func=get_unit_info',
    }).done(function (response) {
        unitInfo = xml2json($(response));
        localStorage.setItem(`${LS_PREFIX}_unit_info`, JSON.stringify(unitInfo));
        localStorage.setItem(`${LS_PREFIX}_last_updated`, Date.parse(new Date()));
        init(unitInfo);
    });
}

// XML → JSON
var xml2json = function ($xml) {
    var data = {};
    $.each($xml.children(), function () {
        var $this = $(this);
        if ($this.children().length > 0) {
            data[$this.prop('tagName')] = xml2json($this);
        } else {
            data[$this.prop('tagName')] = $.trim($this.text());
        }
    });
    return data;
};

// Informações do Script
function scriptInfo() {
    return `[${scriptData.name} ${scriptData.version}]`;
}

// Debug
function initDebug() {
    console.debug(`${scriptInfo()} Iniciado`);
    console.debug(`${scriptInfo()} Ajuda:`, scriptData.helpLink);
    if (DEBUG) {
        console.debug(`${scriptInfo()} Mundo:`, game_data.world);
    }
}

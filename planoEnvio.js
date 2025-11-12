/ CONTEÚDO DAS FUNÇÕES DA API DO SCRIPT /;
window.ScriptAPI = {
    calculateTimes: function (landingTime, currentTime, sigil, coord, target, unit) {
        var distance = this.calculateDistance(coord, target);
        var sigilRatio = 1 + Number(sigil) / 100;
        var unitTime = (distance * unit * 60000) / sigilRatio;
        var launchTime = new Date(Math.round((landingTime - unitTime) / 1000) * 1000);
        return launchTime > currentTime && distance > 0 && launchTime;
    },
    calculateDistance: function (from, to) {
        var [x1, y1] = from.split('|');
        var [x2, y2] = to.split('|');
        var deltaX = Math.abs(x1 - x2);
        var deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    secondsToHms: function (timestamp) {
        var $hours = Math.floor(timestamp / 3600);
        var $minutes = Math.floor(timestamp % 3600 / 60);
        var $seconds = Math.floor(timestamp % 60);
        return ('' + $hours).padStart(2, '0') + ':' + ('' + $minutes).padStart(2, '0') + ':' + ('' + $seconds).padStart(2, '0');
    },
    formatDateTime: function ($date) {
        return ('' + $date.getDate()).padStart(2, '0') + '/' + ('' + ($date.getMonth() + 1)).padStart(2, '0') + '/' + $date.getFullYear() + ' ' + ('' + $date.getHours()).padStart(2, '0') + ':' + ('' + $date.getMinutes()).padStart(2, '0') + ':' + ('' + $date.getSeconds()).padStart(2, '0');
    },

    // ------- SALVAR / RESETAR CONFIGURAÇÕES -------
    saveConfig: function() {
        var config = {
            arrival: document.querySelector('.arrival').value,
            sigil: document.querySelector('.sigil').value,
            coordinates: document.querySelector('.coordinates').value,
            targets: document.querySelector('.targets').value,
            unit: document.querySelector('input[name="chosen_units"]:checked').value
        };
        localStorage.setItem("MassPlannerConfig", JSON.stringify(config));
        UI.SuccessMessage("Configurações salvas!");
    },

    resetConfig: function() {
        localStorage.removeItem("MassPlannerConfig");
        document.querySelector('.arrival').value = "";
        document.querySelector('.sigil').value = "";
        document.querySelector('.coordinates').value = "";
        document.querySelector('.targets').value = "";
        document.querySelector('#unit_ram').checked = true;
        UI.SuccessMessage("Configurações resetadas!");
    },

    loadConfig: function() {
        var config = JSON.parse(localStorage.getItem("MassPlannerConfig"));
        if(!config) return;
        document.querySelector('.arrival').value = config.arrival;
        document.querySelector('.sigil').value = config.sigil;
        document.querySelector('.coordinates').value = config.coordinates;
        document.querySelector('.targets').value = config.targets;
        document.querySelector('#unit_' + config.unit).checked = true;
    },
    // ------------------------------------------------

    RequestAPI: function(event) {
        return new Promise(async (resolve) => {
            try {
                window.APIUpdated = {
                    'database': await this.RequestData(), 'units': await this.RequestUnits(),
                };
                UI.SuccessMessage('Base de Dados Atualizada!');
                return resolve();
            } catch (error) {
                return UI.ErrorMessage(
                    `A Base de Dados não foi atualizada!: ${error.message}`
                );
            }
        });
    },
    RequestData: function (event) {
        return $.ajax({url: '/map/village.txt', method: 'GET'}).then($xml => {
            var database = {};
            $xml.split('\n').forEach((lines, i) => {
                const index = lines.split(',');
                database[index[2] + '|' + index[3]] = index[0];
            });
            return database;
        });
    },
    RequestUnits: function (event) {
        return $.get('/interface.php?func=get_unit_info').then(function ($xml) {
            var $units = {};
            $($xml).find('config').children().each(function () {
                $units[this.tagName] = Number(
                    $(this).find('speed').prop('textContent')
                );
            });
            return $units;
        });
    },
    RequestXML: function(event) {
        var columns = [];
        var HTMLCollection = event.closest('tr').cells;
        Array.from(HTMLCollection).slice(1, -3).forEach((el) => columns.push(!el.className.includes('hidden') ? el.textContent : 0));

        // --- ALTERAÇÃO SOLICITADA ---
        var win = window.open('/game.php?village=' + window.APIUpdated.database[columns[0]] + '&screen=place', '_blank');
        win.onload = function () {
            var units = columns.slice(2);
            win.$('.unitsInput').each(function(i) {
                this.value = units[i];
            });
            win.document.querySelector('.target-input-field').value = columns[1];
            win.$("[name=attack]").click(); // <-- botão atacar automático
        };
        // --- FIM DA ALTERAÇÃO ---
    },

    closeScript: function(event) {
        return document.querySelector('.vis.content-border').remove();
    },

    convertToValidFormat: function (timestamp) {
        var [date, time] = timestamp.split(' ');
        var [day, month, year] = date.split('/');
        return year + '-' + month + '-' + day + ' ' + time;
    },

    exportBBCode: function(event) {
        var content = '[table][**]Unidade[||]Origem[||]Destino[||]Hora de Lançamento[||]Enviar[/**]';
        $('.commands-found tr').slice(1).each(function(i) {
            var columns = Array.from(this.cells), village = columns[1].textContent, target = columns[2].textContent, launchTime = columns.slice(-3)[0].textContent;
            var [targetX, targetY] = target.split('|');
            content += '[*][unit]' + ScriptAPI.value + '[/unit] [|] ' + village + ' [|] ' + target + ' [|] ' + launchTime + ' [|] [url=' + window.location.origin + '/game.php?village=' + window.APIUpdated.database[village] + '&screen=' + 'place&x=' + targetX + '&y=' + targetY + '&from=simulator';
            game_data.units.slice(0, -1).forEach((unit, i) => {
                var units = columns.slice(3);
                content += `&att_${unit}=` + (!units[i].className.includes('hidden') ? units[i].textContent : 0)  
            });
            content += ']ENVIAR[/url]';
        });
        content += '[/table]';
        return navigator.clipboard.writeText(content), UI.SuccessMessage('BB Code copiado!');
    },

    initCalculate: function (event) {
        var unformattedTime = $('.server_info')[0].firstElementChild;
        var currentTime = new Date(this.convertToValidFormat(`${unformattedTime.nextElementSibling.innerHTML} ${unformattedTime.innerHTML}`));
        var landingTime = new Date(this.convertToValidFormat(document.querySelector('.arrival').value));
        var sigil = document.querySelector('.sigil').value;

        document.querySelectorAll('textarea').forEach(el => /\d{1,3}\|\d{1,3}/.test(el.value) && (el.value = el.value.match(/(\d{1,3}\|\d{1,3})/g).join(' ')));

        $.ajax({'url': game_data.link_base_pure + 'overview_villages&type=own_home&mode=units&group=0', 'method': 'GET'}).then(($xml) => {
            var realUnits = {}, realCombinations = [], realCoordinates = {};
            this.value = document.querySelector('input:checked').value;
            document.querySelector('.coordinates').value.split(' ').forEach((coord) => realCoordinates[coord] = true);

            $($xml).find('.quickedit-label').each(function (i, coord) {
                if (typeof realCoordinates[coord = this.textContent.match(/(\d{1,3}\|\d{1,3})/)[0]] === 'boolean') {
                    $(this).closest('tr').find('.unit-item').each(function (i, amount) {
                        realUnits[game_data.units[i]] = Number(this.textContent);
                    });

                    const {spear, sword, axe, archer, spy, light, marcher, heavy, ram, catapult, knight, snob} = realUnits; 

                    document.querySelector('.targets').value.split(' ').forEach((target, index) => {
                        (launchTime = ScriptAPI.calculateTimes(landingTime, currentTime, sigil, coord, target, window.APIUpdated.units[ScriptAPI.value])) && realUnits[ScriptAPI.value] && realCombinations.push({
                            'coord': coord, 'target': target, 'spear': spear, 'sword': sword, 'axe': axe, 'archer': archer, 'spy': spy, 'light': light, 'marcher': marcher, 'heavy': heavy, 'ram': ram, 'catapult': catapult, 'knight': knight, 'snob': snob, 'launchTime': launchTime,
                        });
                    }); 
                };
            });

            realCombinations.sort((a, b) => {
                return a.launchTime - b.launchTime;
            });

            realCombinations = realCombinations.slice(0, 500);

            if (!realCombinations.length) {
                UI.ErrorMessage('Nenhuma possibilidade encontrada!');
            } else {
                var innerHTML = '<label><span>&nbsp;' + realCombinations.length + '</span>&nbsp;combinações encontradas</label><div class="container" style="max-height: 300px; overflow: auto"><table width="100%"><thead><tr><th style="text-align: center">#</th><th>Origem</th><th>Destino</th>';
                game_data.units.slice(0, -1).forEach((unit, i) => innerHTML += '<th><label for="unit_' + unit + '"><img src="/graphic/unit/unit_' + unit + '.png"></label></th>');
                innerHTML += '<th>Hora de Lançamento</th><th>Enviar em</th><th style="text-align: center">Enviar</th></tr></thead><tbody>';

                realCombinations.forEach((village, index) => {
                    innerHTML += '<tr><td align="center">' + (index + 1) + '</td><td align="center"><a href="/game.php?village=' + window.APIUpdated.database[village.coord] + '&screen=overview" target="_blank" rel="noopener noreferrer">' + village.coord + '</a></td><td align="center"><a href="' + game_data.link_base_pure + 'info_village&id=' + window.APIUpdated.database[village.target] + '"target="_blank" rel="noopener noreferrer">' + village.target + '</a></td>';
                    game_data.units.slice(0, -1).forEach((unit, i) => {
                        return innerHTML += '<td class="unit-item' + (village[unit] && window.APIUpdated.units[ScriptAPI.value] >= window.APIUpdated.units[unit] ? '' : ' hidden') + '"' + (village[unit] && window.APIUpdated.units[ScriptAPI.value] >= window.APIUpdated.units[unit] ? 'style="background: #C3FFA5"' : '') + '>' + village[unit] + '</td>';
                    });
                    innerHTML += '<td>' + this.formatDateTime(village.launchTime) + '</td><td><span class="timer">' + this.secondsToHms((village.launchTime - currentTime) / 1000) + '</span</td><td align="center"><input type="button" class="btn" style="padding: 3px" onclick="ScriptAPI.RequestXML(this)" value="ENVIAR"></td></tr>';
                }); 
                innerHTML += '</tbody></table></div>'; 
                document.querySelector('.commands-found').innerHTML = innerHTML;

                Timing.tickHandlers.timers.init(); 
                $(window.TribalWars).on('global_tick', function (event) {
                    event = $('#ds_body > div.vis.content-border.ui-draggable.ui-draggable-handle > div.commands-found > div > table > tbody > tr:nth-child(1) > td:nth-child(15) > span'), event.prop('textContent') === '0:00:00' ? event.closest('tr').remove() : event.prop('textContent') === '0:00:10' && TribalWars.playSound('chat');
                });
            }
        });
    },
};

/ CONTEÚDO HTML EM STRING /;
ScriptAPI.stringHTML = '<div class="vis content-border" style="width: 789px; border-radius: 8px 8px 8px 8px; z-index: 7; position: fixed; left: 20%; top: 20%; cursor: move"><div class="close"><a style="position: absolute; top: 5px; right: 10px; z-index: 1; font-size: large" onclick="ScriptAPI.closeScript(this)" href="#">X</a></div><div class="content-title"><table width="100%"><tbody><tr><th style="text-align: center; white-space: nowrap; padding: 6px" colspan="4"><h3 style="margin: 0px">PLANEJADOR DE ATAQUE EM MASSA</h3></th></tr><tr><td align="center"><strong>HORA DE CHEGADA:</strong></td><td><input type="text" class="arrival" style="font-size: 13pt" placeholder="DD/MM/AAAA 00:00:00"></td><td align="center"><strong>SINAL DA AFLIÇÃO: % </strong></td><td><input type="text" class="sigil" style="width: 49px; font-size: 13pt" placeholder="00"></td></tr></tbody></table></div><div class="container"><table width="100%"><thead><tr>';
game_data.units.slice(0, -1).forEach((units, i) => ScriptAPI.stringHTML += '<th><label for="unit_' + units + '"><img src="/graphic/unit/unit_' + units + '.png"></label></th>');
ScriptAPI.stringHTML += '</tr></thead><tbody><tr>';
game_data.units.slice(0, -1).forEach((units, i) => ScriptAPI.stringHTML += '<td><input type="radio" id="unit_' + units + '" name="chosen_units" value="' + units + '"' + (units === 'ram' ? 'checked' : '') + '></td>');
ScriptAPI.stringHTML += '</tr></tbody></table></div><div class="textarea-content"><table width="100%"><thead><tr><th><label for="coordinates"><strong>SUAS ALDEIAS:</strong></label></th></tr></thead><tbody><tr><td><textarea class="coordinates" style="background: none; font-size: 11pt; resize: none; width: 775px; height: 50px;"></textarea></td></tr></tbody><thead><tr><th><label for="targets"><strong>ALDEIAS ALVO:</strong></label></th></tr></thead><tbody><tr><td><textarea class="targets" style="background: none; font-size: 11pt; resize: none; width: 775px; height: 50px;"></textarea></td></tr></tbody></table></div><div class="action-content"><input type="button" class="btn" style="margin: 4px; margin-top: auto" onclick="ScriptAPI.initCalculate(this)" value="CALCULAR TEMPOS"><input type="button" class="btn" style="margin: 4px; margin-top: auto" onclick="ScriptAPI.exportBBCode(this)" value="EXPORTAR BB CODE"><input type="button" class="btn" style="margin: 4px; margin-top: auto" onclick="ScriptAPI.saveConfig()" value="SALVAR"><input type="button" class="btn" style="margin: 4px; margin-top: auto" onclick="ScriptAPI.resetConfig()" value="RESETAR"></div><div class="commands-found"></div></div>';

$(document.body).append(ScriptAPI.stringHTML);
$('.vis.content-border').draggable();

// carregar configs ao abrir
ScriptAPI.loadConfig();

/ BASE DE DADOS E UNIDADES ATUALIZADAS (1X POR HORA) /;
var updatedTime = Date.now();
var APIUpdated = JSON.parse(localStorage.getItem('APIUpdated'));
(!APIUpdated || APIUpdated.lastUpdated + (3600 * 1000) <= updatedTime) && this.ScriptAPI.RequestAPI().then(event => {
    var contentUpdated = {
        'lastUpdated': this.updatedTime, 'database': this.APIUpdated.database, 'units': this.APIUpdated.units,
    };
    return localStorage.setItem('APIUpdated', JSON.stringify(contentUpdated))
});

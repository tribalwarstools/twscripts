javascript:
(function () {
    const win = window.frames.length > 0 ? window.main : window;
    const data = win.game_data;

    if (data.screen !== 'place') {
        location.search = `?village=${data.village.id}&screen=place`;
        return;
    }

    const availableUnits = [
        'spear', 'sword', 'axe', 'archer', 'spy', 'light',
        'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'
    ];

    const containerId = 'attack-interface-container';
    if (document.getElementById(containerId)) return;

    const form = document.createElement('div');
    form.id = containerId;
    form.style = 'position:fixed;top:100px;left:50%;transform:translateX(-50%);background:#f4e4bc;border:2px solid #603000;padding:15px;z-index:9999;font-family:Verdana;font-size:12px;';

    let html = '<h3 style="margin-top:0">Planejador de Ataque</h3>';
    html += '<label>Coordenadas (ex: 500|500):<br><input id="coords" type="text" style="width:100%;margin-bottom:10px;"></label>';

    availableUnits.forEach(unit => {
        if (win.$(`input[name=${unit}]`).length > 0) {
            html += `<label>${unit}: <input id="unit_${unit}" type="number" min="0" value="0" style="width:60px;"></label><br>`;
        }
    });

    html += '<button id="sendAttack" style="margin-top:10px;">Enviar Ataque</button>';
    html += '<button id="closeInterface" style="margin-left:10px;">Fechar</button>';

    form.innerHTML = html;
    document.body.appendChild(form);

    document.getElementById('sendAttack').addEventListener('click', () => {
        const coords = document.getElementById('coords').value.trim();
        if (!coords.match(/^\d{3}\|\d{3}$/)) {
            alert('Coordenadas inválidas!');
            return;
        }

        const [x, y] = coords.split('|');
        win.$('input[name=x]').val(x);
        win.$('input[name=y]').val(y);

        availableUnits.forEach(unit => {
            const input = document.getElementById(`unit_${unit}`);
            if (input && win.$(`input[name=${unit}]`).length > 0) {
                win.$(`input[name=${unit}]`).val(parseInt(input.value) || 0);
            }
        });

        win.$('input[name=attack]').click();
    });

    document.getElementById('closeInterface').addEventListener('click', () => {
        document.getElementById(containerId).remove();
    });
})();
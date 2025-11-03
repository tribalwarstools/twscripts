// ==UserScript==
// @name         TW - Buscar aldeias por faixa de raio (Multiserver + Autocomplete + Reset + Link)
// @namespace    https://tribalwars/
// @version      4.1
// @description  Busca aldeias dentro de uma faixa de raio (mínimo e máximo), podendo filtrar por tipo, jogador, e copiar coordenadas encontradas. Compatível com qualquer servidor (EN, BR, etc.).
// @match        *://*.tribalwars.*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const parseCoords = str => {
    const m = str.match(/(\d{1,3})\|(\d{1,3})/);
    return m ? { x: +m[1], y: +m[2] } : null;
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const copyToClipboard = text => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  };

  // === Corrigido para qualquer domínio ===
  function getMapUrl(filename) {
    const world = game_data.world;
    const host = location.host; // ex: en145.tribalwars.net, br131.tribalwars.com.br
    return `https://${host.replace(/^www\./, '')}/map/${filename}`;
  }

  async function carregarVillageTxt() {
    try {
      const res = await fetch(getMapUrl('village.txt'));
      const txt = await res.text();
      return txt.split('\n').map(l => {
        const p = l.split(',');
        if (p.length < 6) return null;
        return { id: p[0], name: p[1], x: +p[2], y: +p[3], playerId: p[4] };
      }).filter(Boolean);
    } catch (e) {
      UI.ErrorMessage('Erro ao carregar village.txt');
      console.error(e);
      return [];
    }
  }

  async function carregarPlayerTxt() {
    try {
      const res = await fetch(getMapUrl('player.txt'));
      const txt = await res.text();
      return txt.split('\n').map(l => {
        const p = l.split(',');
        if (p.length < 2) return null;
        return { id: p[0], name: decodeURIComponent(p[1].replace(/\+/g, ' ')) };
      }).filter(Boolean);
    } catch (e) {
      UI.ErrorMessage('Erro ao carregar player.txt');
      console.error(e);
      return [];
    }
  }

  async function abrirPainel() {
    const saved = JSON.parse(localStorage.getItem('twRadiusConfig') || '{}');
    const coordAtual = game_data.village.coord || '';

    const html = `
      <div style="font-size:13px;color:#333;margin-bottom:10px">
        <label><b>Coord. base:</b></label>
        <input type="text" id="coordInput" placeholder="Ex: 500|500" value="${saved.coord || coordAtual}" style="width:80px;text-align:center;margin-left:5px">
      </div>

      <div style="margin-bottom:10px">
        <label><b>Campos:</b></label>
        <input type="number" id="radiusMinInput" min="0" value="${saved.raioMin ?? 0}" style="width:60px;text-align:center;margin-left:5px">
        até
        <input type="number" id="radiusMaxInput" min="1" value="${saved.raioMax ?? 10}" style="width:60px;text-align:center">
      </div>

      <div style="margin-bottom:10px">
        <label><b>Tipo de busca:</b></label><br>
        <label><input type="radio" name="tipoBusca" value="minhas" ${saved.tipo === 'minhas' || !saved.tipo ? 'checked' : ''}> Minhas aldeias</label><br>
        <label><input type="radio" name="tipoBusca" value="barbaras" ${saved.tipo === 'barbaras' ? 'checked' : ''}> Aldeias bárbaras</label><br>
        <label><input type="radio" name="tipoBusca" value="jogador" ${saved.tipo === 'jogador' ? 'checked' : ''}> Jogador específico:</label><br>
        <input type="text" id="playerNameInput" list="playerList" placeholder="Nome do jogador" value="${saved.player || ''}" style="width:180px;margin-top:5px">
        <datalist id="playerList"></datalist>
      </div>

      <div style="margin-bottom:10px; text-align:center;">
        <button class="btn" id="searchBtn">Buscar</button>
        <button class="btn" id="copyCsvBtn" disabled>Copiar</button>
        <button class="btn" id="saveDialogBtn">Salvar</button>
        <button class="btn" id="resetBtn" style="background:#f66;color:#fff">Resetar</button>
      </div>

      <hr>

      <div id="radiusResults" style="max-height:380px;overflow:auto;border:1px solid #ccc;padding:4px;background:#fdfaf5">
        <i>Nenhuma busca realizada ainda.</i>
      </div>
    `;

    Dialog.show('radius_search', html);

    const players = await carregarPlayerTxt();
    const dataList = document.querySelector('#playerList');
    players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      dataList.appendChild(opt);
    });

    document.querySelector('#searchBtn').addEventListener('click', () => executarBusca(players));
    document.querySelector('#copyCsvBtn').addEventListener('click', copiarCoords);
    document.querySelector('#saveDialogBtn').addEventListener('click', salvarConfiguracao);
    document.querySelector('#resetBtn').addEventListener('click', resetarConfiguracao);
  }

  function salvarConfiguracao() {
    const config = {
      coord: document.querySelector('#coordInput').value.trim(),
      raioMin: document.querySelector('#radiusMinInput').value,
      raioMax: document.querySelector('#radiusMaxInput').value,
      tipo: document.querySelector('input[name="tipoBusca"]:checked').value,
      player: document.querySelector('#playerNameInput').value.trim()
    };
    localStorage.setItem('twRadiusConfig', JSON.stringify(config));
    UI.SuccessMessage('Configurações salvas com sucesso.');
  }

  function resetarConfiguracao() {
    localStorage.removeItem('twRadiusConfig');
    document.querySelector('#coordInput').value = game_data.village.coord || '';
    document.querySelector('#radiusMinInput').value = 0;
    document.querySelector('#radiusMaxInput').value = 10;
    document.querySelector('input[value="minhas"]').checked = true;
    document.querySelector('#playerNameInput').value = '';
    UI.InfoMessage('Configuração resetada para o padrão.');
  }

  async function executarBusca(players) {
    const coordStr = document.querySelector('#coordInput').value.trim();
    const radiusMin = parseFloat(document.querySelector('#radiusMinInput').value);
    const radiusMax = parseFloat(document.querySelector('#radiusMaxInput').value);
    const tipo = document.querySelector('input[name="tipoBusca"]:checked').value;
    const playerName = document.querySelector('#playerNameInput').value.trim();

    const origin = parseCoords(coordStr);
    if (!origin) return UI.ErrorMessage('Digite uma coordenada válida (ex: 500|500).');
    if (isNaN(radiusMax) || radiusMax <= 0) return UI.ErrorMessage('Digite um raio máximo válido.');
    if (radiusMin >= radiusMax) return UI.ErrorMessage('O raio mínimo deve ser menor que o máximo.');

    UI.InfoMessage('Carregando aldeias...');
    const villages = await carregarVillageTxt();
    let alvo = [];

    if (tipo === 'minhas') {
      const player = players.find(p => p.name === game_data.player.name);
      if (!player) return UI.ErrorMessage('Não foi possível identificar seu jogador.');
      alvo = villages.filter(v => v.playerId === player.id);
    }

    if (tipo === 'barbaras') alvo = villages.filter(v => v.playerId === '0');
    if (tipo === 'jogador') {
      const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (!player) return UI.ErrorMessage('Jogador não encontrado.');
      alvo = villages.filter(v => v.playerId === player.id);
    }

    let results = alvo.map(v => ({ ...v, distance: dist(origin, v) }));
    results = results.filter(v => v.distance >= radiusMin && v.distance <= radiusMax);

    results.sort((a, b) => a.distance - b.distance);
    atualizarTabela(results, radiusMin, radiusMax);
  }

  function atualizarTabela(results, min, max) {
    const div = document.querySelector('#radiusResults');
    if (!results.length) {
      div.innerHTML = `<i>Nenhuma aldeia encontrada entre ${min} e ${max} campos.</i>`;
      document.querySelector('#copyCsvBtn').disabled = true;
      return;
    }

    div.innerHTML = `
      <div style="margin-bottom:6px">
        <b>${results.length}</b> aldeias encontradas entre <b>${min}</b> e <b>${max}</b> campos.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center">
        <thead>
          <tr style="background:#ddd;font-weight:bold">
            <th style="border:1px solid #aaa;padding:4px">Coordenadas</th>
            <th style="border:1px solid #aaa;padding:4px">Distância</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(v => `
            <tr>
              <td style="border:1px solid #ccc;padding:3px">
                <a href="/game.php?village=${game_data.village.id}&screen=info_village&id=${v.id}" target="_blank" style="text-decoration:none;color:#0055cc">
                  ${v.x}|${v.y}
                </a>
              </td>
              <td style="border:1px solid #ccc;padding:3px">${v.distance.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelector('#copyCsvBtn').disabled = false;
    sessionStorage.setItem('twRadiusCoords', JSON.stringify(results));
  }

  function copiarCoords() {
    const coords = JSON.parse(sessionStorage.getItem('twRadiusCoords') || '[]');
    if (!coords.length) return;
    const list = coords.map(c => `${c.x}|${c.y}`).join(' ');
    copyToClipboard(list);
    UI.InfoMessage('Coordenadas copiadas (em linha) para a área de transferência.');
  }

  abrirPainel();
})();

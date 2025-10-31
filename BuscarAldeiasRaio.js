// ==UserScript==
// @name         TW - Buscar aldeias por raio (Autocomplete Jogador + Reset + Link + Exato + Botões Laterais)
// @namespace    https://tribalwars/
// @version      3.9
// @description  Busca aldeias dentro de um raio (suas, bárbaras ou de um jogador específico) com opção de exibir apenas as que estão exatamente no raio configurado. Agora com botões Copiar, Salvar e Resetar ao lado do Buscar.
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

  async function carregarVillageTxt() {
    try {
      const world = game_data.world;
      const res = await fetch(`https://${world}.tribalwars.com.br/map/village.txt`);
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
      const world = game_data.world;
      const res = await fetch(`https://${world}.tribalwars.com.br/map/player.txt`);
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
        <label><b>Coordenada base:</b></label>
        <input type="text" id="coordInput" placeholder="Ex: 500|500" value="${saved.coord || coordAtual}" style="width:80px;text-align:center;margin-left:5px">
      </div>

      <div style="margin-bottom:10px">
        <label><b>Raio (campos):</b></label>
        <input type="number" id="radiusInput" min="1" value="${saved.raio || 10}" style="width:70px;text-align:center;margin-left:5px">
        <label style="margin-left:10px;">
          <input type="checkbox" id="exatoCheck" ${saved.exato ? 'checked' : ''}> Exibir exatamente no raio
        </label>
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
      raio: document.querySelector('#radiusInput').value,
      tipo: document.querySelector('input[name="tipoBusca"]:checked').value,
      player: document.querySelector('#playerNameInput').value.trim(),
      exato: document.querySelector('#exatoCheck').checked
    };
    localStorage.setItem('twRadiusConfig', JSON.stringify(config));
    UI.SuccessMessage('Configurações salvas com sucesso.');
  }

  function resetarConfiguracao() {
    localStorage.removeItem('twRadiusConfig');
    document.querySelector('#coordInput').value = game_data.village.coord || '';
    document.querySelector('#radiusInput').value = 10;
    document.querySelector('#exatoCheck').checked = false;
    document.querySelector('input[value="minhas"]').checked = true;
    document.querySelector('#playerNameInput').value = '';
    UI.InfoMessage('Configuração resetada para o padrão.');
  }

  async function executarBusca(players) {
    const coordStr = document.querySelector('#coordInput').value.trim();
    const radius = parseFloat(document.querySelector('#radiusInput').value);
    const tipo = document.querySelector('input[name="tipoBusca"]:checked').value;
    const playerName = document.querySelector('#playerNameInput').value.trim();
    const exato = document.querySelector('#exatoCheck').checked;

    const origin = parseCoords(coordStr);
    if (!origin) return UI.ErrorMessage('Digite uma coordenada válida (ex: 500|500).');
    if (isNaN(radius) || radius <= 0) return UI.ErrorMessage('Digite um raio válido.');

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

    if (exato)
      results = results.filter(v => Math.abs(v.distance - radius) < 0.01);
    else
      results = results.filter(v => v.distance <= radius);

    results.sort((a, b) => a.distance - b.distance);
    atualizarTabela(results, radius, exato);
  }

  function atualizarTabela(results, radius, exato) {
    const div = document.querySelector('#radiusResults');
    if (!results.length) {
      div.innerHTML = `<i>Nenhuma aldeia encontrada ${exato ? 'exatamente' : 'dentro de'} ${radius} campos.</i>`;
      document.querySelector('#copyCsvBtn').disabled = true;
      return;
    }

    div.innerHTML = `
      <div style="margin-bottom:6px">
        <b>${results.length}</b> aldeias encontradas ${exato ? 'exatamente' : 'dentro de'} <b>${radius}</b> campos.
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

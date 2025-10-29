// ==UserScript==
// @name         TW - Buscar aldeias por raio (Autocomplete Jogador)
// @namespace    https://tribalwars/
// @version      3.2
// @description  Busca aldeias dentro de um raio (suas, bárbaras ou de um jogador específico) com autocompletar de nome de jogador, usando village.txt e player.txt.
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
    const html = `
      <div style="font-size:13px;color:#333;margin-bottom:10px">
        <label><b>Coordenada base:</b></label>
        <input type="text" id="coordInput" placeholder="Ex: 500|500" style="width:80px;text-align:center;margin-left:5px">
      </div>

      <div style="margin-bottom:10px">
        <label><b>Raio (campos):</b></label>
        <input type="number" id="radiusInput" min="1" value="10" style="width:70px;text-align:center;margin-left:5px">
      </div>

      <div style="margin-bottom:10px">
        <label><b>Tipo de busca:</b></label><br>
        <label><input type="radio" name="tipoBusca" value="minhas" checked> Minhas aldeias</label><br>
        <label><input type="radio" name="tipoBusca" value="barbaras"> Aldeias bárbaras</label><br>
        <label><input type="radio" name="tipoBusca" value="jogador"> Jogador específico:</label><br>
        <input type="text" id="playerNameInput" list="playerList" placeholder="Nome do jogador" style="width:180px;margin-top:5px">
        <datalist id="playerList"></datalist>
      </div>

      <button class="btn" id="searchBtn">Buscar</button>
      <hr>
      <div id="radiusResults" style="max-height:380px;overflow:auto;border:1px solid #ccc;padding:4px;background:#fdfaf5">
        <i>Nenhuma busca realizada ainda.</i>
      </div>

      <br>
      <center>
        <button class="btn" id="copyCsvBtn" disabled>Copiar coordenadas</button>
        <button class="btn" id="closeDialogBtn">Fechar</button>
      </center>
    `;

    Dialog.show('radius_search', html);

    // Carrega os jogadores para autocomplete
    const players = await carregarPlayerTxt();
    const dataList = document.querySelector('#playerList');
    players.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      dataList.appendChild(opt);
    });

    document.querySelector('#searchBtn').addEventListener('click', () => executarBusca(players));
    document.querySelector('#copyCsvBtn').addEventListener('click', copiarCoords);
    document.querySelector('#closeDialogBtn').addEventListener('click', () => Dialog.close('radius_search'));
  }

  async function executarBusca(players) {
    const coordStr = document.querySelector('#coordInput').value.trim();
    const radius = parseFloat(document.querySelector('#radiusInput').value);
    const tipo = document.querySelector('input[name="tipoBusca"]:checked').value;
    const playerName = document.querySelector('#playerNameInput').value.trim();

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

    if (tipo === 'barbaras') {
      alvo = villages.filter(v => v.playerId === '0');
    }

    if (tipo === 'jogador') {
      const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (!player) return UI.ErrorMessage('Jogador não encontrado.');
      alvo = villages.filter(v => v.playerId === player.id);
    }

    const results = alvo
      .map(v => ({ ...v, distance: dist(origin, v) }))
      .filter(v => v.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    atualizarTabela(results, radius);
  }

  function atualizarTabela(results, radius) {
    const div = document.querySelector('#radiusResults');
    if (!results.length) {
      div.innerHTML = `<i>Nenhuma aldeia encontrada dentro de ${radius} campos.</i>`;
      document.querySelector('#copyCsvBtn').disabled = true;
      return;
    }

    div.innerHTML = `
      <div style="margin-bottom:6px">
        <b>${results.length}</b> aldeias encontradas dentro de <b>${radius}</b> campos.
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
              <td style="border:1px solid #ccc;padding:3px">${v.x}|${v.y}</td>
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
    const list = coords.map(c => `${c.x}|${c.y}`).join('\n');
    copyToClipboard(list);
    UI.InfoMessage('Coordenadas copiadas para a área de transferência.');
  }

  abrirPainel();
})();

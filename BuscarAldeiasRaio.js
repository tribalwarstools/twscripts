// ==UserScript==
// @name         TW - Buscar aldeias por raio (Simplificado)
// @namespace    https://tribalwars/
// @version      3.1
// @description  Busca aldeias dentro de um raio (suas, bárbaras ou de um jogador específico) a partir de uma coordenada base, usando village.txt e player.txt. Exibe apenas coordenadas e distância.
// @match        *://*.tribalwars.*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const parseCoords = str => {
    const m = str.match(/(\d{1,3})\|(\d{1,3})/);
    if (!m) return null;
    return { x: parseInt(m[1]), y: parseInt(m[2]) };
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
      const url = `https://${world}.tribalwars.com.br/map/village.txt`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao baixar village.txt');
      const txt = await res.text();
      return txt.split('\n').map(l => {
        const p = l.split(',');
        if (p.length < 6) return null;
        return {
          id: p[0],
          name: p[1],
          x: parseInt(p[2]),
          y: parseInt(p[3]),
          playerId: p[4]
        };
      }).filter(Boolean);
    } catch (e) {
      UI.ErrorMessage('Falha ao carregar village.txt');
      console.error(e);
      return [];
    }
  }

  async function carregarPlayerTxt() {
    try {
      const world = game_data.world;
      const url = `https://${world}.tribalwars.com.br/map/player.txt`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao baixar player.txt');
      const txt = await res.text();
      return txt.split('\n').map(l => {
        const p = l.split(',');
        if (p.length < 2) return null;
        return { id: p[0], name: p[1] };
      }).filter(Boolean);
    } catch (e) {
      UI.ErrorMessage('Falha ao carregar player.txt');
      console.error(e);
      return [];
    }
  }

  function abrirPainel() {
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
        <label><input type="radio" name="tipoBusca" value="jogador"> Jogador específico:</label>
        <input type="text" id="playerNameInput" placeholder="Nome do jogador" style="width:160px;margin-left:5px">
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

    document.querySelector('#searchBtn').addEventListener('click', executarBusca);
    document.querySelector('#copyCsvBtn').addEventListener('click', copiarCoords);
    document.querySelector('#closeDialogBtn').addEventListener('click', () => Dialog.close('radius_search'));
  }

  async function executarBusca() {
    const coordStr = document.querySelector('#coordInput').value.trim();
    const radius = parseFloat(document.querySelector('#radiusInput').value);
    const tipo = document.querySelector('input[name="tipoBusca"]:checked').value;
    const playerName = document.querySelector('#playerNameInput').value.trim();

    const origin = parseCoords(coordStr);
    if (!origin) return UI.ErrorMessage('Digite uma coordenada válida (ex: 500|500).');
    if (isNaN(radius) || radius <= 0) return UI.ErrorMessage('Digite um raio válido.');

    UI.InfoMessage('Carregando village.txt e player.txt...');
    const [villages, players] = await Promise.all([carregarVillageTxt(), carregarPlayerTxt()]);

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
      if (!player) return UI.ErrorMessage('Jogador não encontrado no arquivo player.txt.');
      alvo = villages.filter(v => v.playerId === player.id);
    }

    if (!alvo.length) {
      UI.ErrorMessage('Nenhuma aldeia correspondente encontrada.');
      return;
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

    let tabela = `
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

    div.innerHTML = tabela;
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

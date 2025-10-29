// ==UserScript==
// @name         TW - Buscar aldeias por raio (Usando village.txt)
// @namespace    https://tribalwars/
// @version      2.0
// @description  Busca suas aldeias dentro de um raio a partir do arquivo village.txt e exibe tabela com coordenadas e distância.
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

  const getCurrentVillageCoord = () => {
    if (window.game_data?.village?.coord) {
      const c = parseCoords(game_data.village.coord);
      if (c) return c;
    }
    const manual = prompt('Não consegui detectar a aldeia atual. Digite as coordenadas (ex: 123|456):');
    return manual ? parseCoords(manual) : null;
  };

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
      const world = game_data.world; // exemplo: br123
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
        return {
          id: p[0],
          name: p[1]
        };
      }).filter(Boolean);
    } catch (e) {
      UI.ErrorMessage('Falha ao carregar player.txt');
      console.error(e);
      return [];
    }
  }

  const abrirPainel = () => {
    const origin = getCurrentVillageCoord();
    if (!origin) {
      UI.ErrorMessage('Não foi possível detectar a aldeia atual.');
      return;
    }

    const html = `
      <div style="font-size:13px;color:#333;margin-bottom:10px">
        <b>Aldeia atual:</b> ${origin.x}|${origin.y}
      </div>

      <div style="margin-bottom:10px">
        <label><b>Raio:</b></label>
        <input type="number" id="radiusInput" min="1" value="10" style="width:80px;margin-left:5px;text-align:center">
        <button class="btn" id="searchBtn">Buscar</button>
      </div>

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

    document.querySelector('#searchBtn').addEventListener('click', async () => {
      const radius = parseFloat(document.querySelector('#radiusInput').value);
      if (isNaN(radius) || radius <= 0) {
        UI.ErrorMessage('Digite um raio válido.');
        return;
      }

      UI.InfoMessage('Carregando village.txt e player.txt, aguarde...');
      const [villages, players] = await Promise.all([
        carregarVillageTxt(),
        carregarPlayerTxt()
      ]);

      const player = players.find(p => p.name === game_data.player.name);
      if (!player) {
        UI.ErrorMessage('Não foi possível identificar seu jogador no arquivo player.txt.');
        return;
      }

      const minhas = villages.filter(v => v.playerId === player.id);
      if (!minhas.length) {
        UI.ErrorMessage('Nenhuma aldeia sua encontrada no village.txt.');
        return;
      }

      const results = minhas
        .map(v => ({ ...v, distance: dist(origin, v) }))
        .filter(v => v.distance <= radius && !(v.x === origin.x && v.y === origin.y))
        .sort((a, b) => a.distance - b.distance);

      atualizarTabela(results, origin, radius);
    });

    document.querySelector('#copyCsvBtn').addEventListener('click', () => {
      const coords = JSON.parse(sessionStorage.getItem('twRadiusCoords') || '[]');
      if (!coords.length) return;
      const list = coords.map(c => `${c.x}|${c.y}`).join('\n');
      copyToClipboard(list);
      UI.InfoMessage('Coordenadas copiadas para a área de transferência.');
    });

    document.querySelector('#closeDialogBtn').addEventListener('click', () => {
      Dialog.close('radius_search');
    });
  };

  const atualizarTabela = (results, origin, radius) => {
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
  };

  abrirPainel();
})();

// ==UserScript==
// @name         Alcance da Igreja - Tribal Wars
// @version      1.1
// @description  Mostra alcance da Igreja (4, 6, 8 quadrantes) no mapa e minimapa do Tribal Wars com painel visual
// @author       ChatGPT
// @match        https://*.tribalwars.*/*map*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const churchRadius = [4, 6, 8]; // Níveis 1, 2, 3
  let churchData = JSON.parse(localStorage.getItem("churchData") || "[]");

  const css = `
    <style id="church-style">
      .church-panel {
        background: #202225;
        color: white;
        padding: 10px;
        margin: 10px 0;
        border-radius: 6px;
        font-family: Verdana, sans-serif;
        width: fit-content;
      }
      .church-panel textarea {
        width: 300px;
        height: 100px;
        margin-top: 5px;
        font-family: monospace;
      }
      .church-panel button {
        margin: 5px 5px 0 0;
      }
    </style>
  `;

  const html = `
    <div class="church-panel">
      <b>Configurar Igrejas (formato: 500|500 2):</b><br>
      <textarea id="church-coords" placeholder="500|500 2\n501|501 3"></textarea><br>
      <button id="church-load">Carregar</button>
      <button id="church-save">Salvar</button>
      <button id="church-clear">Limpar</button>
    </div>
  `;

  function waitForMapContainer(callback) {
    const interval = setInterval(() => {
      const container = document.querySelector("#map_container");
      if (container && typeof TWMap !== "undefined") {
        clearInterval(interval);
        callback(container);
      }
    }, 200);
  }

  function parseInput(text) {
    return text.split(/\n/).map(line => {
      const match = line.trim().match(/^(\d{3})\|(\d{3})\s+([1-3])$/);
      if (match) {
        return { village: `${match[1]}|${match[2]}`, church: parseInt(match[3], 10) };
      }
    }).filter(Boolean);
  }

  function drawChurchMap() {
    $("canvas.church-map").remove();
    const map = TWMap;
    const scale = map.map.scale;
    const sectorSize = map.map.sectorSize;

    for (const key in map.map._sectors) {
      const sector = map.map._sectors[key];
      const [sx, sy] = [sector.x, sector.y];

      const canvas = document.createElement("canvas");
      canvas.width = scale[0] * sectorSize;
      canvas.height = scale[1] * sectorSize;
      canvas.className = "church-map";
      canvas.style.position = "absolute";
      canvas.style.zIndex = 10;

      const ctx = canvas.getContext("2d");

      for (const { village, church } of churchData) {
        const [vx, vy] = village.split("|").map(Number);
        const pixel = map.map.pixelByCoord(vx, vy);
        const sectorPixel = map.map.pixelByCoord(sx, sy);
        const x = (pixel[0] - sectorPixel[0]) + scale[0] / 2;
        const y = (pixel[1] - sectorPixel[1]) + scale[1] / 2;
        const radius = churchRadius[church - 1] * scale[0];

        ctx.beginPath();
        ctx.strokeStyle = '#1f9eff';
        ctx.fillStyle = 'rgba(31, 158, 255, 0.2)';
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }

      sector.appendElement(canvas, 0, 0);
    }

    drawChurchMiniMap();
  }

  function drawChurchMiniMap() {
    $("canvas.church-topo").remove();
    const minimap = TWMap.minimap;

    for (const key in minimap._loadedSectors) {
      const sector = minimap._loadedSectors[key];
      const canvas = document.createElement("canvas");
      canvas.width = 250;
      canvas.height = 250;
      canvas.className = "church-topo";
      canvas.style.position = "absolute";
      canvas.style.zIndex = 11;

      const ctx = canvas.getContext("2d");

      for (const { village, church } of churchData) {
        const [vx, vy] = village.split("|").map(Number);
        const x = (vx - sector.x) * 5 + 3;
        const y = (vy - sector.y) * 5 + 3;
        const radius = churchRadius[church - 1] * 5;

        ctx.beginPath();
        ctx.strokeStyle = '#1f9eff';
        ctx.fillStyle = 'rgba(31, 158, 255, 0.2)';
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }

      sector.appendElement(canvas, 0, 0);
    }
  }

  waitForMapContainer(container => {
    $("head").append(css);
    $(container).before(html);

    // Preencher textarea com dados salvos (opcional)
    if (churchData.length) {
      const text = churchData.map(e => `${e.village} ${e.church}`).join("\n");
      $("#church-coords").val(text);
      drawChurchMap();
    }

    $("#church-load").on("click", () => {
      const input = $("#church-coords").val();
      churchData = parseInput(input);
      drawChurchMap();
    });

    $("#church-save").on("click", () => {
      const input = $("#church-coords").val();
      churchData = parseInput(input);
      localStorage.setItem("churchData", JSON.stringify(churchData));
      drawChurchMap();
    });

    $("#church-clear").on("click", () => {
      localStorage.removeItem("churchData");
      churchData = [];
      drawChurchMap();
      $("#church-coords").val("");
    });
  });
})();

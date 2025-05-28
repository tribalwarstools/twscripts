// ==UserScript==
// @name         Raio da Igreja - Tribal Wars
// @version      1.0
// @description  Mostra o alcance da Igreja no mapa e minimapa com raio visual
// @author       Adaptado por ChatGPT
// @match        https://*.tribalwars.*/*map*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  window.churchData = JSON.parse(localStorage.getItem("churchData") || "[]");
  window.churchRadius = [4, 6, 8]; // Nível 1, 2, 3

  // Estilo visual
  const css = `
    <style>
      .church-panel {
        background: #202225;
        color: white;
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 6px;
        font-family: Verdana, sans-serif;
      }
      .church-panel input {
        margin: 3px;
      }
    </style>`;
  $("head").append(css);

  // Painel de controle
  const html = `
    <div class="church-panel">
      <strong>Igrejas (formato: 500|500 - nível 1 a 3):</strong><br>
      <textarea id="church-coords" rows="6" cols="30" placeholder="500|500 2\n501|501 3"></textarea><br>
      <button id="church-load">Carregar</button>
      <button id="church-save">Salvar</button>
      <button id="church-clear">Limpar</button>
    </div>`;
  $("#map_container").before(html);

  // Funções utilitárias
  function parseInput(text) {
    const lines = text.trim().split(/[\n,]+/);
    return lines.map(line => {
      const match = line.trim().match(/(\d{3})\|(\d{3})\s+(\d)/);
      if (match) {
        const village = `${match[1]}|${match[2]}`;
        const church = parseInt(match[3], 10);
        return { village, church };
      }
      return null;
    }).filter(Boolean);
  }

  function drawChurchMap() {
    const overlayClass = "church_map_canvas";
    $("canvas." + overlayClass).remove();

    const map = TWMap;
    const scale = map.map.scale;
    const sectorSize = map.map.sectorSize;

    for (const sectorKey in map.map._sectors) {
      const sector = map.map._sectors[sectorKey];
      const [sx, sy] = [sector.x, sector.y];

      const canvas = document.createElement("canvas");
      canvas.width = scale[0] * sectorSize;
      canvas.height = scale[1] * sectorSize;
      canvas.className = overlayClass;
      canvas.style.position = "absolute";
      canvas.style.zIndex = 10;

      const ctx = canvas.getContext("2d");

      for (const { village, church } of window.churchData) {
        const [vx, vy] = village.split("|").map(Number);
        const pixel = map.map.pixelByCoord(vx, vy);
        const sectorPixel = map.map.pixelByCoord(sx, sy);
        const x = (pixel[0] - sectorPixel[0]) + scale[0] / 2;
        const y = (pixel[1] - sectorPixel[1]) + scale[1] / 2;
        const radius = window.churchRadius[church - 1] * scale[0];

        ctx.beginPath();
        ctx.strokeStyle = '#0055FF';
        ctx.fillStyle = 'rgba(0, 85, 255, 0.2)';
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }

      sector.appendElement(canvas, 0, 0);
    }

    drawChurchMiniMap(); // <- Chamar também o minimapa
  }

  function drawChurchMiniMap() {
    const overlayClass = "church_topo_canvas";
    const minimap = TWMap.minimap;

    $("canvas." + overlayClass).remove();

    for (let key in minimap._loadedSectors) {
      const sector = minimap._loadedSectors[key];

      const canvas = document.createElement("canvas");
      canvas.width = 250;
      canvas.height = 250;
      canvas.className = overlayClass;
      canvas.style.position = "absolute";
      canvas.style.zIndex = 11;

      const ctx = canvas.getContext("2d");

      for (const { village, church } of window.churchData) {
        const [vx, vy] = village.split("|").map(Number);
        const x = (vx - sector.x) * 5 + 3;
        const y = (vy - sector.y) * 5 + 3;
        const radius = window.churchRadius[church - 1] * 5;

        ctx.beginPath();
        ctx.strokeStyle = '#0055FF';
        ctx.fillStyle = 'rgba(0, 85, 255, 0.2)';
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
      }

      sector.appendElement(canvas, 0, 0);
    }
  }

  // Eventos
  $("#church-load").on("click", () => {
    const text = $("#church-coords").val();
    window.churchData = parseInput(text);
    drawChurchMap();
  });

  $("#church-save").on("click", () => {
    const text = $("#church-coords").val();
    window.churchData = parseInput(text);
    localStorage.setItem("churchData", JSON.stringify(window.churchData));
    drawChurchMap();
  });

  $("#church-clear").on("click", () => {
    localStorage.removeItem("churchData");
    window.churchData = [];
    drawChurchMap();
  });

  // Inicialização automática
  if (window.churchData.length > 0) {
    drawChurchMap();
  }
})();

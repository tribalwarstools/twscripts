javascript:(function () {
  const units = {
    spear: [10, 0], sword: [10, 0], axe: [0, 0], archer: [0, 0],
    spy: [0, 0], light: [0, 0], marcher: [0, 0], heavy: [0, 0],
    ram: [0, 0], catapult: [0, 0], knight: [0, 0], snob: [0, 0]
  };
  const options = {
    coords: "770|593 774|591 773|597 775|588 769|598 770|601 774|589 771|601 778|592 780|593 778|601 780|591 777|605 771|598 773|601 782|596 774|596 777|597 781|593 774|600 783|596 773|604 779|597 782|590 786|592 777|589 784|601 785|602 784|599 786|591 783|600 784|590 786|601",
    protect: false,
    getCoords: true,
    villagePoints: { min: 0, max: 12350 }
  };

  const win = window.frames.length > 0 ? window.main : window;
  const data = win.game_data;

  const func = {
    insert: (name, val) => win.$(`[name=${name}]`).val(val),
    total: (name) => win.$(`input[name=${name}]`).next().text().match(/([0-9]+)/)[1],
    redir: (scr) => location.search = `?village=${data.village.id}&screen=${scr}`,
    check: (name) => win.$(`input[name=${name}]`).length > 0,
    getCoords: () => {
      const coords = [];
      win.$("table.map td:has(a[onmouseover*=Map.map_popup])").each((_, td) => {
        const match = td.innerHTML.match(/map_popup\((.*?)\)\"/i);
        if (match) {
          const e = match[0].split(",");
          const points = parseInt(e[4], 10);
          const coord = String(e[1].match(/\d+\|\d+/));
          const owner = (e[5].match(/\'(.+)\s\(/) || [])[1];
          if (!owner && (!options.villagePoints.min || points >= options.villagePoints.min) && (!options.villagePoints.max || points <= options.villagePoints.max)) {
            coords.push(coord);
          }
        }
      });
      alert(coords.length > 0 ? coords.join(" ") : "Sem abandonadas para obter coordenadas!");
    },
    farm: () => {
      if (data.screen !== "place") return func.redir("place");

      if (win.$("div[style*=red]").length > 0) {
        win.$("div[style*=red]").remove();
        win.$("[name=x]").val("");
        win.$("[name=y]").val("");
      }

      if (options.protect && win.$("[width=300] [href*=player]").length > 0) return func.redir("place");

      if (win.$("[name=support]").length > 0 && win.$("[name=x]").val() === "") {
        win.$.each(units, (name, val) => {
          if (func.check(name)) {
            const amount = val[1] ? func.total(name) : val[0];
            func.insert(name, amount);
          }
        });

        const coords = options.coords.split(" ");
        const cookieName = "FastFarm" + data.world;
        let current = win.$.cookie(cookieName);

        if (current == null || current >= coords.length) current = 0;

        const [x, y] = coords[current].split("|");
        func.insert("x", x);
        func.insert("y", y);
        win.$.cookie(cookieName, parseInt(current) + 1, { expires: 10 });

        log(`🟢 Enviando ataque para ${x}|${y}`);
        win.$("[name=attack]").click();
      }
    }
  };

  // Interface visual (painel)
  const $ = win.$;

  if (!$("#tw-farm-panel").length) {
    const style = `
      #tw-farm-panel {
        position: fixed;
        top: 100px;
        right: 20px;
        background: #f4f4f4;
        border: 2px solid #888;
        padding: 10px;
        z-index: 9999;
        font-size: 12px;
        border-radius: 8px;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
      }
      #tw-farm-panel button {
        display: block;
        margin: 5px 0;
        width: 100%;
        padding: 5px;
        background: #ddd;
        border: 1px solid #999;
        cursor: pointer;
        border-radius: 4px;
      }
      #tw-farm-log {
        margin-top: 10px;
        height: 100px;
        overflow-y: auto;
        background: #fff;
        border: 1px solid #ccc;
        padding: 5px;
        font-family: monospace;
        font-size: 11px;
      }
    `;
    $("head").append(`<style>${style}</style>`);

    const html = `
      <div id="tw-farm-panel">
        <button id="btn-start">Iniciar Farm</button>
        <button id="btn-next">Próxima Aldeia</button>
        <div id="tw-farm-log">Logs:<br></div>
      </div>
    `;
    $("body").append(html);

    function log(txt) {
      $("#tw-farm-log").append(txt + "<br>").scrollTop(9999);
      console.log(txt);
    }

    $("#btn-start").click(() => {
      log("🚀 Farm iniciado...");
      func.farm();
    });

    $("#btn-next").click(() => {
      log("➡️ Indo para próxima aldeia...");
      func.redir("overview_villages");
    });
  } else {
    alert("✅ Painel já está na tela.");
  }

  // Atalho para testar a tela do mapa
  if (data.screen === "map" && options.getCoords) func.getCoords();
})();

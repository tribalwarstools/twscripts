(function() {
    const tropasSalvas = localStorage.getItem("tropasSalvas");

    var units = {
        spear: [0, 0], sword: [0, 0], axe: [0, 0], archer: [0, 0],
        spy: [0, 0], light: [0, 0], marcher: [0, 0], heavy: [0, 0],
        ram: [0, 0], catapult: [0, 0], knight: [0, 0], snob: [0, 0]
    };

    if (tropasSalvas) {
        try {
            const tropas = JSON.parse(tropasSalvas);
            Object.keys(tropas).forEach(unidade => {
                if (units.hasOwnProperty(unidade)) units[unidade][0] = tropas[unidade];
            });
        } catch(e) {
            alert("Erro ao ler tropas salvas: " + e);
        }
    }

    var win = window.frames.length > 0 ? window.main : window,
        data = win.game_data;

    function calcularDistancia(a, b) {
        var dx = a.x - b.x, dy = a.y - b.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    var func = {
        insert: function(n, a) { win.$("[name=" + n + "]").val(a); },
        total: function(n) { return win.$("input[name=" + n + "]").next().text().match(/([0-9]+)/)[1]; },
        redir: function(n) { location.search = "?village=" + data.village.id + "&screen=" + n; },
        check: function(n) { return win.$("input[name=" + n + "]").length > 0 ? 1 : 0; },
        getCoords: function() {
            var n = [];
            win.$("table[class=map] td:has(a[onmouseover*=Map.map_popup])").each(function(a, t) {
                if (e = t.innerHTML.match(/map_popup\((.?)\)\"/i)) {
                    var e = e[0].split(","), o = String(e[1].match(/\d+\|\d+/));
                    n.push(o);
                }
            });
            alert(n.length > 0 ? n.join(" ") : "Sem abandonadas para obter coordenadas!");
        }
    };

    if (data.screen == "place") {
        if (win.$("div[style*=red]").length > 0) {
            win.$("div[style*=red]").remove();
            win.$("[name=x]").val("");
            win.$("[name=y]").val("");
        }

        if (win.$("[name=support]").length > 0) {
            // Preenche tropas
            win.$.each(units, function(n, a) {
                if (func.check(n)) a[1] ? func.insert(n, func.total(n)) : func.insert(n, a[0]);
            });

            // Lê coordenadas salvas
            var coords = (localStorage.getItem("coordsSalvas") || "500|500").split(" ");

            // Recupera coordenadas já atacadas de forma GLOBAL (independente da aldeia)
            var atacadasKey = "coordsAtacadas_" + data.world;
            var atacadas = JSON.parse(localStorage.getItem(atacadasKey) || "[]");

            // Filtra apenas coordenadas que ainda não foram atacadas
            var coordsDisponiveis = coords.filter(c => !atacadas.includes(c));
            if (coordsDisponiveis.length === 0) {
                alert("Todas as coordenadas já foram atacadas!");

                // 🔽 CHAMADA DO SCRIPT DE RESET QUANDO LISTA TERMINA
                $.getScript('https://tribalwarstools.github.io/ConfigTropas/ResetarCoord.js');

                return;
            }

            // Aldeia atual
            var aldeiaAtual = { x: data.village.x, y: data.village.y };

            // Ordena coordenadas disponíveis pela proximidade
            var coordsObj = coordsDisponiveis.map(c => {
                var partes = c.split("|");
                return { x: parseInt(partes[0]), y: parseInt(partes[1]), coordString: c };
            });
            coordsObj.sort((a,b) => calcularDistancia(a, aldeiaAtual) - calcularDistancia(b, aldeiaAtual));

            // Coordenada mais próxima
            var coord = coordsObj[0].coordString.split("|");

            // Marca como atacada (global)
            atacadas.push(coordsObj[0].coordString);
            localStorage.setItem(atacadasKey, JSON.stringify(atacadas));

            // Insere coordenadas
            func.insert("x", coord[0]);
            func.insert("y", coord[1]);

            // Ataca
            win.$("[name=attack]").click();
        } else {
            func.redir("place");
        }
    } else if (data.screen == "map") {
        func.getCoords();
    } else {
        func.redir("place");
    }
})();

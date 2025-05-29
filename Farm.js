javascript: 
var units = {
    spear: [10, 0],
    sword: [10, 0],
    axe: [0, 0],
    archer: [0, 0],
    spy: [0, 0],
    light: [0, 0],
    marcher: [0, 0],
    heavy: [0, 0],
    ram: [0, 0],
    catapult: [0, 0],
    knight: [0, 0],
    snob: [0, 0]
};

var options = {
    coords: "760|592 766|580 764|595 768|584 771|580 769|591 773|580 765|590 764|590 765|597 765|586 776|583 761|592 775|588 763|608 761|596 770|601 772|606 773|605 768|587 768|604 774|589 771|601 761|602 772|614 766|602 783|583 780|593 770|605 770|611 778|601 782|578 769|590 777|605 769|607 764|608 768|610 771|607 766|607 777|582 782|596 774|596 767|602 765|611 783|580 777|597 784|581 776|615 774|611 781|593 778|610 774|600 783|596 773|604 787|582 788|581 773|613 779|580 776|611 779|597 778|608 781|608 781|611 782|613 779|582 791|585 782|612 786|592 779|615 781|577 789|597 787|591 784|612 788|598 786|610 789|584 784|601 787|606 785|602 784|599 793|598 786|591 781|606 784|615 777|614 778|609 786|587 790|609 789|599 788|610 791|597 789|605 788|609 783|600 784|590 787|610 785|614 787|604 789|581 791|582 792|609 795|591 795|598 792|598 791|602 796|590 786|601 794|599 792|583 791|589 795|595 793|607 795|593 783|610 791|590 788|612 794|595 788|607 787|602 794|588 792|608 789|612 786|614 797|600 797|592 794|594 793|609 797|595 796|594 791|603 790|610 791|610",
    protect: !1,
    getCoords: !0,
    villagePoints: {
        min: 0,
        max: 12350
    }
};

var win = window.frames.length > 0 ? window.main : window,
    data = win.game_data;

var func = {
    insert: function(n, a) {
        win.$("[name=" + n + "]").val(a);
    },
    total: function(n) {
        return win.$("input[name=" + n + "]").next().text().match(/([0-9]+)/)[1];
    },
    redir: function(n) {
        location.search = "?village=" + data.village.id + "&screen=" + n;
    },
    check: function(n) {
        return win.$("input[name=" + n + "]").length > 0 ? 1 : 0;
    },
    getCoords: function() {
        var n = [];
        win.$("table[class=map] td:has(a[onmouseover*=Map.map_popup])").each(function(a, t) {
            if (e = t.innerHTML.match(/map_popup\((.?)\)\"/i)) {
                var e = e[0].split(","),
                    i = parseInt(e[4], 10),
                    o = String(e[1].match(/\d+\|\d+/)),
                    r = (r = e[5].match(/\'(.+)\s\(/)) ? r[1] : null;
                r || (
                    (!options.villagePoints.min || i >= options.villagePoints.min) &&
                    (!options.villagePoints.max || i <= options.villagePoints.max) &&
                    n.push(o)
                );
            }
        });
        alert(n.length > 0 ? n.join(" ") : "Sem abandonadas para obter coordenadas!");
    }
};

if (data.screen == "place") {
    if (win.$("div[style=red]").length > 0) {
        win.$("div[style*=red]").remove();
        win.$("[name=x]").val("");
        win.$("[name=y]").val("");
    }

    if (options.protect && win.$("[width=300] [href*=player]").length > 0) {
        func.redir("place");
    } else {
        win.$("[name=submit]").click();
    }

    if ("" == win.$("[name=x]").val() && win.$("[name=support]").length > 0) {
        win.$.each(units, function(n, a) {
            if (func.check(n)) {
                a[1] ? func.insert(n, func.total(n)) : (func.total(n), a[0], func.insert(n, a[0]));
            }
        });

        coords = options.coords.split(" ");
        nome = "FastFarm" + data.world;
        num = win.$.cookie(nome);
        if (null == num || num >= coords.length) {
            num = 0;
        }

        coord = coords[num].split("|");
        func.insert("x", coord[0]);
        func.insert("y", coord[1]);
        win.$.cookie(nome, parseInt(num) + 1, { expires: 10 });
        win.$("[name=attack]").click();
    }
} else if (data.screen == "map" && options.getCoords) {
    func.getCoords();
} else {
    func.redir("place");
}

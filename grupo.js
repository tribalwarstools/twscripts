javascript:
(function () {
    if (typeof window.TWMap === 'undefined') {
        UI.ErrorMessage("Este script deve ser executado na visão do mapa.");
        return;
    }

    const lang = game_data.locale.startsWith("pt") ? {
        title: "Grupos de Aldeias",
        loading: "Carregando grupos...",
        label: "Selecionar grupo:"
    } : {
        title: "Village Groups",
        loading: "Loading groups...",
        label: "Select group:"
    };

    const container = document.createElement("div");
    container.innerHTML = `
        <h2>${lang.title}</h2>
        <label>${lang.label}</label>
        <select id="groupSelector" style="min-width: 200px;"></select>
    `;

    Dialog.show("grupo_vilas", container.outerHTML);

    const select = document.getElementById("groupSelector");
    select.innerHTML = `<option disabled selected>${lang.loading}</option>`;

    // Buscar grupos via AJAX
    fetch("/game.php?screen=overview_villages&type=complete&mode=units")
        .then(res => res.text())
        .then(html => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const groupLinks = doc.querySelectorAll(".vis_item a");
            select.innerHTML = "";

            groupLinks.forEach(link => {
                const groupName = link.textContent.trim().slice(1, -1); // remove os colchetes []
                const groupUrl = link.getAttribute("href");

                const option = document.createElement("option");
                option.value = groupUrl;
                option.textContent = groupName;
                select.appendChild(option);
            });

            if (select.options.length === 0) {
                const opt = document.createElement("option");
                opt.disabled = true;
                opt.textContent = "Nenhum grupo encontrado.";
                select.appendChild(opt);
            }
        })
        .catch(err => {
            UI.ErrorMessage("Erro ao carregar grupos.");
            console.error(err);
        });
})();

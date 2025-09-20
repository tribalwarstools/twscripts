(async function () {
    if (!window.game_data) return alert("Execute este script dentro do Tribal Wars.");

    let limitePercentual = parseFloat(localStorage.getItem("casualLimitePercentual")) || 300; 
    let onlyLiberados = localStorage.getItem("casualOnlyLiberados") === "1";
    let minhaPontuacao = parseInt(game_data.player.points, 10);

    let paginaAtual = 1;
    const porPagina = 50;

    const playerRaw = await fetch('/map/player.txt').then(r => r.text());
    const jogadores = playerRaw.trim().split("\n").map(linha => {
        const [id, nome, tribo, aldeias, pontos, rank] = linha.split(",");
        return {
            id: +id,
            nome: decodeURIComponent((nome || "").replace(/\+/g, " ")), 
            tribo: +tribo,
            aldeias: +aldeias,
            pontos: +pontos,
            rank: +rank
        };
    });

    let tribosMap = {};
    try {
        const allyRaw = await fetch('/map/ally.txt').then(r => r.text());
        allyRaw.trim().split("\n").forEach(linha => {
            const [id, nome, tag] = linha.split(",");
            tribosMap[+id] = decodeURIComponent((tag || `T${id}`).replace(/\+/g," "));
        });
    } catch (e) {
        console.warn("Não foi possível carregar tags das tribos:", e);
    }

    function estaBloqueado(pontosMeus, pontosOutro, limitePct) {
        if (limitePct <= 0) return false;
        const menor = Math.min(pontosMeus, pontosOutro);
        const maxPermitido = menor * (limitePct / 100);
        return Math.abs(pontosMeus - pontosOutro) > maxPermitido;
    }

    function podeAtacar(p1, p2, limitePct) {
        return !estaBloqueado(p1, p2, limitePct);
    }

    function calcularAlcance(pontos, limitePct) {
        if (limitePct <= 0) return { min: "Todos", max: "Todos" };
        const L = limitePct / 100;
        const min = Math.floor(pontos / (1 + L));
        const max = Math.floor(pontos * (1 + L));
        return { min, max };
    }

    function abrirPainel() {
        const alcance = calcularAlcance(minhaPontuacao, limitePercentual);
        const tribosUnicas = Array.from(new Set(jogadores.map(j => j.tribo).filter(t => t > 0))).sort((a,b)=>a-b);
        let optionsTribos = `<option value="0">Todas</option>`;
        tribosUnicas.forEach(t => {
            const tag = tribosMap[t] || `T${t}`;
            optionsTribos += `<option value="${t}">${tag}</option>`;
        });

        const html = `
            <h2>Comparador (Casual)</h2>
            <p>Sua pontuação: <input id="minhaPontuacaoInput" type="number" value="${minhaPontuacao}" style="width:120px"></p>

            <label>Limite atual (%):
                <input id="limiteInput" type="number" value="${limitePercentual}" min="0" max="1000" style="width:90px">
            </label>
            <button id="salvarBtn" class="btn btn-confirm-yes">Salvar</button>
            <label style="margin-left:12px;">
                <input id="chkLiberados" type="checkbox" ${onlyLiberados ? "checked" : ""}>
                Mostrar só liberados
            </label>

            <div style="margin-top:8px;">
                <small><b>Alcance atual</b>: ${alcance.min} – ${alcance.max} pontos</small>
            </div>

            <div style="margin-top:10px;">
                <label>🔍 Buscar jogador: 
                    <input id="filtroInput" type="text" placeholder="Digite o nome..." style="width:100px">
                </label>
                <label style="margin-left:10px;">Tribo:
                    <select id="filtroTribo">${optionsTribos}</select>
                </label>
                <button id="btnExport" class="btn" style="margin-left:15px;">📄 Exportar</button>
            </div>

            <hr>
            <div id="resultado" style="max-height:440px; overflow:auto;"></div>
            <style>
                .tw-ok { background: rgba(60, 179, 113, 0.18); }
                .tw-no { background: rgba(220, 20, 60, 0.12); }
                .tw-table th, .tw-table td { padding: 4px 6px; }
                .paginacao button { margin:0 4px; }
            </style>
        `;
        Dialog.show("painel_casual", html);

        document.getElementById("salvarBtn").onclick = () => {
            minhaPontuacao = parseInt(document.getElementById("minhaPontuacaoInput").value, 10) || 0;
            limitePercentual = parseFloat(document.getElementById("limiteInput").value) || 0;
            localStorage.setItem("casualLimitePercentual", String(limitePercentual));
            paginaAtual = 1;
            analisar();
        };

        document.getElementById("chkLiberados").onchange = (e) => {
            onlyLiberados = e.target.checked;
            localStorage.setItem("casualOnlyLiberados", onlyLiberados ? "1" : "0");
            paginaAtual = 1;
            analisar();
        };

        document.getElementById("filtroInput").oninput = () => { paginaAtual = 1; analisar(); };
        document.getElementById("filtroTribo").onchange = () => { paginaAtual = 1; analisar(); };

        document.getElementById("btnExport").onclick = () => {
            const lista = filtrarJogadores().map(j => j.nome).join("\n");
            const blob = new Blob([lista], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "jogadores_filtrados.txt";
            a.click();
            URL.revokeObjectURL(url);
        };

        analisar();
    }

    function filtrarJogadores() {
        const filtro = (document.getElementById("filtroInput")?.value || "").toLowerCase();
        const triboFiltro = parseInt(document.getElementById("filtroTribo")?.value || "0", 10);

        let filtrados = jogadores.slice().sort((a, b) => Math.abs(a.pontos - minhaPontuacao) - Math.abs(b.pontos - minhaPontuacao));
        filtrados = filtrados.filter(j => {
            if (filtro && !j.nome.toLowerCase().includes(filtro)) return false;
            if (triboFiltro && j.tribo !== triboFiltro) return false;
            const liberado = podeAtacar(minhaPontuacao, j.pontos, limitePercentual);
            if (onlyLiberados && !liberado) return false;
            return true;
        });
        return filtrados;
    }

    function analisar() {
        const res = document.getElementById("resultado");
        const alcance = calcularAlcance(minhaPontuacao, limitePercentual);
        const filtrados = filtrarJogadores();

        // Contagem geral
        let contLiberados = 0, contBloqueados = 0;
        filtrados.forEach(j => {
            if (podeAtacar(minhaPontuacao, j.pontos, limitePercentual)) contLiberados++;
            else contBloqueados++;
        });

        const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

        const inicio = (paginaAtual - 1) * porPagina;
        const fim = inicio + porPagina;
        const pagina = filtrados.slice(inicio, fim);

        let saida = `
            <div style="margin-bottom:6px;">
                <img src="/graphic/dots/green.png"> <b>Liberados:</b> ${contLiberados} &nbsp; 
                <img src="/graphic/dots/red.png"> <b>Bloqueados:</b> ${contBloqueados}
            </div>
            <p style="margin:6px 0 10px;"><small><b>Alcance recalculado</b>: ${alcance.min} – ${alcance.max}</small></p>
            <p style="margin:0 0 6px;"><small>Limite atual: <b>${limitePercentual}%</b></small></p>
            <table class="vis tw-table" width="100%">
                <tr><th>Jogador</th><th>Pontos</th><th>Tribo</th><th>Status</th></tr>`;

        pagina.forEach(j => {
            const liberado = podeAtacar(minhaPontuacao, j.pontos, limitePercentual);
            const cls = liberado ? "tw-ok" : "tw-no";
            const status = liberado 
                ? `<img src="/graphic/dots/green.png" title="Liberado">` 
                : `<img src="/graphic/dots/red.png" title="Bloqueado">`;
            const link = `game.php?screen=info_player&id=${j.id}`;
            const tagTribo = j.tribo ? (tribosMap[j.tribo] || `T${j.tribo}`) : "-";

            saida += `<tr class="${cls}">
                        <td><a href="${link}">${j.nome}</a></td>
                        <td>${j.pontos.toLocaleString()}</td>
                        <td>${tagTribo}</td>
                        <td>${status}</td>
                      </tr>`;
        });

        saida += `</table>
            <div class="paginacao" style="margin-top:8px; text-align:center;">
                <button class="btn" id="btnPrev" ${paginaAtual <= 1 ? "disabled" : ""}>Anterior</button>
                <span style="margin:0 8px;">Página ${paginaAtual} / ${totalPaginas}</span>
                <button class="btn" id="btnNext" ${paginaAtual >= totalPaginas ? "disabled" : ""}>Próxima</button>
            </div>`;

        res.innerHTML = saida;

        document.getElementById("btnPrev")?.addEventListener("click", () => {
            if (paginaAtual > 1) { paginaAtual--; analisar(); }
        });
        document.getElementById("btnNext")?.addEventListener("click", () => {
            if (paginaAtual < totalPaginas) { paginaAtual++; analisar(); }
        });
    }

    abrirPainel();
})();

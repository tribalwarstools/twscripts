(async function () {
'use strict';

const PAGE_SIZE = 50;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
let currentPage = 1;
let sortKey = null;
let sortDir = 1;

// === Baixar arquivos ===
const [villRaw, playerRaw, allyRaw] = await Promise.all([
    fetch('/map/village.txt').then(r => r.text()),
    fetch('/map/player.txt').then(r => r.text()),
    fetch('/map/ally.txt').then(r => r.text())
]);

// === Tribos ===
const tribes = {};
allyRaw.trim().split('\n').forEach(line => {
    const [id, name, tag] = line.split(',');
    if (tag) tribes[+id] = decodeURIComponent(tag.replace(/\+/g, " "));
});

// === Jogadores ===
const players = {};
playerRaw.trim().split('\n').forEach(line => {
    const [id, name, tribeId] = line.split(',');
    if (name.trim()) {
        players[+id] = {
            nome: decodeURIComponent(name.replace(/\+/g, " ")),
            tribo: tribes[+tribeId] || ""
        };
    }
});

// === Aldeias ===
const villages = villRaw.trim().split('\n').map(line => {
    const [id, name, x, y, player, points] = line.split(',');
    return { playerId: +player, points: +points };
});

// === Pontos por jogador ===
const playerPoints = {};
const playerVillages = {};
for (let v of villages) {
    if (!playerPoints[v.playerId]) playerPoints[v.playerId] = 0;
    if (!playerVillages[v.playerId]) playerVillages[v.playerId] = 0;
    playerPoints[v.playerId] += v.points;
    playerVillages[v.playerId]++;
}

// === Snapshot anterior ===
let snapshotAntigo = JSON.parse(localStorage.getItem("atividadeJogadores") || "{}");
let ultimaExecucaoAntiga = localStorage.getItem("atividadeUltimaExecucao") || null;
let hoje = Date.now();
let jogadores = [];

Object.keys(players).forEach(pid => {
    const id = +pid;
    const nome = players[id].nome;
    const tribo = players[id].tribo || "";
    const pontosAtuais = playerPoints[id] || 0;
    const aldeias = playerVillages[id] || 0;

    let variacao = 0, status, tempoEstavel = "-", lastUpdate = hoje;

    if (snapshotAntigo[id]) {
        let antes = snapshotAntigo[id];
        variacao = pontosAtuais - antes.pontos;
        lastUpdate = antes.lastUpdate || hoje;

        if (aldeias === 0) {
            status = `<img src="/graphic/dots/grey.png">`;
        } else if (variacao > 0) {
            status = `<img src="/graphic/dots/green.png">`;
            lastUpdate = hoje;
            tempoEstavel = "0d";
        } else if (variacao < 0) {
            status = `<img src="/graphic/dots/red.png">`;
            lastUpdate = hoje;
            tempoEstavel = "0d";
        } else {
            const diff = hoje - lastUpdate;
            const dias = Math.floor(diff / (1000*60*60*24));
            status = diff > ONE_WEEK ? `<img src="/graphic/dots/grey.png">` : `<img src="/graphic/dots/yellow.png">`;
            tempoEstavel = dias + "d";
        }
    } else {
        status = aldeias === 0 ? `<img src="/graphic/dots/grey.png">` : `<img src="/graphic/dots/blue.png">`;
    }

    jogadores.push({ id, nome, tribo, pontos: pontosAtuais, aldeias, status, variacao, tempoEstavel, lastUpdate });
});

// === Salvar snapshot novo ===
let snapshotNovo = {};
jogadores.forEach(j => {
    snapshotNovo[j.id] = { pontos: j.pontos, lastUpdate: j.lastUpdate };
});
localStorage.setItem("atividadeJogadores", JSON.stringify(snapshotNovo));
localStorage.setItem("atividadeUltimaExecucao", hoje);

// === Painel estilo Tribal Wars ===
const painelId = "painelAtividadeTW";
document.getElementById(painelId)?.remove();

const style = document.createElement("style");
style.textContent = `
#${painelId} {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 880px;
    height: 640px;
    background: #e5d3a0;
    border: 2px solid #804000;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    font-family: Verdana;
    font-size: 12px;
    color: #000;
    z-index: 9999;
    display: flex;
    flex-direction: column;
}
#${painelId} .header {
    background: #d2b47a;
    padding: 5px 8px;
    border-bottom: 1px solid #804000;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
#${painelId} .header h3 { margin: 0; font-size: 13px; color: #3c2a12; }
#${painelId} .close-btn {
    background: #804000;
    color: #fff;
    border: none;
    padding: 2px 6px;
    cursor: pointer;
    font-weight: bold;
}
#${painelId} .body {
    flex: 1 1 auto;
    background: #f5ecd0;
    overflow-y: auto;
    padding: 8px;
}
#${painelId} .footer {
    background: #d2b47a;
    border-top: 1px solid #804000;
    text-align: center;
    padding: 4px;
}
#${painelId} table.vis { width:100%; border-collapse: collapse; }
#${painelId} table.vis th, #${painelId} table.vis td {
    padding: 3px;
    border-bottom: 1px solid #c5b585;
    text-align: left;
}
#${painelId} th { cursor: pointer; }
#${painelId} th.sorted-asc::after { content:" ▲"; }
#${painelId} th.sorted-desc::after { content:" ▼"; }
#${painelId} input, #${painelId} select {
    border: 1px solid #a8864b;
    background: #fffaf0;
    padding: 2px;
}
#${painelId} button.btn {
    background: #a8864b;
    color: #fff;
    border: none;
    padding: 3px 8px;
    cursor: pointer;
}
#${painelId} button.btn:disabled { opacity: 0.6; cursor: default; }
`;
document.head.appendChild(style);

// === Inserir HTML ===
const painel = document.createElement("div");
painel.id = painelId;
painel.innerHTML = `
  <div class="header">
      <h3>📊 Atividade dos Jogadores</h3>
      <button class="close-btn" id="${painelId}-close">X</button>
  </div>
  <div class="body">
      <div>
          ⏱️ Última execução: ${ultimaExecucaoAntiga ? formatarData(+ultimaExecucaoAntiga) : "primeira execução"}<br>
          ⏱️ Execução atual: ${formatarData(hoje)}<br><br>
          <input type="text" id="filtroNome" placeholder="Nome" style="width:100px;">
          <input type="text" id="filtroTribo" placeholder="Tribo" style="width:70px;">
          <select id="filtroStatus">
              <option value="">Status</option>
              <option value="green">Cresceu</option>
              <option value="red">Perdeu</option>
              <option value="yellow">Estável</option>
              <option value="blue">Novo</option>
              <option value="grey">Inativo</option>
          </select>
      </div>
      <div id="statsLegenda" style="margin-top:5px;"></div>
      <div id="resultado" style="margin-top:10px;"></div>
  </div>
  <div class="footer" id="paginacao"></div>
`;
document.body.appendChild(painel);

document.getElementById(`${painelId}-close`).addEventListener("click", ()=> painel.remove());

// === Funções ===
function formatarData(ts) {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function renderPage(filtros = {}) {
    const { nome = "", status = "", tribo = "" } = filtros;
    let filtrados = jogadores.filter(j =>
        (j.nome || "").toLowerCase().includes(nome.toLowerCase()) &&
        (j.tribo || "").toLowerCase().includes(tribo.toLowerCase()) &&
        (status === "" || j.status.includes(status))
    );

    if (sortKey) {
        filtrados.sort((a,b)=>{
            let va=a[sortKey], vb=b[sortKey];
            if(typeof va==="string") va=va.toLowerCase();
            if(typeof vb==="string") vb=vb.toLowerCase();
            if(va<vb) return -1*sortDir;
            if(va>vb) return 1*sortDir;
            return 0;
        });
    }

    const stats = { blue:0, yellow:0, green:0, red:0, grey:0 };
    filtrados.forEach(j => {
        if(j.status.includes('blue')) stats.blue++;
        else if(j.status.includes('yellow')) stats.yellow++;
        else if(j.status.includes('green')) stats.green++;
        else if(j.status.includes('red')) stats.red++;
        else if(j.status.includes('grey')) stats.grey++;
    });
    document.getElementById("statsLegenda").innerHTML = `
        <div style="display:flex; gap:15px;">
            <div><img src="/graphic/dots/blue.png"> Novo: ${stats.blue}</div>
            <div><img src="/graphic/dots/yellow.png"> Estável: ${stats.yellow}</div>
            <div><img src="/graphic/dots/green.png"> Cresceu: ${stats.green}</div>
            <div><img src="/graphic/dots/red.png"> Perdeu: ${stats.red}</div>
            <div><img src="/graphic/dots/grey.png"> Inativo: ${stats.grey}</div>
        </div>
    `;

    const totalPaginas = Math.ceil(filtrados.length / PAGE_SIZE);
    if (currentPage > totalPaginas) currentPage = totalPaginas || 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = filtrados.slice(start, end);

    let tabela = `
        <p>Mostrando ${start+1} a ${Math.min(end, filtrados.length)} de ${filtrados.length}</p>
        <table class="vis">
            <thead><tr>
                <th></th>
                <th data-key="nome">Jogador</th>
                <th data-key="pontos">Pontos</th>
                <th data-key="aldeias">Aldeias</th>
                <th data-key="variacao">Var</th>
                <th data-key="tempoEstavel">Tempo</th>
                <th data-key="lastUpdate">Atualizado</th>
                <th data-key="tribo">Tribo</th>
            </tr></thead>
            <tbody>
                ${slice.map(j => `
                    <tr>
                        <td>${j.status}</td>
                        <td><a href="/game.php?screen=info_player&id=${j.id}" target="_blank">${j.nome}</a></td>
                        <td>${j.pontos.toLocaleString()}</td>
                        <td>${j.aldeias}</td>
                        <td>${j.variacao>0?`+${j.variacao.toLocaleString()}`:j.variacao.toLocaleString()}</td>
                        <td>${j.tempoEstavel}</td>
                        <td>${formatarData(j.lastUpdate)}</td>
                        <td>${j.tribo}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
    document.getElementById("resultado").innerHTML = tabela;

    document.querySelectorAll("#resultado th").forEach(th=>{
        th.classList.remove("sorted-asc","sorted-desc");
        if(th.dataset.key===sortKey){
            th.classList.add(sortDir===1?"sorted-asc":"sorted-desc");
        }
        if(th.dataset.key){
            th.addEventListener("click",()=>{
                if(sortKey===th.dataset.key) sortDir*=-1;
                else {sortKey=th.dataset.key; sortDir=1;}
                renderPage(filtros);
            });
        }
    });

    const paginacaoHtml = `
        <button class="btn" id="btnPrev" ${currentPage <= 1 ? "disabled" : ""}>Anterior</button>
        <span style="margin:0 8px;">Página ${currentPage} / ${totalPaginas||1}</span>
        <button class="btn" id="btnNext" ${currentPage >= totalPaginas ? "disabled" : ""}>Próxima</button>
    `;
    document.getElementById("paginacao").innerHTML = paginacaoHtml;
    document.getElementById("btnPrev")?.addEventListener("click",()=>{ if(currentPage>1){currentPage--;renderPage(filtros);} });
    document.getElementById("btnNext")?.addEventListener("click",()=>{ if(currentPage<totalPaginas){currentPage++;renderPage(filtros);} });
}

// === Filtros ===
["filtroNome","filtroTribo","filtroStatus"].forEach(id=>{
    document.getElementById(id).addEventListener("input",()=>{
        currentPage=1;
        renderPage({
            nome:document.getElementById("filtroNome").value,
            tribo:document.getElementById("filtroTribo").value,
            status:document.getElementById("filtroStatus").value
        });
    });
});

renderPage();
})();

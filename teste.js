(async function () {
  if (!location.href.includes("screen=overview_villages&mode=combined")) {
    location.href = `/game.php?village=${game_data.village.id}&screen=overview_villages&mode=combined`;
    return;
  }

  const coordToPoints = {};
  const coordToId = {};

  // Mapeia coordenadas para ID (usando map/village.txt)
  const mapData = await $.get("map/village.txt");
  mapData.trim().split("\n").forEach(line => {
    const [id, , x, y] = line.split(",");
    coordToId[`${x}|${y}`] = id;
  });

  // Mapeia coordenadas para pontos usando AJAX da tela combined
  try {
    const data = await $.get('/game.php?screen=overview_villages&mode=combined&ajax=fetch_villages');
    if (!data || !data.villages) {
      UI.ErrorMessage("Erro ao obter os pontos das aldeias via AJAX.");
      return;
    }

    Object.values(data.villages).forEach(v => {
      const coord = `${v.x}|${v.y}`;
      const points = parseInt(v.points.replace(/\./g, ""), 10);
      coordToPoints[coord] = points;
    });

    console.log("Pontuações carregadas:", coordToPoints);
  } catch (e) {
    UI.ErrorMessage("Erro ao buscar as aldeias via AJAX.");
    console.error("Erro no fetch_villages:", e);
  }

  // Exemplo de uso (mostrar no console)
  console.table(coordToPoints);
})();

(() => {
  function extrairAldeias() {
    const aldeias = [];
    const linhas = document.querySelectorAll('table.vis.overview_table tbody tr');

    linhas.forEach(linha => {
      const link = linha.querySelector('a[href*="village="]');
      const labelSpan = linha.querySelector('.quickedit-label');

      if (link && labelSpan) {
        // Extrai o village_id do href
        const href = link.getAttribute('href');
        const matchId = href.match(/village=(\d+)/);
        if (!matchId) return;

        const id = matchId[1];

        // Texto do label com nome e coordenada
        const labelText = labelSpan.textContent.trim();

        // Extrair nome e coordenada com regex
        // Exemplo: "01 |A| (625|520) K56"
        const coordMatch = labelText.match(/\((\d+\|\d+)\)/);
        const coord = coordMatch ? coordMatch[1] : '';

        // Extrai o nome antes da coordenada, retirando o que está dentro do parênteses
        // Exemplo: "01 |A| (625|520) K56" -> "01 |A| K56"
        let nome = labelText.replace(/\(\d+\|\d+\)/, '').trim();

        aldeias.push({ id, nome, coord });
      }
    });

    return aldeias;
  }

  const aldeias = extrairAldeias();
  console.log('Aldeias extraídas:', aldeias);
  return aldeias;
})();

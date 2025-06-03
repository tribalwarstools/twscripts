function extrairAldeias() {
    aldeias = []
    linhas = document.querySelectorAll('table.vis.overview_table tbody tr')
    for cada linha em linhas:
        link = linha.querySelector('a[href*="village="]')
        if link existe:
            id = extrair número de village_id do link.href
            label = linha.querySelector('.quickedit-label').textContent.trim()
            nome = extrair nome do label
            coord = extrair coordenada do label
            aldeias.push({ id, nome, coord })
    return aldeias
}

async function fetchVillageGroups() {
    const groups = [{ id: '0', name: 'Todas as aldeias' }];
    const ids = new Set(['0']);

    // 1. Grupos manuais via DOM
    try {
        const res = await fetch('/game.php?screen=overview_villages&mode=combined');
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const groupMenu = doc.querySelector('.vis_item');

        const active = groupMenu?.querySelector('span.menu-highlight');
        if (active && game_data.group && !ids.has(game_data.group)) {
            groups.push({ id: game_data.group, name: active.textContent.trim().replace(/^\s*\[|\]\s*$/g, '') });
            ids.add(game_data.group);
        }

        groupMenu?.querySelectorAll('a[href*="group="]').forEach(link => {
            const match = link.href.match(/group=(\d+)/);
            if (match && !ids.has(match[1])) {
                groups.push({ id: match[1], name: link.textContent.trim().replace(/^\s*\[|\]\s*$/g, '') });
                ids.add(match[1]);
            }
        });
    } catch (e) {
        console.warn('Erro ao extrair grupos manuais do DOM:', e);
    }

    // 2. Grupos dinâmicos via AJAX
    try {
        const res = await $.get("/game.php?screen=groups&mode=overview&ajax=load_group_menu");
        res.result.forEach(group => {
            const id = group.group_id.toString();
            if (!ids.has(id)) {
                groups.push({ id, name: group.name });
                ids.add(id);
            }
        });
    } catch (e) {
        console.warn("Erro ao carregar grupos dinâmicos via AJAX:", e);
    }

    return groups;
}

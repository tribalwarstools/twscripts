<div id="test-village-panel" style="position: fixed; top: 100px; left: 50px; background: #f0e0b0; border: 2px solid #804000; padding: 10px; border-radius: 8px; z-index: 9999;">
    <b>Selecione uma aldeia:</b>
    <ul style="list-style: none; padding: 0;">
        <li><a href="#" class="select-village" data-village-id="123" data-group-id="1">🏰 Aldeia 123</a></li>
        <li><a href="#" class="select-village" data-village-id="456" data-group-id="2">🏰 Aldeia 456</a></li>
        <li><a href="#" class="select-village" data-village-id="789">🏰 Aldeia 789 (sem grupo)</a></li>
    </ul>
</div>

<script>
    // Simula se está em mobile
    const mobile = false;

    // Funções simuladas do Tribal Wars
    function selectVillage(village_id, group_id, new_tab) {
        UI.SuccessMessage(`Selecionada aldeia ID: ${village_id}, Grupo: ${group_id}, Nova aba: ${new_tab}`);
    }

    const MDS = {
        selectVillage: (village_id, group_id) => {
            UI.SuccessMessage(`[Mobile] Aldeia ID: ${village_id}, Grupo: ${group_id}`);
        }
    };

    // Script de clique (como o original)
    $(function () {
        $('.select-village').on("auxclick click", function (e) {
            e.preventDefault();

            var village_id = $(this).data('village-id');
            var group_id = $(this).data('group-id') ?? 0;

            if (mobile) {
                MDS.selectVillage(village_id, group_id);
            } else {
                var new_tab = (e.which === 2 || e.button === 4 || e.ctrlKey === true);
                selectVillage(village_id, group_id, new_tab);
            }
        });
    });
</script>

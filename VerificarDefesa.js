// Entrada do Usuário
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Configuração do Script
var scriptConfig = {
    scriptData: {
        prefix: 'checagemSaudeDefesa',
        name: 'Checagem de Saúde da Defesa',
        version: 'v1.2.1',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
    },
    allowedScreens: ['overview'],
    isDebug: DEBUG,
    enableCountApi: true,
};

// Carrega SDK
$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript?.src || ''}`,
    async function () {
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const gameScreen = twSDK.getParameterByName('screen');

        const DEFAULT_NUKE = {
            axe: 6800,
            spy: 50,
            light: 2800,
            marcher: 500,
            ram: 300,
            catapult: 150,
        };
        if (!game_data.units.includes('marcher')) delete DEFAULT_NUKE.marcher;

        // Verifica tela válida
        if (gameScreen !== 'overview') {
            UI.InfoMessage('Redirecionando para visão geral da aldeia...');
            twSDK.redirectTo('overview');
            return;
        }

        // === Função para construir a interface ===
        function buildUI() {
            const unitAmounts =
                JSON.parse(localStorage.getItem(`${scriptConfig.scriptData.prefix}_data`)) || DEFAULT_NUKE;

            // Calcula Aldeias Defensivas e ataques necessários
            const { defVillages, nukes } = calculateCurrentStack();

            let tableRows = '';
            const unitNames = {
                spear: 'Lanceiro',
                sword: 'Espadachim',
                axe: 'Bárbaro',
                archer: 'Arqueiro',
                spy: 'Espião',
                light: 'Cavaleiro Leve',
                marcher: 'Marchador',
                heavy: 'Cavaleiro Pesado',
                ram: 'Aríete',
                catapult: 'Catapulta',
            };
            Object.keys(DEFAULT_NUKE).forEach((unit) => {
                tableRows += `
                    <tr>
                        <td class="ra-tac" width="40%">
                            <img src="/graphic/unit/unit_${unit}.webp" alt="${unitNames[unit]}" /> ${unitNames[unit]}
                        </td>
                        <td class="ra-tac" width="60%">
                            <input type="text" pattern="\\d*" class="ra-input unit_${unit}" data-unit="${unit}" value="${
                    unitAmounts[unit] || 0
                }" />
                        </td>
                    </tr>
                `;
            });

            const content = `
                <div class="ra-mb15">
                    <table class="ra-table ra-table-v3 ra-unit-amounts" width="100%">
                        <tbody>
                            <tr>
                                <td width="70%"><b>Aldeias Defensivas</b></td>
                                <td class="ra-tac">${defVillages}</td>
                            </tr>
                            <tr>
                                <td width="70%"><b>Ataques necessários para limpar</b></td>
                                <td class="ra-tac">${nukes}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="ra-mb15">
                    <table class="ra-table ra-table-v3 ra-unit-amounts" width="100%">
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
                <div class="ra-mb15">
                    <label><input type="checkbox" checked id="raCheckFetchIncomings"> Levar em consideração os reforços recebidos</label>
                </div>
                <div class="ra-mb15">
                    <label><input type="checkbox" id="raNightBonus"> Ativar bônus noturno</label>
                </div>
                <div class="ra-mb15">
                    <a href="javascript:void(0);" id="raCalculateHealthCheckBtn" class="btn">Verificar Saúde das Tropas</a>
                    <a href="javascript:void(0);" id="raResetConfigBtn" class="btn">Resetar</a>
                </div>
                <div class="ra-mb15" id="raHealthCheckResult" style="display:none;"></div>
            `;

            const customStyle = `
                <style>
                .ra-input { padding: 5px; width: 80%; text-align: center; font-size: 14px; }
                .ra-alert-box { border-width: 2px; border-radius: 4px; background: #fff3d3; padding: 5px; margin-top:5px; }
                .ra-danger { border-color: #ff0000; }
                .ra-success { border-color: #219b24; }
                </style>
            `;

            Dialog.show("raDefenseHealthCheck", customStyle + content);

            // Executa cálculo automaticamente se houver valores preenchidos
            setTimeout(() => {
                const nonEmptyValues = Object.values(unitAmounts).filter((item) => item !== 0);
                if (nonEmptyValues.length) jQuery('#raCalculateHealthCheckBtn').trigger('click');
            }, 1);
        }

        // === Funções auxiliares ===
        function handleCheckHealthStatus() {
            jQuery('#raCalculateHealthCheckBtn').on('click', async function (e) {
                e.preventDefault();
                jQuery(this).addClass('btn-disabled');
                setTimeout(() => jQuery(this).removeClass('btn-disabled'), 300);

                const villageId = twSDK.getParameterByName('village');
                const shouldCheckIncomingSupport = jQuery('#raCheckFetchIncomings').is(':checked');
                const incomingSupport = shouldCheckIncomingSupport ? await fetchIncomingSupport(villageId) : {};
                const isNightBonus = jQuery('#raNightBonus').is(':checked');

                const defTroops = countTotalTroops(incomingSupport);

                let offTroops = {};
                jQuery('.ra-unit-amounts .ra-input').each(function () {
                    const unit = jQuery(this).attr('data-unit');
                    const amount = jQuery(this).val();
                    offTroops[unit] = parseInt(amount) || 0;
                });

                if (!Object.values(offTroops).some(v => v > 0)) {
                    UI.ErrorMessage('Entrada inválida!');
                    return;
                }

                localStorage.setItem(`${scriptConfig.scriptData.prefix}_data`, JSON.stringify(offTroops));

                const simulationUrl = buildSimulatorUrl(defTroops, offTroops, isNightBonus);
                const simulationResults = await fetchSimulationResult(simulationUrl);

                let content = '';
                if (simulationResults) {
                    if (simulationResults > 10) {
                        content = `<div class="info_box ra-alert-box ra-success"><img src="/graphic/stat/green.webp"> <b>${simulationResults}</b> mais ataques nucleares desse tipo foram destruídos. <a href="${simulationUrl}" target="_blank">[SIM]</a></div>`;
                    } else {
                        content = `<div class="info_box ra-alert-box"><img src="/graphic/stat/yellow.webp"> <b>${simulationResults}</b> ${simulationResults === 1 ? 'mais ataque nuclear desse tipo foi destruído.' : 'mais ataques nucleares desse tipo foram destruídos.'} <a href="${simulationUrl}" target="_blank">[SIM]</a></div>`;
                    }
                } else {
                    content = `<div class="info_box ra-alert-box ra-danger"><img src="/graphic/stat/red.webp"> <b>Nenhum ataque nuclear foi destruído!</b> <a href="${simulationUrl}" target="_blank">[SIM]</a></div>`;
                }

                jQuery('#raHealthCheckResult').fadeIn(300).html(content);
            });
        }

        function handleResetScriptConfig() {
            jQuery('#raResetConfigBtn').on('click', async () => {
                localStorage.removeItem(`${scriptConfig.scriptData.prefix}_data`);
                UI.SuccessMessage('Configuração reiniciada!');
                setTimeout(() => window.location.reload(), 1000);
            });
        }

        function calculateCurrentStack() {
            let units = { spear: 0, sword: 0, archer: 0, heavy: 0 };
            let rows = jQuery('#show_units table tr');
            for (let i = 0; i < rows.length; i++) {
                let currentRow = rows[i];
                let unit = currentRow.getElementsByTagName('a')[0]?.getAttribute('data-unit');
                if (unit in units) {
                    let count = currentRow.textContent.match(/\d+/gi).pop();
                    units[unit] = parseInt(count);
                }
            }
            let totalPop = units['spear'] + units['sword'] + units['archer'] + 6 * units['heavy'];
            let defCount = totalPop / 20724;
            let defVillages = Math.round(defCount * 100) / 100;
            let nukes = Math.round((0.205 * defCount * defCount + 1.079 * defCount) * 100) / 100;
            return { defVillages, nukes };
        }

        // === Inicializa UI ===
        buildUI();
        handleCheckHealthStatus();
        handleResetScriptConfig();
    }
);

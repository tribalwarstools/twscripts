scriptUrl = document.currentScript.src;

janela.twSDK = {
    // variáveis
    scriptData: {},
    traduções: {},
    mercados permitidos: [],
    Telas permitidas: [],
    Modos permitidos: [],
    enableCountApi: verdadeiro,
    isDebug: falso,
    isMobile: jQuery('#mobileHeader').length > 0,
    delayBetweenRequests: 200,
    // variáveis ​​auxiliares
    mercado: game_data.market,
    unidades: game_data.units,
    vila: game_data.village,
    edifícios: game_data.village.buildings,
    sitterId: dados_do_jogo.jogador.sitter > 0 ? `&t=${game_data.player.id}` : '',
    coordenadasRegex: /\d{1,3}\|\d{1,3}/g,
    dataHoraCorrespondência:
        /(?:[AZ][az]{2}\s+\d{1,2},\s*\d{0,4}\s+|hoje\s+às\s+|amanhã\s+às\s+)\d{1,2}:\d{2}:\d{2}:?\.?\d{0,3}/,
    worldInfoInterface: '/interface.php?func=get_config',
    unitInfoInterface: '/interface.php?func=get_unit_info',
    buildingInfoInterface: '/interface.php?func=get_building_info',
    worldDataVillages: '/map/village.txt',
    worldDataPlayers: '/map/player.txt',
    worldDataTribes: '/map/ally.txt',
    worldDataConquests: '/map/conquer_extended.txt',
    // constantes do jogo
    edifíciosLista: [
        'principal',
        'quartel',
        'estável',
        'garagem',
        'igreja',
        'igreja_f',
        'torre de vigia',
        'esnobe',
        'ferreiro',
        'lugar',
        'estátua',
        'mercado',
        'madeira',
        'pedra',
        'ferro',
        'fazenda',
        'armazenar',
        'esconder',
        'parede',
    ],
    // https://help.tribalwars.net/wiki/Points
    buildingPoints: {
        principal: [
            10, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 21, 26, 31, 37, 44,
            53, 64, 77, 92, 110, 133, 159, 191, 229, 274, 330,
        ],
        quartel: [
            16, 3, 4, 5, 5, 7, 8, 9, 12, 14, 16, 20, 24, 28, 34, 42, 49, 59, 71,
            85, 102, 123, 147, 177, 212,
        ],
        estável: [
            20, 4, 5, 6, 6, 9, 10, 12, 14, 17, 21, 25, 29, 36, 43, 51, 62, 74,
            88, 107,
        ],
        garagem: [24, 5, 6, 6, 9, 10, 12, 14, 17, 21, 25, 29, 36, 43, 51],
        igreja: [10, 2, 2],
        igreja_f: [10],
        torre de vigia: [
            42, 8, 10, 13, 14, 18, 20, 25, 31, 36, 43, 52, 62, 75, 90, 108, 130,
            155, 186, 224,
        ],
        esnobe: [512],
        ferreiro: [
            19, 4, 4, 6, 6, 8, 10, 11, 14, 16, 20, 23, 28, 34, 41, 49, 58, 71,
            84, 101,
        ],
        lugar: [0],
        estátua: [24],
        mercado: [
            10, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 21, 26, 31, 37, 44,
            53, 64, 77, 92, 110, 133,
        ],
        madeira: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        pedra: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        ferro: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        fazenda: [
            5, 1, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27,
            32, 38, 46, 55, 66, 80, 95, 115, 137, 165,
        ],
        armazenar: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        ocultar: [5, 1, 1, 2, 1, 2, 3, 3, 3, 5],
        parede: [
            8, 2, 2, 2, 3, 3, 4, 5, 5, 7, 9, 9, 12, 15, 17, 20, 25, 29, 36, 43,
        ],
    },
    unidadesFarmSpace: {
        lança: 1,
        espada: 1,
        machado: 1,
        arqueiro: 1,
        espião: 2,
        luz: 4,
        manifestante: 5,
        pesado: 6,
        carneiro: 5,
        catapulta: 8,
        cavaleiro: 10,
        esnobe: 100,
    },
    // https://help.tribalwars.net/wiki/Timber_camp
    // https://help.tribalwars.net/wiki/Clay_pit
    // https://help.tribalwars.net/wiki/Iron_mine
    resPorHora: {
        0: 2,
        1:30,
        2:35,
        3:41,
        4:47,
        5:55,
        6: 64,
        7: 74,
        8: 86,
        9: 100,
        10: 117,
        11: 136,
        12: 158,
        13: 184,
        14: 214,
        15: 249,
        16: 289,
        17: 337,
        18: 391,
        19: 455,
        20: 530,
        21: 616,
        22: 717,
        23: 833,
        24: 969,
        25: 1127,
        26: 1311,
        27: 1525,
        28: 1774,
        29: 2063,
        30: 2400,
    },
    torre de vigiaNíveis: [
        1,1, 1,3, 1,5, 1,7, 2, 2,3, 2,6, 3, 3,4, 3,9, 4,4, 5,1, 5,8, 6,7, 7,6,
        8,7, 10, 11,5, 13,1, 15,
    ],

    // métodos internos
    _initDebug: função () {
        const scriptInfo = this.scriptInfo();
        console.debug(`${scriptInfo} Funciona ðŸš€!`);
        console.debug(`${scriptInfo} AJUDA:`, this.scriptData.helpLink);
        se (isto éDepuração) {
            console.debug(`${scriptInfo} Mercado:`, game_data.market);
            console.debug(`${scriptInfo} Mundo:`, game_data.world);
            console.debug(`${scriptInfo} Tela:`, game_data.screen);
            console.debug(
                `${scriptInfo} Versão do jogo:`,
                dados_do_jogo.versão_principal
            );
            console.debug(`${scriptInfo} Versão do jogo:`, game_data.version);
            console.debug(`${scriptInfo} Localidade:`, game_data.locale);
            console.debug(
                `${scriptInfo} PA:`,
                dados_do_jogo.recursos.Premium.ativo
            );
            console.debug(
                `${scriptInfo} LA:`,
                game_data.features.FarmAssistent.active
            );
            console.debug(
                `${scriptInfo} AM:`,
                game_data.features.AccountManager.active
            );
        }
    },
    _countAPI: função () {
        const scriptInfo = this.scriptInfo(scriptConfig.scriptData);

        se (scriptConfig.enableCountApi) {
            jQuery
                .ajax({
                    url: 'https://twscripts.dev/count/',
                    método: 'POST',
                    dados: {
                        scriptData: scriptConfig.scriptData,
                        mundo: game_data.world,
                        mercado: game_data.market,
                        referralScript: scriptUrl.split('?&_=')[0],
                    },
                    Tipo de dados: 'JSON',
                })
                .então(({ mensagem }) => {
                    se (mensagem) {
                        console.debug(
                            `${scriptInfo} Este script foi executado ${twSDK.formatAsNumber(
                                parseInt(mensagem)
                            )} vezes.`
                        );
                    }
                });
        }
    },

    // métodos públicos
    addGlobalStyle: função () {
        retornar `
            /* Estilo de tabela */
            .ra-table-container { overflow-y: auto; overflow-x: hidden; altura: auto; altura máxima: 400px; }
            .ra-table th { tamanho da fonte: 14px; }
            .ra-table th rótulo { margem: 0; preenchimento: 0; }
            .ra-tabela th,
            .ra-table td { preenchimento: 5px; alinhamento de texto: centro; }
            .ra-table td a { quebra-palavra: quebra-tudo; }
            .ra-table a:focus { cor: azul; }
            .ra-table a.btn:foco { cor: #fff; }
            .ra-table tr:enésimo-do-tipo(2n) td { cor de fundo: #f0e2be }
            .ra-table tr:enésimo-do-tipo(2n+1) td { cor de fundo: #fff5da; }

            .ra-table-v2 th,
            .ra-table-v2 td { alinhamento de texto: esquerda; }

            .ra-table-v3 { borda: 2px sólido #bd9c5a; }
            .ra-table-v3 th,
            .ra-table-v3 td { border-collapse: separar; borda: 1px sólido #bd9c5a; alinhamento de texto: esquerda; }

            /* Entradas */
            .ra-textarea { largura: 100%; altura: 80px; redimensionamento: nenhum; }

            /* Aparecer */
            .ra-popup-content { largura: 360px; }
            .ra-popup-content * { tamanho da caixa: caixa de borda; }
            .ra-popup-content input[tipo="texto"] { preenchimento: 3px; largura: 100%; }
            .ra-popup-content .btn-confirm-yes { preenchimento: 3px !importante; }
            .ra-popup-content rótulo { display: bloco; margem inferior: 5px; espessura da fonte: 600; }
            .ra-popup-content > div { margem inferior: 15px; }
            .ra-popup-content > div:last-child { margem-inferior: 0 !importante; }
            .ra-popup-content textarea { largura: 100%; altura: 100px; redimensionamento: nenhum; }

            /* Elementos */
            .ra-details { display: bloco; margem inferior: 8px; borda: 1px sólido #603000; preenchimento: 8px; raio da borda: 4px; }
            .ra-details resumo { font-weight: 600; cursor: ponteiro; }
            .ra-details p { margem: 10px 0 0 0; preenchimento: 0; }

            /* Ajudantes */
            .ra-pa5 { preenchimento: 5px !importante; }
            .ra-mt15 { margem superior: 15px !importante; }
            .ra-mb10 { margem inferior: 10px !importante; }
            .ra-mb15 { margem inferior: 15px !importante; }
            .ra-tal { alinhamento de texto: esquerda !importante; }
            .ra-tac { alinhamento de texto: centro !importante; }
            .ra-tar { alinhamento de texto: direita !importante; }

            /* RESPONSIVO */
            @media (largura máxima: 480px) {
                .ra-widget-fixo {
                    posição: relativa !importante;
                    topo: 0;
                    esquerda: 0;
                    exibir: bloco;
                    largura: automático;
                    altura: automático;
                    índice z: 1;
                }

                .ra-box-widget {
                    posição: relativa;
                    exibir: bloco;
                    dimensionamento de caixa: caixa de borda;
                    largura: 97%;
                    altura: automático;
                    margem: 10px automático;
                }

                .ra-tabela {
                    border-collapse: recolher !importante;
                }

                .botão de fechamento personalizado { display: nenhum; }
                .ra-fixed-widget h3 { margem inferior: 15px; }
                .ra-popup-content { largura: 100%; }
            }
        `;
    },
    addScriptToQuickbar: função (nome, script, retorno de chamada) {
        deixe scriptData = `tecla de atalho=&nome=${nome}&href=${encodeURI(script)}`;
        deixe ação =
            '/game.php?screen=settings&mode=quickbar_edit&action=quickbar_edit&';

        jQuery.ajax({
            url: ação,
            tipo: 'POST',
            dados: scriptData + `&h=${csrf_token}`,
            sucesso: função () {
                se (tipo de retorno de chamada === 'função') {
                    ligar de volta();
                }
            },
        });
    },
    arraysIntersection: função () {
        var resultado = [];
        listas var;

        se (argumentos.length === 1) {
            listas = argumentos[0];
        } outro {
            listas = argumentos;
        }

        para (var i = 0; i < listas.length; i++) {
            var currentList = listas[i];
            for (var y = 0; y < lista atual.length; y++) {
                var currentValue = currentList[y];
                se (resultado.indexOf(valoratual) === -1) {
                    var existsInAll = verdadeiro;
                    para (var x = 0; x < listas.length; x++) {
                        se (listas[x].indexOf(valoratual) === -1) {
                            existsInAll = falso;
                            quebrar;
                        }
                    }
                    se (existeEmTodos) {
                        resultado.push(valoratual);
                    }
                }
            }
        }
        retornar resultado;
    },
    buildUnitsPicker: função (
        unidades selecionadas = [],
        unidades a ignorar,
        tipo = 'caixa de seleção'
    ) {
        deixe unitsTable = ``;

        deixe thUnits = ``;
        deixe tableRow = ``;

        game_data.units.forEach((unidade) => {
            se (!unitsToIgnore.includes(unidade)) {
                deixe marcado = '';
                se (selectedUnits.includes(unidade)) {
                    verificado = `verificado`;
                }

                Unidades += `
                    <th class="ra-tac">
                        <rótulo para="unidade_${unidade}">
                            <img src="/gráfico/unidade/unidade_${unidade}.png">
                        </label>
                    </th>
                `;

                tableRow += `
                    <td class="ra-tac">
                        <input nome="ra_chosen_units" tipo="${tipo}" ${marcado} id="unidade_${unidade}" classe="ra-unit-selector" valor="${unidade}" />
                    </td>
                `;
            }
        });

        tabelaDeUnidades = `
            <tabela class="ra-table ra-table-v2" width="100%" id="raUnitSelector">
                <cabeça>
                    <tr>
                        ${thUnits}
                    </tr>
                </thead>
                <tcorpo>
                    <tr>
                        ${tableRow}
                    </tr>
                </tbody>
            </tabela>
        `;

        retornar unidadesTabela;
    },
    calcularMoedasNecessáriasParaNthNoble: função (nobre) {
        retornar (nobre * nobre + nobre) / 2;
    },
    calcularDistânciaDaVilaAtual: função (coord) {
        const x1 = dados_do_jogo.vila.x;
        const y1 = dados_do_jogo.vila.y;
        const [x2, y2] = coord.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        retornar Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calcularDistância: função (de, para) {
        const [x1, y1] = de.split('|');
        const [x2, y2] = para.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        retornar Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calculatePercentages: função (valor, total) {
        se (quantidade === indefinido) quantidade = 0;
        retornar parseFloat((quantidade / total) * 100).toFixed(2);
    },
    calculateTimesByDistance: função assíncrona (distância) {
        const _self = isto;

        const vezes = [];
        const travelTimes = [];

        const unitInfo = await _self.getWorldUnitInfo();
        const worldConfig = await _self.getWorldConfig();

        para (deixe [chave, valor] de Object.entries(unitInfo.config)) {
            vezes.push(valor.velocidade);
        }

        const { velocidade, velocidade_unitária } = worldConfig.config;

        vezes.paraCada((tempo) => {
            deixe travelTime = Math.round(
                (distância * tempo * 60) / velocidade / unidade_de_velocidade
            );
            TempoDeViagem = _self.secondsToHms(TempoDeViagem);
            travelTimes.push(tempoDeViagem);
        });

        Tempos de viagem de retorno;
    },
    checkValidLocation: função (tipo) {
        switch (tipo) {
            caso 'tela':
                retornar this.allowedScreens.includes(
                    this.getParameterByName('tela')
                );
            caso 'modo':
                retornar this.allowedModes.includes(
                    this.getParameterByName('modo')
                );
            padrão:
                retornar falso;
        }
    },
    checkValidMarket: função () {
        se (this.market === 'yy') retornar verdadeiro;
        retornar this.allowedMarkets.includes(this.market);
    },
    cleanString: função (string) {
        tentar {
            retornar decodeURIComponent(string).replace(/\+/g, ' ');
        } pegar (erro) {
            console.error(erro, string);
            retornar string;
        }
    },
    copyToClipboard: função (string) {
        navigator.clipboard.writeText(string);
    },
    createUUID: função () {
        retornar crypto.randomUUID();
    },
    csvToArray: função (strDados, strDelimitador = ',') {
        var objPattern = novo RegExp(
            '(\\' +
                strDelimitador +
                '|\\r?\\n|\\r|^)' +
                '(?:"([^"]*(?:""[^"]*)*)"|' +
                '([^"\\' +
                strDelimitador +
                '\\r\\n]*))',
            'gi'
        );
        var arrData = [[]];
        var arrMatches = nulo;
        enquanto ((arrMatches = objPattern.exec(strData))) {
            var strMatchedDelimiter = arrMatches[1];
            se (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimitador
            ) {
                arrData.push([]);
            }
            var strValorMatched;

            se (arrMatches[2]) {
                strMatchedValue = arrMatches[2].replace(
                    novo RegExp('""', 'g'),
                    '''
                );
            } outro {
                strMatchedValue = arrMatches[3];
            }
            arrData[arrData.length - 1].push(strMatchedValue);
        }
        retornar arrData;
    },
    decryptAccountManangerTemplate: função (exportedTemplate) {
        const edifícios = [];

        const binaryString = atob(exportadoTemplate);
        const bytes = novo Uint8Array(binaryString.length);
        para (deixe i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const payloadLength = bytes[0] + bytes[1] * 256;
        se (payloadLength <= bytes.length - 2) {
            const payload = bytes.slice(2, 2 + payloadLength);
            para (deixe i = 0; i < carga útil.comprimento; i += 2) {
                const buildingId = carga útil[i];
                const buildingLevel = carga útil[i + 1];
                se (this.buildingsList[buildingId]) {
                    edifícios.push({
                        id: this.buildingsList[buildingId],
                        atualização: `+${buildingLevel}`,
                    });
                }
            }

            retornar edifícios;
        }
    },
    filterVillagesByPlayerIds: função (playerIds, vilas) {
        const playerVillages = [];
        aldeias.paraCada((aldeia) => {
            se (playerIds.includes(parseInt(vila[4]))) {
                constante coordenada = vila[2] + '|' + vila[3];
                playerVillages.push(coordenada);
            }
        });
        retornar jogadorVillages;
    },
    formatAsNumber: função (número) {
        retornar parseInt(número).toLocaleString('de');
    },
    formatDateTime: função (dataHora) {
        dataHora = nova Data(dataHora);
        retornar (
            this.zeroPad(dateTime.getDate(), 2) +
            '/' +
            this.zeroPad(dataHora.obterMês() + 1, 2) +
            '/' +
            dateTime.getFullYear() +
            ' ' +
            this.zeroPad(dateTime.getHours(), 2) +
            ':' +
            this.zeroPad(dateTime.getMinutes(), 2) +
            ':' +
            this.zeroPad(dataHora.obterSegundos(), 2)
        );
    },
    frequencyCounter: função (matriz) {
        retornar array.reduce(função (acc, curr) {
            se (tipo de acc[atual] == 'indefinido') {
                acc[atual] = 1;
            } outro {
                acc[atual] += 1;
            }
            retornar acc;
        }, {});
    },
    generateRandomCoordinates: função () {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        retornar `${x}|${y}`;
    },
    obterTudo: função (
        urls, // matriz de URLs
        onLoad, // chamado quando qualquer URL é carregada, parâmetros (índice, dados)
        onDone, // chamado quando todos os URLs foram carregados com sucesso, sem parâmetros
        onError // chamado quando um carregamento de URL falha ou se onLoad lança uma exceção, params (erro)
    ) {
        var numDone = 0;
        var lastRequestTime = 0;
        var minWaitTime = this.delayBetweenRequests; // ms entre solicitações
        carregarPróximo();
        função loadNext() {
            se (numDone == urls.length) {
                onDone();
                retornar;
            }

            deixe agora = Date.now();
            deixe timeElapsed = now - lastRequestTime;
            se (tempoDecorrido < tempoDeEsperaMínimo) {
                deixe timeRemaining = minWaitTime - timeElapsed;
                setTimeout(loadNext, tempoRestante);
                retornar;
            }
            lastRequestTime = agora;
            jQuery
                .get(urls[numDone])
                .feito((dados) => {
                    tentar {
                        onLoad(numDone, dados);
                        ++numConcluído;
                        carregarPróximo();
                    } pegar (e) {
                        onError(e);
                    }
                })
                .falha((xhr) => {
                    onError(xhr);
                });
        }
    },
    getBuildingsInfo: função assíncrona () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 365; // busca a configuração apenas uma vez, pois elas não mudam
        const ÚLTIMA_ATUALIZAÇÃO_HORA =
            localStorage.getItem('buildings_info_last_updated') ?? 0;
        deixe buildingsInfo = [];

        se (ÚLTIMA_ATUALIZAÇÃO !== nulo) {
            se (Data.parse(nova Data()) >= ÚLTIMA_ATUALIZAÇÃO_HORA + INTERVALO_DE_TEMPO) {
                const resposta = await jQuery.ajax({
                    url: this.buildingInfoInterface,
                });
                buildingsInfo = this.xml2json(jQuery(resposta));
                localStorage.setItem(
                    'informações_de_edifícios',
                    JSON.stringify(informaçõesdeedifícios)
                );
                localStorage.setItem(
                    'informações_de_edifícios_última_atualização',
                    Data.parse(nova Data())
                );
            } outro {
                buildingInfo = JSON.parse(
                    localStorage.getItem('buildings_info')
                );
            }
        } outro {
            const resposta = await jQuery.ajax({
                url: this.buildingInfoInterface,
            });
            buildingsInfo = this.xml2json(jQuery(resposta));
            localStorage.setItem('buildings_info', JSON.stringify(unitInfo));
            localStorage.setItem(
                'informações_de_edifícios_última_atualização',
                Data.parse(nova Data())
            );
        }

        retornar buildingsInfo;
    },
    getContinentByCoord: função (coord) {
        deixe [x, y] = Array.from(coord.split('|')).map((e) => parseInt(e));
        para (seja i = 0; i < 1000; i += 100) {
            //eixos x
            para (seja j = 0; j < 1000; j += 100) {
                //eixos y
                se (i >= x && x < i + 100 && j >= y && y < j + 100) {
                    deixe nr_continente =
                        parseInt(y/100) + '' + parseInt(x/100);
                    retornar nr_continente;
                }
            }
        }
    },
    getContinentsFromCoordinates: função (coordenadas) {
        deixe continentes = [];

        coordenadas.forEach((coord) => {
            const continente = twSDK.getContinentByCoord(coord);
            continentes.push(continente);
        });

        retornar [...novo Conjunto(continentes)];
    },
    getCoordFromString: função (string) {
        se (!string) retornar [];
        retornar string.match(this.coordsRegex)[0];
    },
    getContinentSectorField: função (coordenada) {
        const continente = this.getContinentByCoord(coordenada);
        deixe [coordX, coordY] = coordenada.split('|');

        deixe tempX = Número(coordX);
        deixe tempY = Número(coordY);

        //==== setor ====
        se (tempX >= 100) tempX = Número(String(coordX).substring(1));
        se (tempY >= 100) tempY = Número(String(coordY).substring(1));

        deixe xPos = Math.floor(tempX / 5);
        deixe yPos = Math.floor(tempY / 5);
        deixe setor = yPos * 20 + xPos;

        //==== campo ====
        se (tempX >= 10) tempX = Número(String(tempX).substring(1));
        if (tempY >= 10) tempY = Number(String(tempY).substring(1));

        se (tempX >= 5) tempX = tempX - 5;
        if (tempY >= 5) tempY = tempY - 5;
        deixe campo = tempY * 5 + tempX;

        deixe nome = continente + ':' + setor + ':' + campo;

        nome de retorno;
    },
    getDestinationCoordinates: função (config, tribos, jogadores, aldeias) {
        constante {
            entrada de jogadores,
            tribosInput,
            continentes,
            minCoord,
            maxCoord,
            distCenter,
            centro,
            Jogadores excluídos,
            habilitar20Para1Limite,
            minPoints,
            maxPoints,
            configuração aleatória seletiva,
        } = configuração;

        // obter coordenadas de destino
        const chosenPlayers = playersInput.split(',');
        const chosenTribes = tribesInput.split(',');

        const chosenPlayerIds = twSDK.getEntityIdsByArrayIndex(
            jogadores escolhidos,
            jogadores,
            1
        );
        const chosenTribeIds = twSDK.getEntityIdsByArrayIndex(
            Tribos escolhidas,
            tribos,
            2
        );

        const tribePlayers = twSDK.getTribeMembersById(chosenTribeIds, jogadores);

        const mergedPlayersList = [...tribePlayers, ...chosenPlayerIds];
        deixe uniquePlayersList = [...novo Conjunto(mergedPlayersList)];

        const chosenExcludedPlayers = excludedPlayers.split(',');
        se (chosenExcludedPlayers.length > 0) {
            const excludedPlayersIds = twSDK.getEntityIdsByArrayIndex(
                JogadoresExcluídosEscolhedos,
                jogadores,
                1
            );
            excludedPlayersIds.forEach((item) => {
                uniquePlayersList = uniquePlayersList.filter(
                    (jogador) => jogador !== item
                );
            });
        }

        // filtrar pela regra 20:1
        se (enable20To1Limit) {
            deixe uniquePlayersListArray = [];
            uniquePlayersList.forEach((playerId) => {
                jogadores.paraCada((jogador) => {
                    se (parseInt(jogador[0]) === playerId) {
                        uniquePlayersListArray.push(jogador);
                    }
                });
            });

            const jogadoresNãoMaiorEntão20Vezes = uniquePlayersListArray.filter(
                (jogador) => {
                    retornar (
                        parseInt(jogador[4]) <=
                        parseInt(dados_do_jogo.jogador.pontos) * 20
                    );
                }
            );

            uniquePlayersList = jogadoresNãoMaioresEntão20Vezes.map((jogador) =>
                parseInt(jogador[0])
            );
        }

        deixe coordinatesArray = twSDK.filterVillagesByPlayerIds(
            listadejogadoresúnica,
            aldeias
        );

        // filtrar por pontos mínimos e máximos da vila
        se (pontosmin || pontosmax) {
            deixe filteredCoordinatesArray = [];

            coordinatesArray.forEach((coordenada) => {
                aldeias.paraCada((aldeia) => {
                    const villageCoordinate = vila[2] + '|' + vila[3];
                    se (vilaCoordenada === coordenada) {
                        filteredCoordinatesArray.push(vila);
                    }
                });
            });

            filteredCoordinatesArray = filteredCoordinatesArray.filter(
                (vila) => {
                    const vilaPontos = parseInt(vila[5]);
                    const minPointsNumber = parseInt(minPoints) || 26;
                    const maxPointsNumber = parseInt(maxPoints) || 12124;
                    se (
                        villagePoints > minPointsNumber &&
                        villagePoints < maxPointsNumber
                    ) {
                        retornar à aldeia;
                    }
                }
            );

            coordinatesArray = filteredCoordinatesArray.map(
                (vila) => vila[2] + '|' + vila[3]
            );
        }

        // filtrar coordenadas por continente
        se (continentes.comprimento) {
            deixe chosenContinentsArray = continentes.split(',');
            chosenContinentsArray = chosenContinentsArray.map((item) =>
                item.trim()
            );

            const availableContinents =
                twSDK.getContinentsFromCoordinates(matriz de coordenadas);
            const filteredVillagesByContinent =
                twSDK.getFilteredVillagesByContinent(
                    coordenadasArray,
                    Continentes disponíveis
                );

            const isUserInputValid = chosenContinentsArray.every((item) =>
                availableContinents.includes(item)
            );

            se (isUserInputValid) {
                coordinatesArray = matrizDeContinentesEscolhados
                    .mapa((continente) => {
                        se (continente.length && $.isNumeric(continente)) {
                            retornar [...filteredVillagesByContinent[continente]];
                        } outro {
                            retornar;
                        }
                    })
                    .plano();
            } outro {
                retornar [];
            }
        }

        // filtrar coordenadas por uma caixa delimitadora de coordenadas
        se (minCoord.length && maxCoord.length) {
            const raMinCoordCheck = minCoord.match(twSDK.coordsRegex);
            const raMaxCoordCheck = maxCoord.match(twSDK.coordsRegex);

            se (raMinCoordCheck !== nulo && raMaxCoordCheck !== nulo) {
                const [minX, minY] = raMinCoordCheck[0].split('|');
                const [maxX, maxY] = raMaxCoordCheck[0].split('|');

                coordinatesArray = [...coordinatesArray].filter(
                    (coordenada) => {
                        const [x, y] = coordenada.split('|');
                        se (minX <= x && x <= maxX && minY <= y && y <= maxY) {
                            retornar coordenada;
                        }
                    }
                );
            } outro {
                retornar [];
            }
        }

        // filtrar por raio
        se (distCenter.length && centro.length) {
            se (!$.isNumeric(distCenter)) distCenter = 0;
            const raCenterCheck = centro.match(twSDK.coordsRegex);

            se (distCenter !== 0 && raCenterCheck !== nulo) {
                deixe coordinatesArrayWithDistance = [];
                coordinatesArray.forEach((coordenada) => {
                    const distância = twSDK.calculateDistance(
                        raCenterCheck[0],
                        coordenada
                    );
                    coordenadasArrayWithDistance.push({
                        coord: coordenada,
                        distância: distância,
                    });
                });

                coordenadasArrayWithDistance =
                    coordinatesArrayWithDistance.filter((item) => {
                        retornar (
                            pars eFloat(item.distance) <= parseFloat(distCenter)
                        );
                    });

                coordinatesArray = coordinatesArrayWithDistance.map(
                    (item) => item.coord
                );
            } outro {
                retornar [];
            }
        }

        // aplicar multiplicador
        se (seletivoRandomConfig) {
            const selectiveRandomizer = selectiveRandomConfig.split(';');

            const makeRepeated = (arr, repete) =>
                Array.from({ length: repeats }, () => arr).flat();
            const multiplicadoCoordenadasArray = [];

            selectiveRandomizer.forEach((item) => {
                const [playerName, distribuição] = item.split(':');
                se (distribuição > 1) {
                    jogadores.paraCada((jogador) => {
                        se (
                            twSDK.cleanString(jogador[1]) ===
                            twSDK.cleanString(nome do jogador)
                        ) {
                            deixe playerVillages =
                                twSDK.filterVillagesByPlayerIds(
                                    [parseInt(jogador[0])],
                                    aldeias
                                );
                            const flattenedPlayerVillagesArray = makeRepeated(
                                playerVillages,
                                distribuição
                            );
                            multiplicadoCoordenadasArray.push(
                                flattenedPlayerVillagesArray
                            );
                        }
                    });
                }
            });

            coordinatesArray.push(...multipliedCoordinatesArray.flat());
        }

        retornar coordenadasArray;
    },
    getEntityIdsByArrayIndex: função (itens escolhidos, itens, índice) {
        const itemIds = [];
        ItensEscolhemos.paraCada((ItemEscolhemos) => {
            itens.paraCada((item) => {
                se (
                    twSDK.cleanString(item[índice]) ===
                    twSDK.cleanString(ItemEscolhido)
                ) {
                    retornar itemIds.push(parseInt(item[0]));
                }
            });
        });
        retornar itensIds;
    },
    getFilteredVillagesByContinent: função (
        playerVillagesCoords,
        continentes
    ) {
        deixe coordenadas = [...playerVillagesCoords];
        deixe filteredVillagesByContinent = [];

        coordenadas.paraCada((coord) => {
            continentes.paraCada((continente) => {
                deixe currentVillageContinent = twSDK.getContinentByCoord(coord);
                se (currentVillageContinent === continente) {
                    filteredVillagesByContinent.push({
                        continente: continente,
                        coordenadas: coord,
                    });
                }
            });
        });

        retornar twSDK.groupArrayByProperty(
            VilasFiltradasPorContinente,
            'continente',
            'coordenadas'
        );
    },
    obterRecursosDoJogo: função () {
        const { Premium, FarmAssistent, AccountManager } = game_data.features;
        const isPA = Premium.ativo;
        const isLA = FarmAssistent.ativo;
        const isAM = AccountManager.ativo;
        retornar { éPA, éLA, éAM };
    },
    getKeyByValue: função (objeto, valor) {
        retornar Object.keys(objeto).find((chave) => objeto[chave] === valor);
    },
    getLandingTimeFromArrivesIn: função (chegaEm) {
        const currentServerTime = twSDK.getServerDateTimeObject();
        const [horas, minutos, segundos] = arrivesIn.split(':');
        const totalSeconds = +horas * 3600 + +minutos * 60 + +segundos;
        const arrivalDateTime = nova Data(
            currentServerTime.getTime() + totalSeconds * 1000
        );
        retornar data e hora de chegada;
    },
    getLastCoordFromString: função (string) {
        se (!string) retornar [];
        const regex = this.coordsRegex;
        deixe combinar;
        deixe lastMatch;
        enquanto ((match = regex.exec(string)) !== nulo) {
            lastMatch = correspondência;
        }
        retornar lastMatch? lastMatch[0] : [];
    },
    obterPáginasParaBuscar: função () {
        deixe list_pages = [];

        const currentPage = twSDK.getParameterByName('página');
        se (currentPage == '-1') retornar [];

        se (
            documento
                .getElementsByClassName('vis')[1]
                .getElementsByTagName('selecionar').comprimento > 0
        ) {
            Matriz.de(
                documento
                    .getElementsByClassName('vis')[1]
                    .getElementsByTagName('selecionar')[0]
            ).forEach(função (item) {
                list_pages.push(item.valor);
            });
            lista_páginas.pop();
        } senão se (
            document.getElementsByClassName('item de navegação paginado').length > 0
        ) {
            deixe nr = 0;
            Matriz.de(
                document.getElementsByClassName('item de navegação paginado')
            ).forEach(função (item) {
                deixe atual = item.href;
                atual = current.split('page=')[0] + 'page=' + nr;
                nr++;
                list_pages.push(atual);
            });
        } outro {
            deixe current_link = window.location.href;
            list_pages.push(link_atual);
        }
        lista_páginas.shift();

        retornar lista_páginas;
    },
    getParameterByName: função (nome, url = window.location.href) {
        retornar nova URL(url).searchParams.get(nome);
    },
    getRelativeImagePath: função (url) {
        const urlParts = url.split('/');
        retornar `/${urlParts[5]}/${urlParts[6]}/${urlParts[7]}`;
    },
    getServerDateTimeObject: função () {
        const formattedTime = this.getServerDateTime();
        retornar nova Data(formatadoHora);
    },
    getServerDateTime: função () {
        const serverTime = jQuery('#serverTime').text();
        const serverDate = jQuery('#serverDate').text();
        const [dia, mês, ano] = serverDate.split('/');
        const serverTimeFormatted =
            ano + '-' + mês + '-' + dia + ' ' + serverTime;
        retornar serverTimeFormatted;
    },
    getTimeFromString: função (timeLand) {
        deixe dateLand = '';
        deixe serverDate = documento
            .getElementById('data do servidor')
            .innerText.split('/');

        deixe TIME_PATTERNS = {
            hoje: 'hoje às %s',
            amanhã: 'amanhã às %s',
            mais tarde: 'em %1 às %2',
        };

        se (janela.lang) {
            PADRÕES_DE_TEMPO = {
                hoje: window.lang['aea2b0aa9ae1534226518faaefffdaad'],
                amanhã: window.lang['57d28d1b211fddbb7a499ead5bf23079'],
                mais tarde: window.lang['0cb274c906d622fa8ce524bcfbb7552d'],
            };
        }

        deixe todayPattern = new RegExp(
            TIME_PATTERNS.today.replace('%s', '([\\d+|:]+)')
        ).exec(timeLand);
        deixe tomorrowPattern = new RegExp(
            TIME_PATTERNS.tomorrow.replace('%s', '([\\d+|:]+)')
        ).exec(timeLand);
        deixe laterDatePattern = novo RegExp(
            TIME_PATTERNS.mais tarde
                .substituir('%1', '([\\d+|\\.]+)')
                .substituir('%2', '([\\d+|:]+)')
        ).exec(timeLand);

        se (todayPattern !== nulo) {
            // hoje
            dataLand =
                serverDate[0] +
                '/' +
                serverDate[1] +
                '/' +
                serverDate[2] +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        } senão se (tomorrowPattern !== null) {
            // amanhã
            deixe tomorrowDate = nova Data(
                data_do_servidor[1] + '/' + data_do_servidor[0] + '/' + data_do_servidor[2]
            );
            data_amanhã.setDate(data_amanhã.getDate() + 1);
            dataLand =
                ('0' + tomorrowDate.getDate()).slice(-2) +
                '/' +
                ('0' + (tomorrowDate.getMonth() + 1)).slice(-2) +
                '/' +
                dataamanhã.obterAnoCompleto() +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        } outro {
            // sobre
            deixe em = timeLand.match(/\d+.\d+/)[0].split('.');
            dataLand =
                em[0] +
                '/' +
                em[1] +
                '/' +
                serverDate[2] +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        }

        data de retornoTerra;
    },
    getTravelTimeInSecond: função (distância, velocidade unitária) {
        deixe travelTime = distância * velocidade unitária * 60;
        se (tempodeviagem % 1 > 0,5) {
            retornar (tempodeviagem += 1);
        } outro {
            Tempo de viagem de retorno;
        }
    },
    getTribeMembersById: função (tribeIds, jogadores) {
        const tribeMemberIds = [];
        jogadores.paraCada((jogador) => {
            se (tribeIds.includes(parseInt(jogador[2]))) {
                tribeMemberIds.push(parseInt(jogador[0]));
            }
        });
        retornar tribeMemberIds;
    },
    getTroop: função (unidade) {
        retornar parseInt(
            document.units[unidade].parentNode
                .getElementsByTagName('a')[1]
                .innerHTML.match(/\d+/),
            10
        );
    },
    obterPrédiosDaVillage: função () {
        const edifícios = dados_do_jogo.vila.edifícios;
        const villageBuildings = [];

        para (deixe [chave, valor] de Object.entries(edifícios)) {
            se (valor > 0) {
                villageBuildings.push({
                    edifício: chave,
                    nível: valor,
                });
            }
        }

        retornar aldeiaEdifícios;
    },
    getWorldConfig: função assíncrona () {
        const INTERVALO_DE_TEMPO = 60 * 60 * 1000 * 24 * 7;
        const ÚLTIMA_ATUALIZAÇÃO_HORA =
            localStorage.getItem('world_config_last_updated') ?? 0;
        deixe worldConfig = [];

        se (ÚLTIMA_ATUALIZAÇÃO !== nulo) {
            se (Data.parse(nova Data()) >= ÚLTIMA_ATUALIZAÇÃO_HORA + INTERVALO_DE_TEMPO) {
                const resposta = await jQuery.ajax({
                    url: this.worldInfoInterface,
                });
                worldConfig = this.xml2json(jQuery(resposta));
                localStorage.setItem(
                    'configuração_mundial',
                    JSON.stringify(worldConfig)
                );
                localStorage.setItem(
                    'world_config_last_updated',
                    Data.parse(nova Data())
                );
            } outro {
                worldConfig = JSON.parse(localStorage.getItem('world_config'));
            }
        } outro {
            const resposta = await jQuery.ajax({
                url: this.worldInfoInterface,
            });
            worldConfig = this.xml2json(jQuery(resposta));
            localStorage.setItem('world_config', JSON.stringify(unitInfo));
            localStorage.setItem(
                'world_config_last_updated',
                Data.parse(nova Data())
            );
        }

        retornar worldConfig;
    },
    getWorldUnitInfo: função assíncrona () {
        const INTERVALO_DE_TEMPO = 60 * 60 * 1000 * 24 * 7;
        const ÚLTIMA_ATUALIZAÇÃO_HORA =
            localStorage.getItem('units_info_last_updated') ?? 0;
        deixe unitInfo = [];

        se (ÚLTIMA_ATUALIZAÇÃO !== nulo) {
            se (Data.parse(nova Data()) >= ÚLTIMA_ATUALIZAÇÃO_HORA + INTERVALO_DE_TEMPO) {
                const resposta = await jQuery.ajax({
                    url: this.unitInfoInterface,
                });
                unitInfo = this.xml2json(jQuery(resposta));
                localStorage.setItem('units_info', JSON.stringify(unitInfo));
                localStorage.setItem(
                    'unidades_info_última_atualização',
                    Data.parse(nova Data())
                );
            } outro {
                unitInfo = JSON.parse(localStorage.getItem('units_info'));
            }
        } outro {
            const resposta = await jQuery.ajax({
                url: this.unitInfoInterface,
            });
            unitInfo = this.xml2json(jQuery(resposta));
            localStorage.setItem('units_info', JSON.stringify(unitInfo));
            localStorage.setItem(
                'unidades_info_última_atualização',
                Data.parse(nova Data())
            );
        }

        retornar unitInfo;
    },
    groupArrayByProperty: função (matriz, propriedade, filtro) {
        retornar array.reduce(função (acumulador, objeto) {
            // obtenha o valor do nosso objeto (idade no nosso caso) para usar para agrupar o array como a chave do array
            const key = objeto[propriedade];
            // se o valor atual for semelhante à chave(idade), não acumule o array transformado e deixe-o vazio
            se (!acumulador[chave]) {
                acumulador[chave] = [];
            }
            // adicione o valor ao array
            acumulador[chave].push(objeto[filtro]);
            // retorna o array transformado
            acumulador de retorno;
            // Também definimos o valor inicial de reduce() para um objeto vazio
        }, {});
    },
    isArcherWorld: função () {
        retornar this.units.includes('archer');
    },
    isChurchWorld: função () {
        retornar 'igreja' em this.village.buildings;
    },
    isPaladinWorld: função () {
        retornar this.units.includes('cavaleiro');
    },
    isWatchTowerWorld: função () {
        retornar 'torre de vigia' em this.village.buildings;
    },
    loadJS: função (url, retorno de chamada) {
        deixe scriptTag = document.createElement('script');
        scriptTag.src = url;
        scriptTag.onload = retorno de chamada;
        scriptTag.onreadystatechange = retorno de chamada;
        documento.corpo.appendChild(scriptTag);
    },
    redirectTo: função (localização) {
        window.location.assign(game_data.link_base_pure + localização);
    },
    removeDuplicateObjectsFromArray: função (matriz, prop) {
        retornar array.filter((obj, pos, arr) => {
            retornar arr.map((mapObj) => mapObj[prop]).indexOf(obj[prop]) === pos;
        });
    },
    renderBoxWidget: função (corpo, id, mainClass, customStyle) {
        const globalStyle = this.addGlobalStyle();

        conteúdo constante = `
            <div class="${mainClass} ra-box-widget" id="${id}">
                <div classe="${mainClass}-header">
                    <h3>${this.tt(this.scriptData.name)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${corpo}
                </div>
                <div classe="${mainClass}-footer">
                    <pequeno>
                        <forte>
                            ${this.tt(this.scriptData.name)} ${
            this.scriptData.versão
        }
                        </strong> -
                        <a href="${
                            this.scriptData.authorUrl
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.scriptData.author}
                        </a> -
                        <a href="${
                            this.scriptData.helpLink
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.tt('Ajuda')}
                        </a>
                    </pequeno>
                </div>
            </div>
            <estilo>
                .${mainClass} { posição: relativa; exibição: bloco; largura: 100%; altura: automático; limpar: ambos; margem: 10px 0 15px; borda: 1px sólido #603000; tamanho da caixa: caixa de borda; plano de fundo: #f4e4bc; }
                .${mainClass} * { tamanho da caixa: caixa de borda; }
                .${mainClass} > div { preenchimento: 10px; }
                .${mainClass} .btn-confirm-yes { preenchimento: 3px; }
                .${mainClass}-header { display: flex; align-items: center; justify-content: space-between; background-color: #c1a264 !important; background-image: url(/graphic/screen/tableheader_bg3.png); background-repeat: repeat-x; }
                .${mainClass}-header h3 { margem: 0; preenchimento: 0; altura da linha: 1; }
                .${mainClass}-body p { tamanho da fonte: 14px; }
                .${mainClass}-body label { display: bloco; espessura da fonte: 600; margem inferior: 6px; }
                
                ${estilo global}

                /* Estilo personalizado */
                ${estilo personalizado}
            </estilo>
        `;

        se (jQuery(`#${id}`).comprimento < 1) {
            jQuery('#contentContainer').prepend(conteúdo);
            jQuery('#mobileContent').prepend(conteúdo);
        } outro {
            jQuery(`.${mainClass}-body`).html(corpo);
        }
    },
    renderFixedWidget: função (
        corpo,
        eu ia,
        Classe principal,
        estilo personalizado,
        largura,
        customName = this.scriptData.nome
    ) {
        const globalStyle = this.addGlobalStyle();

        conteúdo constante = `
            <div class="${mainClass} ra-widget-fixo" id="${id}">
                <div classe="${mainClass}-header">
                    <h3>${this.tt(nomepersonalizado)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${corpo}
                </div>
                <div classe="${mainClass}-footer">
                    <pequeno>
                        <forte>
                            ${this.tt(nomepersonalizado)} ${this.scriptData.versão}
                        </strong> -
                        <a href="${
                            this.scriptData.authorUrl
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.scriptData.author}
                        </a> -
                        <a href="${
                            this.scriptData.helpLink
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.tt('Ajuda')}
                        </a>
                    </pequeno>
                </div>
                <a class="popup_box_close botão-de-fechamento-personalizado" href="#"> </a>
            </div>
            <estilo>
                .${mainClass} { posição: fixa; topo: 10vw; direita: 10vw; índice z: 99999; borda: 2px sólido #7d510f; raio da borda: 10px; preenchimento: 10px; largura: ${
            largura ?? '360px'
        }; overflow-y: auto; preenchimento: 10px; plano de fundo: #e3d5b3 url('/graphic/index/main_bg.jpg') rolar para a direita superior repetir; }
                .${mainClass} * { tamanho da caixa: caixa de borda; }

                ${estilo global}

                /* Estilo personalizado */
                .custom-close-button { direita: 0; topo: 0; }
                ${estilo personalizado}
            </estilo>
        `;

        se (jQuery(`#${id}`).comprimento < 1) {
            se (dispositivo móvel) {
                jQuery('#content_value').prepend(conteúdo);
            } outro {
                jQuery('#contentContainer').prepend(conteúdo);
                jQuery(`#${id}`).arrastável({
                    cancelar: '.ra-table, entrada, área de texto, botão, selecionar, opção',
                });

                jQuery(`#${id} .custom-close-button`).on('clique', função (e) {
                    e.preventDefault();
                    jQuery(`#${id}`).remove();
                });
            }
        } outro {
            jQuery(`.${mainClass}-body`).html(corpo);
        }
    },
    scriptInfo: função (scriptData = this.scriptData) {
        retornar `[${scriptData.name} ${scriptData.version}]`;
    },
    secondsToHms: função (carimbo de data/hora) {
        const horas = Math.floor(timestamp / 60 / 60);
        const minutos = Math.floor(timestamp / 60) - horas * 60;
        const segundos = timestamp % 60;
        retornar (
            horas.toString().padStart(2, '0') +
            ':' +
            minutos.toString().padStart(2, '0') +
            ':' +
            segundos.toString().padStart(2, '0')
        );
    },
    setUpdateProgress: função (elementoParaAtualizar, valorParaDefinir) {
        jQuery(elementoParaAtualizar).texto(valorParaDefinir);
    },
    sortArrayOfObjectsByKey: função (matriz, chave) {
        retornar array.sort((a, b) => b[chave] - a[chave]);
    },
    startProgressBar: função (total) {
        const largura = jQuery('#content_value')[0].clientWidth;
        const preloaderContent = `
            <div id="barra de progresso" class="barra de progresso" style="margem inferior:12px;">
                <span class="count label">0/${total}</span>
                <div id="progresso">
                    <span class="count label" style="largura: ${width}px;">
                        0/${total}
                    </span>
                </div>
            </div>
        `;

        se (isto é móvel) {
            jQuery('#content_value').eq(0).prepend(preloaderContent);
        } outro {
            jQuery('#contentContainer').eq(0).prepend(preloaderContent);
        }
    },
    sumOfArrayItemValues: função (matriz) {
        retornar array.reduce((a, b) => a + b, 0);
    },
    randomItemPickerString: função (itens, divisor = ' ') {
        const itemsArray = itens.split(divisor);
        const chosenIndex = Math.floor(Math.random() * itemsArray.length);
        retornar itemsArray[chosenIndex];
    },
    randomItemPickerArray: função (itens) {
        const chosenIndex = Math.floor(Math.random() * itens.length);
        retornar itens[índiceEscolha];
    },
    timeAgo: função (segundos) {
        var intervalo = segundos/31536000;
        se (intervalo > 1) retornar Math.floor(intervalo) + ' Y';

        intervalo = segundos / 2592000;
        se (intervalo > 1) retornar Math.floor(intervalo) + ' M';

        intervalo = segundos / 86400;
        se (intervalo > 1) retornar Math.floor(intervalo) + ' D';

        intervalo = segundos / 3600;
        se (intervalo > 1) retornar Math.floor(intervalo) + ' H';

        intervalo = segundos / 60;
        se (intervalo > 1) retornar Math.floor(intervalo) + ' m';

        retornar Math.floor(segundos) + ' s';
    },
    tt: função (string) {
        se (this.translations[game_data.locale] !== indefinido) {
            retornar isto.translations[game_data.locale][string];
        } outro {
            retornar isto.translations['en_DK'][string];
        }
    },
    toggleUploadButtonStatus: função (elementoToToggle) {
        jQuery(elementToToggle).attr('desativado', (i, v) => !v);
    },
    updateProgress: função (elementoToUpate, itemsLength, índice) {
        jQuery(elementToUpate).text(`${index}/${itemsLength}`);
    },
    updateProgressBar: função (índice, total) {
        jQuery('#progress').css('largura', `${((índice + 1) / total) * 100}%`);
        jQuery('.count').text(`${index + 1}/${total}`);
        se (índice + 1 == total) {
            jQuery('#progressbar').fadeOut(1000);
        }
    },
    xml2json: função ($xml) {
        deixe dados = {};
        const _self = isto;
        $.each($xml.children(), função (i) {
            deixe $this = $(this);
            se ($this.children().length > 0) {
                dados[$this.prop('tagName')] = _self.xml2json($this);
            } outro {
                dados[$this.prop('tagName')] = $.trim($this.text());
            }
        });
        retornar dados;
    },
    worldDataAPI: função assíncrona (entidade) {
        const TIME_INTERVAL = 60 * 60 * 1000; // busca dados a cada hora
        const ÚLTIMA_ATUALIZAÇÃO = localStorage.getItem(
            `${entity}_last_updated`
        );

        // verifique se a entidade é permitida e pode ser buscada
        const allowedEntities = ['vila', 'jogador', 'aliado', 'conquistar'];
        se (!allowedEntities.includes(entidade)) {
            lançar novo erro(`A entidade ${entity} não existe!`);
        }

        // dados mundiais iniciais
        const worldData = {};

        const dbConfig = {
            aldeia: {
                dbName: 'villagesDb',
                dbTable: 'vilas',
                chave: 'villageId',
                url: twSDK.worldDataVillages,
            },
            jogador: {
                Nome do banco de dados: 'playersDb',
                dbTable: 'jogadores',
                chave: 'playerId',
                url: twSDK.worldDataPlayers,
            },
            aliado: {
                Nome do banco de dados: 'tribesDb',
                dbTable: 'tribos',
                chave: 'tribeId',
                url: twSDK.worldDataTribes,
            },
            conquistar: {
                Nome do banco de dados: 'conquerDb',
                dbTable: 'conquistar',
                chave: '',
                url: twSDK.worldDataConquests,
            },
        };

        // Auxiliares: buscam dados da entidade e salvam no localStorage
        const fetchDataAndSave = async() => {
            const DATA_URL = dbConfig[entidade].url;

            tentar {
                // buscar dados
                const resposta = await jQuery.ajax(DATA_URL);
                const data = twSDK.csvToArray(resposta);
                deixe responseData = [];

                // preparar dados para serem salvos no banco de dados
                switch (entidade) {
                    caso 'vila':
                        responseData = dados
                            .filter((item) => {
                                se (item[0] != '') {
                                    devolver item;
                                }
                            })
                            .mapa((item) => {
                                retornar {
                                    villageId: parseInt(item[0]),
                                    Nome da vila: twSDK.cleanString(item[1]),
                                    aldeiaX: item[2],
                                    aldeiaY: item[3],
                                    playerId: parseInt(item[4]),
                                    vilaPoints: parseInt(item[5]),
                                    vilaType: parseInt(item[6]),
                                };
                            });
                        quebrar;
                    caso 'jogador':
                        responseData = dados
                            .filter((item) => {
                                se (item[0] != '') {
                                    devolver item;
                                }
                            })
                            .mapa((item) => {
                                retornar {
                                    playerId: parseInt(item[0]),
                                    nome do jogador: twSDK.cleanString(item[1]),
                                    tribeId: parseInt(item[2]),
                                    aldeias: parseInt(item[3]),
                                    pontos: parseInt(item[4]),
                                    classificação: parseInt(item[5]),
                                };
                            });
                        quebrar;
                    caso 'aliado':
                        responseData = dados
                            .filter((item) => {
                                se (item[0] != '') {
                                    devolver item;
                                }
                            })
                            .mapa((item) => {
                                retornar {
                                    tribeId: parseInt(item[0]),
                                    nome da tribo: twSDK.cleanString(item[1]),
                                    tribeTag: twSDK.cleanString(item[2]),
                                    jogadores: parseInt(item[3]),
                                    aldeias: parseInt(item[4]),
                                    pontos: parseInt(item[5]),
                                    allPoints: parseInt(item[6]),
                                    classificação: parseInt(item[7]),
                                };
                            });
                        quebrar;
                    caso 'conquistar':
                        responseData = dados
                            .filter((item) => {
                                se (item[0] != '') {
                                    devolver item;
                                }
                            })
                            .mapa((item) => {
                                retornar {
                                    villageId: parseInt(item[0]),
                                    unixTimestamp: parseInt(item[1]),
                                    novoPlayerId: parseInt(item[2]),
                                    novoPlayerId: parseInt(item[3]),
                                    oldTribeId: parseInt(item[4]),
                                    novoTribeId: parseInt(item[5]),
                                    vilaPoints: parseInt(item[6]),
                                };
                            });
                        quebrar;
                    padrão:
                        retornar [];
                }

                // salvar dados no banco de dados
                salvar em armazenamento DB indexado (
                    dbConfig[entidade].dbName,
                    dbConfig[entidade].dbTable,
                    dbConfig[entidade].chave,
                    dados de resposta
                );

                // atualiza o último item localStorage atualizado
                localStorage.setItem(
                    `${entity}_last_updated`,
                    Data.parse(nova Data())
                );

                retornar responseData;
            } pegar (erro) {
                throw Error(`Erro ao buscar ${DATA_URL}`);
            }
        };

        // Auxiliares: Salvar no armazenamento IndexedDb
        função assíncrona saveToIndexedDbStorage(dbName, tabela, keyId, dados) {
            const dbConnect=indexedDB.open(dbName);

            dbConnect.onupgradeneeded = função () {
                const db = dbConnect.result;
                se (keyId.length) {
                    db.createObjectStore(tabela, {
                        keyPath: keyId,
                    });
                } outro {
                    db.createObjectStore(tabela, {
                        autoIncremento: verdadeiro,
                    });
                }
            };

            dbConnect.onsuccess = função () {
                const db = dbConnect.result;
                const transação = db.transaction(tabela, 'leitura/gravação');
                const store = transação.objectStore(tabela);
                store.clear(); // limpa a loja de itens antes de adicionar novos

                dados.paraCada((item) => {
                    armazenar.put(item);
                });

                UI.SuccessMessage('Banco de dados atualizado!');
            };
        }

        // Auxiliares: Ler todas as aldeias do indexedDB
        function getAllData(nomedobd, tabela) {
            retornar nova Promessa((resolver, rejeitar) => {
                const dbConnect=indexedDB.open(dbName);

                dbConnect.onsuccess = () => {
                    const db = dbConnect.result;

                    const dbQuery = db
                        .transaction(tabela, 'leitura e gravação')
                        .objectStore(tabela)
                        .obterTudo();

                    dbQuery.onsuccess = (evento) => {
                        resolver(evento.alvo.resultado);
                    };

                    dbQuery.onerror = (evento) => {
                        rejeitar(evento.alvo.erro);
                    };
                };

                dbConnect.onerror = (evento) => {
                    rejeitar(evento.alvo.erro);
                };
            });
        }

        // Auxiliares: Transformam um array de objetos em um array de arrays
        função objectToArray(matrizDeObjetos, entidade) {
            switch (entidade) {
                caso 'vila':
                    retornar arrayOfObjects.map((item) => [
                        item.vilaId,
                        item.vilaNome,
                        item.vilaX,
                        item.vilaY,
                        item.playerId,
                        item.villagePoints,
                        item.vilaTipo,
                    ]);
                caso 'jogador':
                    retornar arrayOfObjects.map((item) => [
                        item.playerId,
                        item.playerName,
                        item.tribeId,
                        item.vilas,
                        item.pontos,
                        item.classificação,
                    ]);
                caso 'aliado':
                    retornar arrayOfObjects.map((item) => [
                        item.tribeId,
                        item.tribeName,
                        item.tribeTag,
                        item.jogadores,
                        item.vilas,
                        item.pontos,
                        item.allPoints,
                        item.classificação,
                    ]);
                caso 'conquistar':
                    retornar arrayOfObjects.map((item) => [
                        item.vilaId,
                        item.unixTimestamp,
                        item.newPlayerId,
                        item.newPlayerId,
                        item.oldTribeId,
                        item.newTribeId,
                        item.villagePoints,
                    ]);
                padrão:
                    retornar [];
            }
        }

        // decidir o que fazer com base no horário atual e no último horário de atualização da entidade
        se (ÚLTIMA_ATUALIZAÇÃO !== nulo) {
            se (
                Data.parse(nova Data()) >=
                parseInt(ÚLTIMA_ATUALIZAÇÃO_HORA) + INTERVALO_DE_TEMPO
            ) {
                worldData[entidade] = await fetchDataAndSave();
            } outro {
                worldData[entidade] = await getAllData(
                    dbConfig[entidade].dbName,
                    dbConfig[entidade].dbTable
                );
            }
        } outro {
            worldData[entidade] = await fetchDataAndSave();
        }

        // transforma os dados para que no final seja retornado um array de arrays
        worldData[entidade] = objectToArray(worldData[entidade], entidade);

        retornar worldData[entidade];
    },
    zeroPad: função (num, contagem) {
        var numZeropad = num + '';
        enquanto (numZeropad.length < contagem) {
            numZeropad = '0' + numZeropad;
        }
        retornar numZeropad;
    },

    // inicializar biblioteca
    init: função assíncrona (scriptConfig) {
        constante {
            scriptData,
            traduções,
            mercados permitidos,
            Telas permitidas,
            ModosPermitidos,
            éDepurar,
            enableCountApi,
        } = scriptConfig;

        this.scriptData = scriptData;
        this.translations = traduções;
        this.allowedMarkets = mercadospermitidos;
        this.allowedScreens = TelasPermitidas;
        this.allowedModes = ModosPermitidos;
        isto.enableCountApi = enableCountApi;
        isto.isDebug = éDepuração;

        twSDK._initDebug();
        twSDK._countAPI();
    },
};

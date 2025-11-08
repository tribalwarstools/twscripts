var scriptData = {
    name: 'Mass Attack Planner',
    version: 'v1.1.8',
    author: 'RedAlert',
    authorUrl: 'https://twscripts.dev/',
    helpLink:
        'https://forum.tribalwars.net/index.php?threads/mass-attack-planner.285331/',
};

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Local Storage
var LS_PREFIX = `ra_massAttackPlanner_`;
var TIME_INTERVAL = 60 * 60 * 1000 * 24 * 30; /* fetch data every 30 days */
var LAST_UPDATED_TIME = localStorage.getItem(`${LS_PREFIX}_last_updated`) ?? 0;

var unitInfo;

// Init Debug
initDebug();

/* Fetch unit info only when needed */
(function () {
    if (LAST_UPDATED_TIME !== null) {
        if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
            fetchUnitInfo();
        } else {
            unitInfo = JSON.parse(localStorage.getItem(`${LS_PREFIX}_unit_info`));
            init(unitInfo);
        }
    } else {
        fetchUnitInfo();
    }
})();

// Script Initializer
function init(unitInfo) {
    var currentDateTime = getCurrentDateTime();

    // fix for no paladin worlds
    let knightSpeed = 0;
    const worldUnits = game_data.units;
    if (worldUnits.includes('knight')) {
        knightSpeed = unitInfo?.config['knight'].speed || 0;
    }

    const content = `
        <div class="map-block">
            <label for="arrival_time">Arrival Time</label>
            <input id="arrival_time" type="text" placeholder="yyyy-mm-dd hh:mm:ss" value="${currentDateTime}">
        </div>

        <input type="hidden" id="nobleSpeed" value="${unitInfo.config['snob'].speed}" />

        <div class="map-flex">
            <div class="map-flex-col">
                <div class="map-block">
                    <label>Slowest Nuke unit</label>
                    <div class="unit-selector">
                        <label><input type="radio" name="nuke_unit_radio" value="${unitInfo.config['axe'].speed}"> <img src="/graphic/unit/unit_axe.png"></label>
                        <label><input type="radio" name="nuke_unit_radio" value="${unitInfo.config['light'].speed}"> <img src="/graphic/unit/unit_light.png"></label>
                        <label><input type="radio" name="nuke_unit_radio" value="${unitInfo.config['heavy'].speed}"> <img src="/graphic/unit/unit_heavy.png"></label>
                        <label><input type="radio" name="nuke_unit_radio" value="${unitInfo.config['ram'].speed}" checked> <img src="/graphic/unit/unit_ram.png"></label>
                    </div>
                    <input type="hidden" id="nuke_unit" value="${unitInfo.config['ram'].speed}">
                </div>
            </div>

            <div class="map-flex-col">
                <div class="map-block">
                    <label>Slowest Support unit</label>
                    <div class="unit-selector">
                        <label><input type="radio" name="support_unit_radio" value="${unitInfo.config['spear'].speed}"> <img src="/graphic/unit/unit_spear.png"></label>
                        <label><input type="radio" name="support_unit_radio" value="${unitInfo.config['sword'].speed}" checked> <img src="/graphic/unit/unit_sword.png"></label>
                        <label><input type="radio" name="support_unit_radio" value="${unitInfo.config['spy'].speed}"> <img src="/graphic/unit/unit_spy.png"></label>
                        <label><input type="radio" name="support_unit_radio" value="${knightSpeed}"> <img src="/graphic/unit/unit_knight.png"></label>
                        <label><input type="radio" name="support_unit_radio" value="${unitInfo.config['heavy'].speed}"> <img src="/graphic/unit/unit_heavy.png"></label>
                        <label><input type="radio" name="support_unit_radio" value="${unitInfo.config['catapult'].speed}"> <img src="/graphic/unit/unit_catapult.png"></label>
                    </div>
                    <input type="hidden" id="support_unit" value="${unitInfo.config['sword'].speed}">
                </div>
            </div>
        </div>

        <div class="map-block">
            <label for="target_coords">Targets Coords</label>
            <textarea id="target_coords"></textarea>
        </div>

        <div class="map-flex">
            <div class="map-flex-col">
                <label for="nobel_coords">Nobles Coords</label>
                <textarea id="nobel_coords"></textarea>
                <label for="nobel_count">Nobles per Target</label>
                <input id="nobel_count" type="text" value="1">
            </div>
            <div class="map-flex-col">
                <label for="nuke_coords">Nukes Coords</label>
                <textarea id="nuke_coords"></textarea>
                <label for="nuke_count">Nukes per Target</label>
                <input id="nuke_count" type="text" value="1">
            </div>
            <div class="map-flex-col">
                <label for="support_coords">Support Coords</label>
                <textarea id="support_coords"></textarea>
                <label for="support_count">Support per Target</label>
                <input id="support_count" type="text" value="1">
            </div>
        </div>

        <div class="map-block">
            <a id="submit_btn" class="map-btn" onClick="handleSubmit();">Get Plan!</a>
        </div>

        <div class="map-block">
            <label for="results">Results</label>
            <textarea id="results"></textarea>
        </div>

        <script>
            $(function() {
                $('input[name="nuke_unit_radio"]').on('change', function() {
                    $('#nuke_unit').val(this.value);
                });
                $('input[name="support_unit_radio"]').on('change', function() {
                    $('#support_unit').val(this.value);
                });
            });
        </script>
    `;

    const windowContent = prepareWindowContent(content);
    attackPlannerWindow = window.open('', '', 'left=10px,top=10px,width=550,height=720,toolbar=0,resizable=1,location=0,menubar=0,scrollbars=1,status=0');
    attackPlannerWindow.document.write(windowContent);
}

// Helper: Window Content
function prepareWindowContent(windowBody) {
    const windowHeader = `<h1 class="map-title">${scriptData.name}</h1>`;
    const windowFooter = `<small><strong>${scriptData.name} ${scriptData.version}</strong> - <a href="${scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">${scriptData.author}</a> - <a href="${scriptData.helpLink}" target="_blank" rel="noreferrer noopener">Help</a></small>`;
    const windowStyle = `
        <style>
            body { background-color: #f9f7f1; font-family: Verdana, Arial, sans-serif; font-size: 14px; color: #3a2d0c; margin: 10px; }
            h1.map-title { font-size: 18px; margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="text"], textarea { width: 100%; padding: 5px; border: 1px solid #c9b79c; border-radius: 3px; margin-bottom: 10px; box-sizing: border-box; }
            textarea { min-height: 60px; resize: vertical; }
            .map-btn { padding: 10px 20px; background-color: #7b4c0a; color: #fff; font-weight: bold; border-radius: 4px; text-align: center; display: inline-block; cursor: pointer; }
            .map-block { margin-bottom: 15px; }
            .map-flex { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
            .map-flex-col { flex: 1 1 30%; }
            .unit-selector label { margin-right: 10px; cursor: pointer; }
            .unit-selector img { width: 24px; vertical-align: middle; margin-left: 3px; }
        </style>
    `;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${scriptData.name} ${scriptData.version}</title>
            ${windowStyle}
        </head>
        <body>
            <main>
                ${windowHeader}
                ${windowBody}
                ${windowFooter}
            </main>

            <script>
                function loadJS(url, callback) {
                    var scriptTag = document.createElement('script');
                    scriptTag.src = url;
                    scriptTag.onload = callback;
                    scriptTag.onreadystatechange = callback;
                    document.body.appendChild(scriptTag);
                }
                loadJS('https://code.jquery.com/jquery-3.6.0.min.js', function() {
                    loadJS('https://twscripts.dev/scripts/attackPlannerHelper.js', function() {
                        console.log('Helper libraries loaded!');
                    });
                });
            </script>
        </body>
        </html>
    `;
    return html;
}

// Helper: Get current datetime
function getCurrentDateTime() {
    let d = new Date();
    return `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')} ${`${d.getHours()}`.padStart(2,'0')}:${`${d.getMinutes()}`.padStart(2,'0')}:${`${d.getSeconds()}`.padStart(2,'0')}`;
}

/* Helper: Fetch World Unit Info */
function fetchUnitInfo() {
    jQuery
        .ajax({
            url: '/interface.php?func=get_unit_info',
        })
        .done(function (response) {
            unitInfo = xml2json($(response));
            localStorage.setItem(`${LS_PREFIX}_unit_info`, JSON.stringify(unitInfo));
            localStorage.setItem(`${LS_PREFIX}_last_updated`, Date.parse(new Date()));
            init(unitInfo);
        });
}

// XML → JSON
var xml2json = function ($xml) {
    var data = {};
    $.each($xml.children(), function (i) {
        var $this = $(this);
        if ($this.children().length > 0) {
            data[$this.prop('tagName')] = xml2json($this);
        } else {
            data[$this.prop('tagName')] = $.trim($this.text());
        }
    });
    return data;
};

function scriptInfo() {
    return `[${scriptData.name} ${scriptData.version}]`;
}

function initDebug() {
    console.debug(`${scriptInfo()} It works!`);
}

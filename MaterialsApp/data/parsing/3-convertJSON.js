
var path = require('path');
var fs = require('fs');

/*var json = JSON.parse(fs.readFileSync('data/all.json', 'utf8'));

for (var i = 0, l = json.length; i < l; i++) {
    var item = json[i].split(';');

    if (item.length != 8) {
        throw '1';
    }

    var item1 = item[1];

    if (item1.charAt(0) == "'") {
        item1 = item1.slice(1);
    }

    if (item1.charAt(item1.length -1) == "'") {
        item1 = item1.slice(0, -1);
    }

    if (item1.indexOf("'") != -1) {
        console.log(item);
        throw '2';
    }

    item[1] = item1;

    json[i] = item.join(';');
}

fs.writeFileSync('data/all2.json', JSON.stringify(json), 'utf8');

console.log('Ok');*/


/*var json = JSON.parse(fs.readFileSync('data/all2.json', 'utf8'));

for (var i = 0, l = json.length; i < l; i++) {
    var item = json[i];

    if (item.slice(-2) != ';1') {
        console.log(item);
        throw '1';
    }

    json[i] = item.slice(0, -2);
}

fs.writeFileSync('data/all3.json', JSON.stringify(json), 'utf8');*/


/*var json = JSON.parse(fs.readFileSync('data/all3.json', 'utf8'));

var types = {
    __proto__: null,
    'д;Дерево': 1,
    'к;Кирпич': 1,
    'п;Панель': 1,
    'б;Бетон': 1,
    'м;Металл': 1,
    ';Нет информации / Неизвестный материал': 1
};

for (var i = 0, l = json.length; i < l; i++) {
    var item = json[i].split(';');

    if (!(item.slice(-2).join(';') in types)) {
        console.log(item);
        throw '1';
    }

    json[i] = item.slice(0, -1).join(';');
}

fs.writeFileSync('data/all4.json', JSON.stringify(json), 'utf8');*/


/*var types = {
    __proto__: null,

    'д': 'Дерево',
    'к': 'Кирпич',
    'п': 'Панель',
    'б': 'Бетон',
    'м': 'Металл',
    '': 'Undefined'
};

var json = JSON.parse(fs.readFileSync('data/all4.json', 'utf8'));

var result = { __proto__: null };

for (var i = 0, l = json.length; i < l; i++) {
    var item = json[i].split(';');
    var item0 = item[0];
    var item5 = item[5];

    var city = result[item0] || (result[item0] = {});
    var type = city[types[item5]] || (city[types[item5]] = {});

    type[item[1]] = [item[2], item[3], item[4]];
}

fs.writeFileSync('data/all5.json', JSON.stringify(result), 'utf8');*/


/**
 * @param {string} str
 * @returns {string}
 */
function toCamel(str) {
    return str.replace(/\W+(\w?)/g, function(match, chr) {
        return chr.toUpperCase();
    });
}

var transliteration = require('transliteration.cyr');

var index = [];

var coords = {
    Volgograd: [48.74362, 44.50425],
    Voronezh: [51.66073, 39.200594],
    Ekaterynburg: [56.839656381384216, 60.616420410349818],
    Kazan: [55.797601775811387, 49.103487955454554],
    Krasnoiarsk: [56.0054976788325, 92.830744681366028],
    Moskva: [55.753466, 37.62017],
    NyzhnyiNovgorod: [56.325883629590777, 43.991050427169455],
    Novosybyrsk: [55.026472, 82.921475],
    Omsk: [54.962357, 73.393009],
    Perm: [58.009248091788066, 56.223394926939079],
    RostovNaDonu: [47.222099166157996, 39.69177143437188],
    Samara: [53.194952720681229, 50.10423057974846],
    SanktPeterburg: [59.937577, 30.283631],
    Ufa: [54.731778818354414, 55.945969234546823],
    Cheliabynsk: [55.157388843469953, 61.40270938891512]
};

var json = JSON.parse(fs.readFileSync(path.join(__dirname, './all5.json'), 'utf8'));

for (var cityName in json) {
    var transliteratedCityName = toCamel(transliteration.transliterate(cityName));

    index.push({
        name: cityName,
        transliteratedName: transliteratedCityName,
        coords: coords[transliteratedCityName]
    });

    fs.writeFileSync(
        path.join(__dirname, '../cities/materials/' + transliteratedCityName + '.jsonp'),
        '_setCityMaterials(' + JSON.stringify(json[cityName]) + ');',
        'utf8'
    );
}

fs.writeFileSync(
    path.join(__dirname, '../cities/index.jsonp'),
    '_setCitiesIndex(' + JSON.stringify(index) + ');',
    'utf8'
);


//var json = JSON.parse(fs.readFileSync('data/all4.json', 'utf8'));

//console.log(JSON.stringify(json.slice(0, 10)));

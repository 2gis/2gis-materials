
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
    Ekaterinburg: [56.839656381384216, 60.616420410349818],
    Kazan: [55.797601775811387, 49.103487955454554],
    Krasnoyarsk: [56.0054976788325, 92.830744681366028],
    Moscow: [55.753466, 37.62017],
    NizhniyNovgorod: [56.325883629590777, 43.991050427169455],
    Novosibirsk: [55.026472, 82.921475],
    Omsk: [54.962357, 73.393009],
    Perm: [58.009248091788066, 56.223394926939079],
    RostovNaDonu: [47.222099166157996, 39.69177143437188],
    Samara: [53.194952720681229, 50.10423057974846],
    SaintPetersburg: [59.937577, 30.283631],
    Ufa: [54.731778818354414, 55.945969234546823],
    Chelyabinsk: [55.157388843469953, 61.40270938891512]
};

var transliteratedCityNameMap = {
    Volgograd: 'Volgograd',
    Voronezh: 'Voronezh',
    Ekaterynburg: 'Ekaterinburg',
    Kazan: 'Kazan',
    Krasnoiarsk: 'Krasnoyarsk',
    Moskva: 'Moscow',
    NyzhnyiNovgorod: 'NizhniyNovgorod',
    Novosybyrsk: 'Novosibirsk',
    Omsk: 'Omsk',
    Perm: 'Perm',
    RostovNaDonu: 'RostovNaDonu',
    Samara: 'Samara',
    SanktPeterburg: 'SaintPetersburg',
    Ufa: 'Ufa',
    Cheliabynsk: 'Chelyabinsk'
};

var urlNames = {
    Volgograd: { urlName: 'Volgograd' },
    Voronezh: { urlName: 'Voronezh' },
    Ekaterinburg: { urlName: 'Ekaterinburg', shortURLName: 'ekb' },
    Kazan: { urlName: 'Kazan' },
    Krasnoyarsk: { urlName: 'Krasnoyarsk', shortURLName: 'krsk' },
    Moscow: { urlName: 'Moscow', shortURLName: 'msk' },
    NizhniyNovgorod: { urlName: 'NNovgorod', shortURLName: 'nnov' },
    Novosibirsk: { urlName: 'Novosibirsk', shortURLName: 'nsk' },
    Omsk: { urlName: 'Omsk' },
    Perm: { urlName: 'Perm' },
    RostovNaDonu: { urlName: 'RostovNaDonu' },
    Samara: { urlName: 'Samara' },
    SaintPetersburg: { urlName: 'SaintPetersburg', shortURLName: 'spb' },
    Ufa: { urlName: 'Ufa' },
    Chelyabinsk: { urlName: 'Chelyabinsk' }
};

var json = JSON.parse(fs.readFileSync(path.join(__dirname, './all5.json'), 'utf8'));

for (var cityName in json) {
    var transliteratedCityName = transliteratedCityNameMap[toCamel(transliteration.transliterate(cityName))];

    index.push({
        name: cityName,
        transliteratedName: transliteratedCityName,
        urlName: urlNames[transliteratedCityName].urlName,
        shortURLName: urlNames[transliteratedCityName].shortURLName,
        coords: coords[transliteratedCityName]
    });

	Object.keys(json[cityName]).forEach(function(materialName) {
		var dataByMaterial = this[materialName];

		this[materialName] = Object.keys(dataByMaterial).reduce(function(newDataByMaterial, itemId) {
			var item = dataByMaterial[itemId];
			newDataByMaterial.push([Number(Number(item[0]).toFixed(5)), Number(Number(item[1]).toFixed(5))]);
			return newDataByMaterial;
		}, []);
	}, json[cityName]);

	//console.log(JSON.stringify(json[cityName]));
	//break;

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

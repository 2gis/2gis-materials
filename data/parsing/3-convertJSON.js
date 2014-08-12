
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


var transliteration = require('transliteration.cyr');

var index = [];

var json = JSON.parse(fs.readFileSync('data/parsing/all5.json', 'utf8'));

for (var cityName in json) {
    var transliteratedCityName = transliteration.transliterate(cityName);

    index.push({ name: cityName, transliteratedName: transliteratedCityName });

    fs.writeFileSync(
        'data/cities/materials/' + transliteratedCityName + '.jsonp',
        '_setData(' + JSON.stringify(json[cityName]) + ');',
        'utf8'
    );
}

fs.writeFileSync('data/cities/index.jsonp', '_setData(' + JSON.stringify(index) + ');', 'utf8');


//var json = JSON.parse(fs.readFileSync('data/all4.json', 'utf8'));

//console.log(JSON.stringify(json.slice(0, 10)));

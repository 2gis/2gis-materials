var fs = require('fs');

var json1 = JSON.parse(fs.readFileSync('data/id1-1.json', 'utf8'));
var json2 = JSON.parse(fs.readFileSync('data/id2-2.json', 'utf8'));

var result = json1.concat(json2);

fs.writeFileSync('data/all.json', JSON.stringify(result), 'utf8');

console.log(result.length);


var node_cj = require('node-csv-json');

node_cj({
    input: 'data/id2.csv',
    output: 'data/id2.json'
}, function(err, result) {
    if (err) {
        console.error(err);
    } else {
        console.log(result)
    }
});


/**
 * @param {string} str
 * @param {Array} values
 * @returns {string}
 */
function format(str, values) {
    if (!Array.isArray(values)) {
        values = Array.prototype.slice.call(arguments, 1);
    }

    return str.replace(/%(\d+)/g, function(match, num) {
        return values[Number(num) - 1];
    });
}

exports.format = format;

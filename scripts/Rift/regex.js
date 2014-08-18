
/**
 * @param {string} re
 * @returns {string}
 */
function escapeRegExp(re) {
    return re.replace(/([?![+\-\.]^|{}(=:)$\/\\*])/g, '\\$1');
}

exports.escape = escapeRegExp;

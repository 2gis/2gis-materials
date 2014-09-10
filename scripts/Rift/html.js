
/**
 * @param {string} str
 * @returns {string}
 */
function escape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.escape = escape;

/**
 * @param {string} str
 * @returns {string}
 */
function whitespaceToHTML(str) {
    return str.replace(/\r\n|\r|\n/g, '<br>').replace(/\t/g, '    ').replace(/\s\s/g, ' &nbsp;');
}

exports.whitespaceToHTML = whitespaceToHTML;

/**
 * @param {string} str
 * @returns {string}
 */
function stripTags(str) {
    return str.replace(/<[^>]+>/g, '');
}

exports.stripTags = stripTags;

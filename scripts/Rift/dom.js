
var tmpl = require('./tmpl');
var format = tmpl.format;

/**
 * @param {Node} node
 * @param {Node} ancestor
 * @param {Node} [limitNode]
 * @returns {boolean}
 */
function isDescendantOf(node, ancestor, limitNode) {
    if (limitNode) {
        while (node = node.parentNode) {
            if (node == ancestor) {
                return true;
            }
            if (node == limitNode) {
                break;
            }
        }
    } else {
        while (node = node.parentNode) {
            if (node == ancestor) {
                return true;
            }
        }
    }
    return false;
}

exports.isDescendantOf = isDescendantOf;

/**
 * @param {Node} node
 * @param {Node} ancestor
 * @param {Node} [limitNode]
 * @returns {boolean}
 */
function isSelfOrDescendantOf(node, ancestor, limitNode) {
    return node == ancestor || isDescendantOf(node, ancestor, limitNode);
}

exports.isSelfOrDescendantOf = isSelfOrDescendantOf;

/**
 * @param {string} tagName
 * @param {Object<string>} [attributes]
 * @param {Array<Node|string>|HTMLElement|DocumentFragment} [subnodes]
 * @returns {HTMLElement}
 */
function createElement(tagName, attributes, subnodes) {
    return setElement(document.createElement(tagName), attributes, subnodes);
}

exports.createElement = createElement;

/**
 * @param {string} html
 * @param {Array} [values]
 * @returns {HTMLElement}
 */
function createElementFromHTML(html, values) {
    var el = document.createElement('div');

    if (arguments.length > 1) {
        if (!Array.isArray(values)) {
            values = Array.prototype.slice.call(arguments, 1);
        }

        html = format(html, values);
    }

    el.innerHTML = html;

    return el.childNodes.length == 1 && el.firstChild.nodeType == 1 ? el.firstChild : el;
}

exports.createElementFromHTML = createElementFromHTML;

/**
 * @param {HTMLElement} el
 * @param {Object<string>} [attributes]
 * @param {Array<Node|string>|HTMLElement|DocumentFragment} [subnodes]
 * @returns {HTMLElement}
 */
function setElement(el, attributes, subnodes) {
    if (attributes != null) {
        Object.keys(attributes).forEach(function(name) {
            el.setAttribute(name, attributes[name]);
        });
    }

    if (subnodes != null) {
        if (Array.isArray(subnodes)) {
            subnodes.forEach(function(subnode) {
                el.appendChild(typeof subnode == 'string' ? document.createTextNode(subnode) : subnode);
            });
        } else {
            switch (subnodes.nodeType) {
                case 1: // ELEMENT_NODE
                    moveChildren(subnodes, el);
                    break;
                case 11: // DOCUMENT_FRAGMENT_NODE
                    el.appendChild(subnodes);
                    break;
            }
        }
    }

    return el;
}

exports.setElement = setElement;

/**
 * @param {Node} node
 * @param {Node} target
 * @returns {Node}
 */
function moveChildren(node, target) {
    if (node != target) {
        while (node.firstChild) {
            target.appendChild(node.firstChild);
        }
    }
    return target;
}

exports.moveChildren = moveChildren;

/**
 * @param {Node} node
 * @returns {Node}
 */
function removeNode(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
    return node;
}

exports.removeNode = removeNode;

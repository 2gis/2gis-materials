
(function(undefined) {

    var stringProto = String.prototype;

    /**
     * http://wiki.ecmascript.org/doku.php?id=harmony:number.tointeger
     */
    function toInteger(num) {
        num = Number(num);

        if (num != num) {
            return 0;
        }
        if (num != 0 && isFinite(num)) {
            return (num < 0 ? -1 : 1) * Math.floor(Math.abs(num));
        }
        return num;
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible
     */
    if (!Object.isExtensible) {
        Object.isExtensible = function(obj) {
            return false;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/preventExtensions
     */
    if (!Object.preventExtensions) {
        Object.preventExtensions = function(obj) {
            return obj;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed
     */
    if (!Object.isSealed) {
        Object.isSealed = function(obj) {
            return false;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal
     */
    if (!Object.seal) {
        Object.seal = function(obj) {
            return obj;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen
     */
    if (!Object.isFrozen) {
        Object.isFrozen = function(obj) {
            return false;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
     */
    if (!Object.freeze) {
        Object.freeze = function(obj) {
            return obj;
        };
    }

    /**
     * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign
     */
    if (!Object.assign) {
        Object.assign = function(target, source) {
            if (target == null) {
                throw new TypeError('Can\'t convert ' + target + ' to object');
            }

            target = Object(target);

            for (var i = 1, l = arguments.length; i < l; i++) {
                var nextSource = arguments[i];

                if (nextSource == null) {
                    throw new TypeError('Can\'t convert ' + nextSource + ' to object');
                }

                nextSource = Object(nextSource);

                var keys = Object.keys(nextSource);

                for (var j = 0, m = keys.length; j < m; j++) {
                    target[keys[j]] = nextSource[keys[j]];
                }
            }

            return target;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains
     */
    if (!stringProto.contains) {
        stringProto.contains = function(searchString, position) {
            if (this == null) {
                throw new TypeError('Can\'t convert ' + this + ' to object');
            }

            return String.prototype.indexOf.apply(this, arguments) > -1;
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
     */
    if (!stringProto.startsWith) {
        stringProto.startsWith = function(searchString, position) {
            if (this == null) {
                throw new TypeError('Can\'t convert ' + this + ' to object');
            }

            searchString = String(searchString);
            position = arguments.length >= 2 ? toInteger(position) : 0;

            var str = String(this);
            var startPos = Math.min(Math.max(position, 0), str.length);

            return searchString == str.slice(startPos, startPos + searchString.length);
        };
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
     */
    if (!stringProto.endsWith) {
        stringProto.endsWith = function(searchString, position) {
            if (this == null) {
                throw new TypeError('Can\'t convert ' + this + ' to object');
            }

            searchString = String(searchString);

            var str = String(this);
            var strLength = str.length;

            position = arguments.length >= 2 ? toInteger(position) : strLength;

            var endPos = Math.min(Math.max(position, 0), strLength);

            return searchString == str.substring(endPos - searchString.length, endPos);
        };
    }

    var elementProto = Element.prototype;

    var dummyElement = document.createElement('div');

    if (Object.defineProperty) {
        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode.firstElementChild
         */
        if (dummyElement.firstElementChild === undefined) {
            Object.defineProperty(elementProto, 'firstElementChild', {
                get: function() {
                    return this.children[0] || null;
                }
            });
        }

        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode.lastElementChild
         */
        if (dummyElement.lastElementChild === undefined) {
            Object.defineProperty(elementProto, 'lastElementChild', {
                get: function() {
                    return this.children[this.children.length - 1] || null;
                }
            });
        }

        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/Childnode.previousElementSibling
         */
        if (dummyElement.previousElementSibling === undefined) {
            Object.defineProperty(elementProto, 'previousElementSibling', {
                get: function() {
                    var node = this.previousSibling;

                    while (node && node.nodeType != 1) {
                        node = node.previousSibling;
                    }
                    return node;
                }
            });
        }

        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/ChildNode.nextElementSibling
         */
        if (dummyElement.nextElementSibling === undefined) {
            Object.defineProperty(elementProto, 'nextElementSibling', {
                get: function() {
                    var node = this.nextSibling;

                    while (node && node.nodeType != 1) {
                        node = node.nextSibling;
                    }
                    return node;
                }
            });
        }

        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode.childElementCount
         */
        if (dummyElement.childElementCount === undefined) {
            Object.defineProperty(elementProto, 'childElementCount', {
                get: function() {
                    return this.children.length;
                }
            });
        }
    }

    /**
     * @private
     */
    function textNodeIfString(node) {
        return typeof node == 'string' ? document.createTextNode(node) : node;
    }

    /**
     * @private
     */
    function makeNode(nodes) {
        if (nodes.length == 1) {
            return textNodeIfString(nodes[0]);
        }

        var df = document.createDocumentFragment();

        for (var i = 0, l = nodes.length; i < l; i++) {
            df.appendChild(textNodeIfString(nodes[i]));
        }
        return df;
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-rootnode-prepend
     */
    if (!elementProto.prepend) {
        elementProto.prepend = function() {
            this.insertBefore(makeNode(arguments), this.firstChild);
        };
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-rootnode-append
     */
    if (!elementProto.append) {
        elementProto.append = function() {
            this.appendChild(makeNode(arguments));
        };
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-childnode-before
     */
    if (!elementProto.before) {
        elementProto.before = function() {
            var parentNode = this.parentNode;

            if (parentNode) {
                parentNode.insertBefore(makeNode(arguments), this);
            }
        };
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-childnode-after
     */
    if (!elementProto.after) {
        elementProto.after = function() {
            var parentNode = this.parentNode;

            if (parentNode) {
                parentNode.insertBefore(makeNode(arguments), this.nextSibling);
            }
        };
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-childnode-replace
     */
    if (!elementProto.replace) {
        elementProto.replace = function() {
            var parentNode = this.parentNode;

            if (parentNode) {
                parentNode.replaceChild(makeNode(arguments), this);
            }
        };
    }

    /**
     * https://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#dom-childnode-remove
     */
    if (!elementProto.remove) {
        elementProto.remove = function() {
            var parentNode = this.parentNode;

            if (parentNode) {
                parentNode.removeChild(this);
            }
        };
    }

    /**
     * @private
     */
    function getClassNames(el) {
        return el.className.match(/\S+/g) || [];
    }

    /**
     * @private
     */
    function checkClassName(name) {
        if (name == '') {
            throw new Error('SyntaxError: An invalid or illegal string was specified');
        }
        if (/\s/.test(name)) {
            throw new Error('InvalidCharacterError: String contains an invalid character');
        }
    }

    /**
     * @private
     */
    function createClassList(el) {
        var classList = {
            item: function(index) {
                if (arguments.length == 0) {
                    throw new TypeError('Not enough arguments');
                }
                return getClassNames(el)[Number(index)] || null;
            },

            contains: function(name) {
                if (arguments.length == 0) {
                    throw new TypeError('Not enough arguments');
                }

                name = String(name);
                checkClassName(name);

                return getClassNames(el).indexOf(name) > -1;
            },

            add: function() {
                if (arguments.length == 0) {
                    throw new TypeError('Not enough arguments');
                }

                var classNames = getClassNames(el);
                var origClassNameCount = classNames.length;

                for (var i = 0, l = arguments.length; i < l; i++) {
                    var name = String(arguments[i]);
                    checkClassName(name);

                    if (classNames.indexOf(name) == -1) {
                        classNames.push(name);
                    }
                }

                if (classNames.length > origClassNameCount) {
                    el.className = classNames.join(' ');
                }
            },

            remove: function() {
                if (arguments.length == 0) {
                    throw new TypeError('Not enough arguments');
                }

                var classNames = getClassNames(el);
                var origClassNameCount = classNames.length;

                for (var i = 0, l = arguments.length; i < l; i++) {
                    var name = String(arguments[i]);
                    checkClassName(name);

                    var index;

                    while ((index = classNames.indexOf(name)) > -1) {
                        classNames.splice(index, 1);
                    }
                }

                if (classNames.length < origClassNameCount) {
                    el.className = classNames.join(' ');
                }
            },

            toggle: function() {
                if (arguments.length == 0) {
                    throw new TypeError('Not enough arguments');
                }

                var classNames = getClassNames(el);

                for (var i = 0, l = arguments.length; i < l; i++) {
                    var name = String(arguments[i]);
                    checkClassName(name);

                    var index = classNames.indexOf(name);

                    if (index == -1) {
                        classNames.push(name);
                    } else {
                        do {
                            classNames.splice(index, 1);
                        } while ((index = classNames.indexOf(name)) > -1);
                    }
                }

                el.className = classNames.join(' ');
            }
        };

        Object.defineProperty(classList, 'length', {
            get: function() {
               return getClassNames(el).length;
            },
            configurable: false,
            enumerable: false
        });

        return classList;
    }

    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/Element.classList
     */
    if (!dummyElement.classList) {
        Object.defineProperty(elementProto, 'classList', {
            get: function() {
                return this.classList = createClassList(this);
            },
            configurable: true,
            enumerable: false
        });
    }

})();

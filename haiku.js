//
// Haiku.js: lightweight DOM node creation using Zen Coding syntax
//   (see http://code.google.com/p/zen-coding/)
//
// author: Ryan Corradini
// last update: 4 June 2015
// license: MIT
//

/*
Example, from the Zen Coding homepage:

var dom_fragment = haiku.expand("div#page>div.logo+ul#navigation>li*5>a");

dom_fragment.toString():

    <div id="page">
            <div class="logo"></div>
            <ul id="navigation">
                    <li><a href=""></a></li>
                    <li><a href=""></a></li>
                    <li><a href=""></a></li>
                    <li><a href=""></a></li>
                    <li><a href=""></a></li>
            </ul>
    </div>

*/

/*jshint browser: true, quotmark:false, laxcomma:true */
/*global define,console */

define([],
    function() {
        "use strict";

    // PRIVATE CLOSURE GLOBALS
        var _tagRex   = /^[a-z]+[1-6]?/i,
            _posRex   = /[><\+]/g,
            _idRex    = /#[_a-z]+[_a-z0-9-]*/i,
            _classRex = /\.-?[_a-z]+[_a-z0-9-]*/gi,
            _textRex  = /{[^}]+}/,
            _attrsRex = /\[[^\]]*\]/;

        var _templateMap = {};
        var _conditionalsMaps = {};

    // HELPER FUNCTIONS

        function _supplant(str, args, defaultVal) {
        // adapted from Douglas Crockford's Remedial JavaScript
            if ((str.indexOf("%self") > -1) && args) {
                // special case: if the expression includes the special string "%self", 
                // it should be replaced by the entire (stringified) value of 'args'
                str = str.replace(/%self/g, args.toString());
            }
            return str.replace(/\$([^$]*);/g,
                function (a, b) {
                    var r = args[b];
                    if (_isNullOrUndef(r)) r = defaultVal;
                    var rtype = typeof r;
                    return rtype === "string" || rtype === "number" ? r : "("+rtype+")";
                }
            );
        }

        /** Mixes attributes from one object into another.
         *    Useful for overriding function defaults with an arguments property bag
         *
         * @param intoObj: target object to receive the new stuff
         * @param fromObj: source object to provide the new stuff
         * @return: the modified object
         */
        function _mixin(intoObj, fromObj) {
            for (var k in fromObj) {
                if (fromObj.hasOwnProperty(k)) {
                    if (fromObj[k] !== undefined) intoObj[k] = fromObj[k];
                }
            }
            return intoObj;
        }



        function _setNodeValue(node, value) {
            if (!node) return new Error("setNodeValue :: No node specified.");

            switch (node.tagName) {
                case "INPUT":
                case "TEXTAREA":
                case "SELECT":
                    if (node.type === "checkbox") {
                        node.checked = value;
                    } else {
                        node.value = value;
                    }
                    break;

                default:
                    node.textContent = value;
                    break;
            }
        }

        function _escapeControlChars(str) {
            var working = str.replace(/\+/gi, "__PLUS__");
            working = working.replace(/\{/gi, "__OPENBRACE__");
            working = working.replace(/\}/gi, "__CLOSEBRACE__");
            return working.replace(/\]/gi, "__CLOSEBRACKET__");
        }

        function _unescapeControlChars(str) {
            var working = str.replace(/__PLUS__/gi, "+");
            working = working.replace(/__OPENBRACE__/gi, "{");
            working = working.replace(/__CLOSEBRACE__/gi, "}");
            return working.replace(/__CLOSEBRACKET__/gi, "]");
        }

        function _isNullOrUndef(o) {
            return (o===null || o===undefined);
        }

        function _sanitizeData(obj, depthLimit) {
            var sanitized = null;
            if (_isNullOrUndef(obj)) return null;
            if (obj.__SANITIZED) return obj;
            if (Array.isArray(obj)) {
                sanitized = [];
                for (var i=0; i<obj.length; i++) {
                    sanitized[i] = _sanitizeData(obj[i], depthLimit);
                }
            } else {
                switch (typeof obj) {
                    case "string":
                        sanitized = _escapeControlChars(_stripHtml(obj));
                        break;

                    case "object":
                        sanitized = {
                            __SANITIZED: true
                        };
                        if (depthLimit > 0) {
                            Object.keys(obj).forEach(function sanitizeKeyVal(key){
                                sanitized[key] = _sanitizeData(obj[key], depthLimit-1);
                            });
                        } else {
                            sanitized.__NORECURSE = true;
                        }
                        break;

                    default:
                        // any other data types can stay as they are
                        sanitized = obj;
                        break;
                }
            }
            return sanitized;
        }

        // code for stripping all HTML tags from an input string
        // taken from http://stackoverflow.com/a/430240/7542 
        var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';
        var tagOrComment = new RegExp(
            '<(?:' +
            // Comment body.
            '!--(?:(?:-*[^->])*--+|-?)' +
            // Special "raw text" elements whose content should be elided.
            '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*' +
            '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*' +
            // Regular name
            '|/?[a-z]' +
            tagBody +
            ')>',
            'gi');
        function _stripHtml(html) {
            var oldHtml;
            do {
                oldHtml = html;
                html = html.replace(tagOrComment, '');
            } while (html !== oldHtml);
            return html.replace(/</g, '&lt;');
        }
        // end of html tag stripper

        function _expandValueString(valueStr, data) {
            if (!valueStr || !data) return null;

            var tmpl = "span{" + valueStr.replace(/%/g, "$") + "}";
            var span = _createElement( tmpl, data );
            return span ? span.textContent : null;
        }

        function _buildElement(spec) {
            var tag = _tagRex.exec(spec),
                i, matches, specFragment, val,
                el = tag ? document.createElement(tag[0]) : null;
            if (el) {
                // add element text node(s)
                if (_textRex.test(spec)) {
                    matches = _textRex.exec(spec);
                    specFragment = _unescapeControlChars(matches[0].slice(1, -1));
                    el.appendChild(document.createTextNode(specFragment));
                }

                // add element attributes
                if (_attrsRex.test(spec)) {
                    // only one; if there are multiples, they're ignored
                    matches = _attrsRex.exec(spec);
                    specFragment = _unescapeControlChars(matches[0].slice(1, -1));

                    // strip out the attrs clause from the spec so its contents don't get mistaken for a class or id
                    spec = spec.slice(0,matches.index) + spec.slice(matches.index+matches[0].length);
                    matches = specFragment.split(',');
                    for (i=0; i<matches.length; i++) {
                        val = matches[i].split('=');
                        if (val.length == 2) {
                            el.setAttribute(val[0], val[1]);
                        } else if (val.length > 2) {
                            el.setAttribute(val[0], val.slice(1).join('='));
                        }
                    }
                }

                // add element id
                if (_idRex.test(spec)) {
                    matches = _idRex.exec(spec);
                    el.id = matches[0].slice(1);
                }

                // add element class(es)
                matches = _classRex.exec(spec);
                while (matches && matches.length) {
                    for (i=0; i< matches.length; i++) {
                        el.classList.add(matches[i].slice(1));
                    }
                    matches = _classRex.exec(spec);
                }

                // TBD: check for element multipliers (e.g. ul>li*5)

            } else {
                // no tag; maybe it's a bare text node?
                if (_textRex.test(spec)) {
                    matches = _textRex.exec(spec);
                    specFragment = _unescapeControlChars(matches[0].slice(1, -1));
                    el = document.createTextNode(specFragment);
                }
            }
            return el;
        }


    // EXTERNAL FUNCTIONS (TO EXPOSE VIA THE API)

        function _expand(expression, dataObj, serialize) {
            var _frag = (serialize) ? document.createElement('div') : document.createDocumentFragment(),
                _cur = _frag,
                child = null,
                exp_with_values = _supplant( expression, _sanitizeData(dataObj, 1), ""),
                i, posCode, tags = exp_with_values.split(_posRex);
            for (i=0; i<tags.length; i++) {
                child = _buildElement(tags[i].trim());
                if (child) {
                    _cur.appendChild(child);
                }
                posCode = _posRex.exec(exp_with_values);

                if (posCode && posCode.length) {
                    switch (posCode[0]) {
                        case '<':
                            // jump back up to the previous insertion level
                            _cur = _cur.parentNode;
                            break;
                        case '>':
                            // insert next element into this new child
                            _cur = child;
                            break;
                        case '+':
                            // no change in insert level
                            break;
                        default:
                            // unrecognized insert level operation
                            console.warn('unrecognized position delimiter:', posCode);
                    }
                }
            }

            return (serialize) ? _frag.innerHTML : _frag;
        }

        function _createElement(expression, dataObj) {
            var expanded = _expand(expression, dataObj);
            return (expanded && expanded.childNodes.length) ? expanded.childNodes[0] : null;
        }


        function _addTemplate(templateId, body) {
            if (!templateId || !body) return;
            if (_templateMap.hasOwnProperty(templateId)) {
                throw new Error("Template '" + templateId + "' already exists.");
            }
            else {
                _templateMap[templateId] = body;
            }
        }

        function _lookupTemplate(templateId) {
            return _templateMap[templateId] || null;
        }

        function _lookupTemplateByMap(mapId, record) {
            var map = _conditionalsMaps[mapId];
            var checkValue;
            if (!map || !record) return null;
            if (record && map.fieldName) checkValue = record[map.fieldName];

            if (checkValue.toString() && map.valueMap.hasOwnProperty(checkValue)) {
                return _lookupTemplate(map.valueMap[checkValue]);
            }

            return _lookupTemplate(map.defaultTemplate) || null;
        }

        function _evaluateTemplateContext(contextString) {
            // context e.g. "id:123|groupId:456"
            var contextDict = {};

            if (contextString) contextString.split("|").forEach(function(argPair) {
                var keyval = argPair.split(":");
                contextDict[keyval[0]] = keyval[1];
            });
            return contextDict;
        }

        function _getBindingContext(containerContext, childObject) {
            var compositeContext = null;
            if (!containerContext) return childObject;

            if (childObject) {
                if (typeof childObject == "object") {
                    compositeContext = _mixin((containerContext || {}), childObject);

                } else {
                    compositeContext = childObject;
                }
            }

            return compositeContext;
        }

        function _bindChildNodes(nd, record) {
            var fieldName = nd.getAttribute("data-children-binding");
            var i, tmpl, value, fragment, containerContext, bindingContext;
            if (nd.hasAttribute("data-template-context")) {
                containerContext = _evaluateTemplateContext(nd.getAttribute("data-template-context"), record);
            }

            if (fieldName && record.hasOwnProperty(fieldName)) {
                value = record[fieldName];
                if (value && value.length !== undefined) {
                    if (nd.hasAttribute("data-template")) {
                        tmpl = _lookupTemplate(nd.getAttribute("data-template"));

                        if (tmpl) {
                            nd.innerHTML = "";
                            for (i=0; i<value.length; i++) {
                                bindingContext = _getBindingContext(containerContext, value[i]);
                                fragment = _createElement(tmpl, bindingContext);
                                nd.appendChild( fragment );
                                _bindToRecord(fragment, value[i]);
                            }
                        }

                    } else if (nd.hasAttribute("data-template-map")) {
                        var tmplMap = nd.getAttribute("data-template-map");
                        for (i=0; i<value.length; i++) {
                            bindingContext = _getBindingContext(containerContext, value[i]);
                            tmpl = _lookupTemplateByMap(tmplMap, bindingContext);
                            if (tmpl) {
                                fragment = _createElement(tmpl, bindingContext);
                                nd.appendChild( fragment );
                                _bindToRecord(fragment, value[i]);
                            }
                        }
                    }
                }
            } else {
                // console.warn("Data children binding: '" + fieldName + "' not found.");
            }

            if (nd.hasAttribute("data-children-footer")) {
                tmpl = _lookupTemplate(nd.getAttribute("data-children-footer"));
                if (tmpl) {
                    nd.appendChild( _createElement(tmpl, record) );
                }
            }
        }

        function _bindField(nd, record) {
            var fieldName = nd.getAttribute("data-binding");
            var value, valueStr;

            if (fieldName === "%self") {
                if (nd.hasAttribute("data-value-string")) {
                    valueStr = nd.getAttribute("data-value-string");
                    _setNodeValue(nd, _expandValueString(valueStr, record));
                
                } else if (typeof record !== "object") {
                    _setNodeValue(nd, record);
                }

            } else {

                if (fieldName && record.hasOwnProperty(fieldName)) {
                    value = record[fieldName];
                    if (value !== undefined) {
                        _setNodeValue(nd, value);
                    }
                } else {
                    // console.warn("Data binding: '" + fieldName + "' ");
                }
            }
        }

        function _bindToRecord(view, record) {
            var bindings;

            if (!view || !record) return;

            // data-children-binding (templatized child nodes, bound to an array)
            bindings = view.querySelectorAll("[data-children-binding]");
            Array.prototype.forEach.call(bindings, function(nd) { _bindChildNodes(nd, record); });

            // data-binding (single node values)
            bindings = view.querySelectorAll("[data-binding]");
            Array.prototype.forEach.call(bindings, function(nd) { _bindField(nd, record); });
        }

        function _addConditionalsMap(name, map) {
            if (!_conditionalsMaps.hasOwnProperty(name)) {
                _conditionalsMaps[name] = map;
            }
        }


        // return available generator functions
        return {
            expand : _expand
            , create : _createElement
            , bind : _bindToRecord
            , addTemplate : _addTemplate
            , getTemplate : _lookupTemplate
            , addConditionalsMap: _addConditionalsMap
        };
    }
);

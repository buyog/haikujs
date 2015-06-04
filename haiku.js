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

    // HELPER FUNCTIONS

        function _supplant(str, args, defaultVal) {
        // adapted from Douglas Crockford's Remedial JavaScript
            return str.replace(/\$([^$]*);/g,
                function (a, b) {
                    var r = args[b] || defaultVal,
                        rtype = typeof r;
                    return rtype === 'string' || rtype === 'number' ? r : "("+rtype+")";
                }
            );
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

        function _sanitizeData(obj) {
            var sanitized = null;
            if (!obj) return null;
            if (obj.__SANITIZED) return obj;
            if (Array.isArray(obj)) {
                sanitized = [];
                for (var i=0; i<obj.length; i++) {
                    sanitized[i] = _sanitizeData(obj[i]);
                }
            } else {
                if (typeof obj === "object") {
                    sanitized = {
                        __SANITIZED: true
                    };
                    Object.keys(obj).forEach(function sanitizeKeyVal(key){
                        switch (typeof obj[key]) {
                            case "string":
                            case "object":
                                sanitized[key] = _sanitizeData(obj[key]);
                                break;

                            default:
                                // any other data types can stay as they are
                                sanitized[key] = obj[key];
                                break;
                        }
                    });
                
                } else if (typeof obj === "string") {
                    sanitized = _escapeControlChars(obj);
                }
            }
            return sanitized;
        }

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
                exp_with_values = _supplant( expression, _sanitizeData(dataObj), ""),
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

        function _bindToRecord(view, record) {
            var bindings;

            if (!view || !record) return;

            // data-children-binding (templatized child nodes, bound to an array)
            bindings = view.querySelectorAll("[data-children-binding]");
            Array.prototype.forEach.call(bindings, function bindChildTemplate(nd) {
                var fieldName = nd.getAttribute("data-children-binding");
                var tmpl, value, fragment, childFooterTemplate;
                if (fieldName && record.hasOwnProperty(fieldName)) {
                    value = record[fieldName];
                    if (value && value.length !== undefined) {
                        tmpl = _lookupTemplate(nd.getAttribute("data-template"));
                        if (tmpl) {
                            nd.innerHTML = "";
                            for (var i=0; i<value.length; i++) {
                                fragment = _createElement(tmpl, value[i]);
                                nd.appendChild( fragment );
                                _bindToRecord(fragment, value[i]);
                            }
                        }
                    }
                } else {
                    console.warn("Data children binding: '" + fieldName + "' not found.");
                }

                childFooterTemplate = nd.getAttribute("data-children-footer");
                if (childFooterTemplate) {
                    tmpl = _lookupTemplate(nd.getAttribute("data-children-footer"));
                    if (tmpl) {
                        nd.appendChild( _createElement(tmpl, record) );
                    }
                }
            });

            // data-binding (single node values)
            bindings = view.querySelectorAll("[data-binding]");
            Array.prototype.forEach.call(bindings, function bindField(nd) {
                var fieldName = nd.getAttribute("data-binding");
                var value, valueStr;

                if (fieldName === "%self") {
                    valueStr = nd.getAttribute("data-value-string");
                    _setNodeValue(nd, _expandValueString(valueStr, record));

                } else {

                    if (fieldName && record.hasOwnProperty(fieldName)) {
                        value = record[fieldName];
                        if (value !== undefined) {
                            _setNodeValue(nd, value);
                        }
                    } else {
                        console.warn("Data binding: '" + fieldName + "' ");
                    }
                }
            });
        }


        // return available generator functions
        return {
            expand : _expand
            , create : _createElement
            , bind : _bindToRecord
            , addTemplate : _addTemplate
            , getTemplate : _lookupTemplate
        };
    }
);

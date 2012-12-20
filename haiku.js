//
// Haiku.js: lightweight DOM node creation using Zen Coding syntax
//   (see http://code.google.com/p/zen-coding/)
//
// author: Ryan Corradini
// date: 6 Dec 2012
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

define([],
    function() {
        "use strict";

        var _tagRex   = /^[a-z]+[1-6]?/i,
            _posRex   = /[><\+]/g,
            _idRex    = /#[_a-z]+[_a-z0-9-]*/i,
            _classRex = /\.-?[_a-z]+[_a-z0-9-]*/gi,
            _textRex  = /{[^}]+}/,
            _attrsRex = /\[[^\]]*\]/;

        function _supplant(str, args) {
        // adapted from Douglas Crockford's Remedial JavaScript
            return str.replace(/\$([^$]*);/g,
                function (a, b) {
                    var r = args[b];
                    return typeof r === 'string' || typeof r === 'number' ? r : a;
                }
            );
        }

        function _buildElement(spec, dataObj) {
            var tag = _tagRex.exec(spec),
                i, matches, val,
                el = tag ? document.createElement(tag[0]) : null;
            if (el) {
                // add element attributes
                if (_attrsRex.test(spec)) {
                    // only one; if there are multiples, they're ignored
                    matches = _attrsRex.exec(spec);

                    // strip out the attrs clause from the spec so its contents don't get mistaken for a class or id
                    spec = spec.slice(0,matches.index) + spec.slice(matches.index+matches[0].length);
                    matches = matches[0].slice(1, -1).split(',');
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

                // add element text node(s)
                if (_textRex.test(spec)) {
                    matches = _textRex.exec(spec);
                    el.appendChild(document.createTextNode( matches[0].slice(1, -1) ));
                }

                // TBD: check for element multipliers (e.g. ul>li*5)

            } else {
                // no tag; maybe it's a bare text node?
                if (_textRex.test(spec)) {
                    matches = _textRex.exec(spec);
                    el = document.createTextNode( matches[0].slice(1, -1) );
                }
            }
            return el;
        }


    // here are the to-be-exposed functions

        function _expand(expression, dataObj, serialize) {
            var _frag = (serialize) ? document.createElement('div') : document.createDocumentFragment(),
                _cur = _frag,
                child = null,
                exp_with_values = _supplant(expression, dataObj),
                i, posCode, tags = exp_with_values.split(_posRex);
            for (i=0; i<tags.length; i++) {
                child = _buildElement(tags[i]);
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


        // return available generator functions
        return {
            expand : _expand,
            create : _createElement
        };
    }
);
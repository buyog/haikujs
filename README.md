# haiku.js

    Haiku makes DOM trees
    so simple to generate,
    I think you'll like it.

## Wha...?

There are plenty of libraries for making it easier to create arbitrary DOM nodes, 
but I couldn't find one that used [Zen Coding](http://code.google.com/p/zen-coding/) 
syntax, which I've kinda fallen in love with lately. It can generate single 
element nodes, DOM Fragments, or even a raw string of HTML, suitable for 
insertion via `innerHTML`.

It's intended to be a lightweight replacement for the standard DOM method of 
creating new HTML structures, without the overhead of a full-blown templating
system like [Mustache](http://mustache.github.com/) or 
[Dust.js](http://akdubya.github.com/dustjs/) or the like.

## Installation

Haiku is packaged as an AMD module, but it's dependency-free, so it's simple to 
install: just drop it in your root JavaScript folder, and `require` away:

    require(["haiku"], function(haiku) {
        document.body.appendChild( haiku.expand("section#main+aside#related") );
    });


## Format

### ID operator (&ldquo;#&rdquo;)

Specifies the ID for an element *(ignores multiple operands; an element can 
only have one ID)*:

<table><tr>
  <td><code>div#main</code></td>
  <td><span>produces &rArr;</span></td>
  <td><code>&lt;div id="main"&gt;&lt;/div&gt;</code></td>
</tr></table>


### Class operator (&ldquo;.&rdquo;)

Specifies the CSS class for an element *(multiple operands allowed)*:

<table><tr>
  <td><code>blockquote.fancy.gothic</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;blockquote class="fancy gothic"&gt;&lt;/blockquote&gt;</code></td>
</tr></table>


### Template value operators (&ldquo;$&hellip;;&rdquo;)

Provides simple [Supplant](http://javascript.crockford.com/remedial.html)-style templating
based on a caller-provided data object (just basic parameter substitution right now):

<table><tbody>
  <tr>
    <td><code>a[href=http://me.com?id=$link;]&gt;{$label;}</code></td>
    <td rowspan='2'>&rArr;</td>
    <td rowspan='2'>
      <code>&lt;a href="http://me.com?id=9001"&gt;Goku's power level&lt;/a&gt;</code>
    </td>
  </tr>
  <tr><td>{ "link":9001, "label":"Goku's power level }</td></tr>
</tbody></table>



### Child operator (&ldquo;&gt;&rdquo;)

Makes the following element a child of the preceding one:

<table><tr>
  <td><code>ul&gt;li</code></td>
  <td>&rArr;</td>
  <td><code>&lt;ul&gt;&nbsp;&lt;li&gt;&lt;/li&gt;&nbsp;&lt;/ul&gt;</code></td>
</tr></table>


### Sibling operator (&ldquo;+&rdquo;)

Makes the following element a sibling of the preceding one:

<table><tr>
  <td><code>div&gt;p#intro+p#main</code></td>
  <td>&rArr;</td>
  <td><code>&lt;div&gt;&nbsp;&lt;p id="intro"&gt;&lt;/p&gt;&nbsp;&lt;p id="main"&gt;&lt;/p&gt;&nbsp;&lt;/div&gt;</code></p></td>
</tr></table>


### Parent operator (&ldquo;&lt;&rdquo;)

Makes the following element a sibling of the preceding one's parent (i.e goes 
up one level in the tree):

<table><tr>
  <td><code>header&gt;h1&lt;section.main</code></td>
  <td>&rArr;</td>
  <td><code>&lt;header&gt;&lt;h1&gt;&lt;/h1&gt;&lt;/header&gt;&nbsp;&lt;section class="main"&gt;&lt;/section&gt;</code></td>
</tr></table>


### Text delimiters (&ldquo;{ }&rdquo;)

Specifies the contents of a text node:

<table><tr>
  <td><code>p>{A }+em{simple}+{ example}</code></td>
  <td>&rArr;</td>
  <td><code>&lt;p&gt;A &lt;em&gt;simple&lt;/em&gt; example&lt;/p&gt;</code></td>
</tr></table>


### Attribute delimiters (&ldquo;[ ]&rdquo;)

Specifies attributes other than class and id (comma-separated if more than one):

<table><tr>
  <td><code>a#myId.myClass[href=http://foo.com,data-type=permalink]</code></td>
  <td>&rArr;</td>
  <td><code>&lt;a href="foo.com" data-type="permalink" id="myId" class="myClass" /&gt;</code></td>
</tr></table>


## Usage

### Multiple Nodes

Let's say you've got a piece of code that needs to create a handful of new DOM 
nodes and apply a bunch of atributes to them. You could do this the 
Vanilla JavaScript way, like so:

	function createPerson(dataObject) {
		var item, link;

		item = document.createElement('li');
		item.className = 'person';
		item.setAttribute('data-item-key', dataObject.id);
		link = document.createElement('a');
		link.href = 'http://foo.com?personid=' + dataObject.id;
		link.className = 'external';
		link.innerText = dataObject.name
		item.appendChild(link);
		
		return item;
	}

Or you can use Haiku's `expand` method. By default, Haiku appends 
all of the nodes it interprets from your provided string to a new DOM document 
fragment, which it hands back to you for placement in your document tree:

	function createPerson(dataObject) {
		var tmpl = "li.person[data-item-key=$id;]>a.external[href=http://foo.com?personid=$id;>{$name;}";
		return haiku.expand(tmpl, dataObject);
		// returns a DOM document fragment
	}

Maybe you prefer to hand-jam HTML and use something like jQuery to inject it via 
`innerHTML`:

	function createPerson(dataObject) {
		var html;

		html = "<li class='person' data-item-key='" + dataObject.id + "'>";
		html += "<a class='external' href='http://foo.com?personid='" + dataObject.id + "'>" + dataObject.name + "</a>";
		html += "</li>";
		
		return html;
	}

Haiku supports this as well, if you pass a truthy value as the optional third 
argument to `expand`:

	function createPerson(dataObject) {
		var tmpl = "li.person[data-item-key=$id;]>a.external[href=http://foo.com?personid=$id;>{$name;}";
		return haiku.expand(tmpl, dataObject, true);
		// returns a string of serialized HTML
	}



### Single Node

In the above case, where your created DOM tree has a single root node, you could
instead use Haiku's `create` method to get back an actual reference to
the root DOM Element node instead. This is helpful if you need to do any further 
manipulation of the node (say, add an event handler or two) prior to insertion 
into the tree:

	function createPerson(dataObject) {
		var tmpl = "li.person[data-item-key=$id;]>a.external[href=http://foo.com?personid=$id;>{$name;}";
		return haiku.create(tmpl, dataObject);
		// returns the DOM Element for the <li>
	}


## Credits

Minified version generated via [UglifyJS](https://github.com/mishoo/UglifyJS2/), using Marijn Haverbeke's [online tool](http://marijnhaverbeke.nl/uglifyjs).


## Disclaimer

So far, this is more or less a subset of Zen Coding's power &mdash; I haven't 
yet added support for abbreviation groups 
(<code>body>(header>h1)+(div#main)+(footer>span)</code>), element multiplication 
(<code>li*5>a</code>), or item numbering (<code>li#item$*3</code>).

I expect if this project proves useful, I'll probably add those features (and maybe 
expand the templating capability a bit more) at some point in the future.

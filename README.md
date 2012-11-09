# haikujs

    Haiku makes DOM trees
    so simple to generate,
    I think you'll like it.

## Wha...?

There are plenty of libraries for making it easier to create arbitrary DOM nodes, but I couldn't find one that used [Zen Coding](code.google.com/p/zen-coding/) syntax, which I've kinda fallen in love with lately. It can generate single element nodes, DOM Fragments, or even a raw string of HTML, suitable for insertion via `innerHTML`.

It's intended to be a lightweight replacement for the standard DOM method of creating new HTML structures, without the overhead of a full-blown templating system like [Mustache](http://mustache.github.com/) or [Dust.js](http://akdubya.github.com/dustjs/) or the like.

## Format:

### &ldquo;#&rdquo; operator

Specifies the ID for an element *(ignores multiple operands; an element can only have one ID)*:

<table><tr>
  <td><code>div#main</code></td>
  <td><span>produces &rArr;</span></td>
  <td><code>&lt;div id="main"&gt;&lt;/div&gt;</code></td>
</tr></table>


### &ldquo;.&rdquo; operator 

Specifies the class for an element *(multiple operands allowed)*:

<table><tr>
  <td><code>blockquote.fancy.gothic</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;blockquote class="fancy gothic"&gt;&lt;/blockquote&gt;</code></td>
</tr></table>


### &ldquo;&gt;&rdquo; operator 

Makes the following element a child of the preceding one:

<table><tr>
  <td><code>ul>li</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;ul&gt;<br/>
      &nbsp;&nbsp;&lt;li&gt;&lt;/li&gt;<br/>
      &lt;/ul&gt;</code></td>
</tr></table>


### &ldquo;+&rdquo; operator 

Makes the following element a sibling of the preceding one:

<table><tr>
  <td><code>div&gt;p#intro+p#main</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;div&gt;<br/>
       &nbsp;&nbsp;&lt;p id="intro"&gt;&lt;/p&gt;<br/>
       &nbsp;&nbsp;&lt;p id="main"&gt;&lt;/p&gt;<br/>
       &lt;/div&gt;</code></p></td>
</tr></table>


### &ldquo;&lt;&rdquo; operator 

Makes the following element a sibling of the preceding one's parent (i.e goes up one level in the tree):

<table><tr>
  <td><code>header&gt;h1&lt;section.main</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;header&gt;<br/>
       &nbsp;&nbsp;&lt;h1&gt;&lt;/h1&gt;<br/>
       &lt;/header&gt;<br/>
       &lt;section class="main"&gt;&lt;/section&gt;</code></td>
</tr></table>


### &ldquo;{ }&rdquo; operators 

Specifies the contents of a text node:

<table><tr>
  <td><code>p>{A }+em{simple}+{ example}</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;p&gt;<br/>
       &nbsp;&nbsp;"A "<br/>
       &nbsp;&nbsp;&lt;em&gt;simple&lt;/em&gt;<br/>
       &nbsp;&nbsp;" example"<br/>
       &lt;/p&gt;</code></td>
</tr></table>


### &ldquo;[ ]&rdquo; operators 

Specifies attributes other than class and id (comma-separated if more than one):

<table><tr>
  <td><code>a#myId.myClass[href=http://foo.com,data-type=permalink]</code></td>
  <td><span>&rArr;</span></td>
  <td><code>&lt;a <br/>
       &nbsp;&nbsp;href="foo.com"<br/>
       &nbsp;&nbsp;data-type="permalink"<br/>
       &nbsp;&nbsp;id="myId"<br/>
       &nbsp;&nbsp;class="myClass"<br/>
       /&gt;</code></td>
</tr></table>


## Usage:

Haiku is packaged as an AMD module, but it's dependency-free, so it's simple to install: 
just drop it in your root JavaScript folder, and <code>require</code> away:

    require(["haiku"], function(haiku) {
        var raw_html = tao.expand("section#main+aside#related", true);
    });


## Disclaimer:

So far, this is more or less a subset of Zen Coding's power &mdash; I haven't yet added support for
abbreviation groups (<code>body>(header>h1)+(div#main)+(footer>span)</code>),
element multiplication (<code>li*5>a</code>), or item numbering (<code>li#item$*3</code>).
I expect if this project proves useful, I'll probably add those features,
as well as simple [Supplant](http://javascript.crockford.com/remedial.html)-style templating.

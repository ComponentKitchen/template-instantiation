This repository tries out some API variations for the [HTML Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) proposal.

The main suggestion is to consider turning the notion of updating live elements into a first-class concept, independent of `<template>` elements. The goal would be to preserve the current proposal for mustache syntax, while adding support for other types of parsers, including a means of creating updatable elements directly through imperative code.

**Current proposal:**
The HTML Template Instantation proposal binds together several concepts: 1) a static template that can include mustache syntax, 2) an internal, parsed, parameterized representation of the original template, 3) an instance of such a parameterized representation, and 4) a means to later update such an instance. Most of this work is added to the `HTMLTemplateElement`. Example:

```html
<template>
  Hello, {name}.
</template>
```

```js
// Initial population from template.
let instance = template.createInstance({ name: 'Jane Doe' });
document.body.appendChild(instance);
// Later on, update.
instance.update({ name: 'Rachel Garcia' });
```

This is powerful, but the API is slightly awkward. As [noted](https://github.com/w3c/webcomponents/issues/685), the code uses the template instance in two very different ways. First it holds the nodes with the initial set of values. Then, after it's been added to the document, the template instance is used as an indirect means to talk to the previously-held nodes.

It feels like there are multiple concepts at work here. Perhaps we can tease these out in the API.


**Suggestion:** Handle syntax parsing, instantiation, and updating as conceptually separate steps. Using the same template as above:

```js
// Parse a template with mustache syntax to obtain an element factory.
const factory = new ElementFactory(template);
// Use the factory to obtain both an instance and updater.
const { instance, updater } = factory.instantiate({ name: 'Jane Doe' });
// Add the instance to the document.
document.body.appendChild(instance);
// Later on, update.
updater.update({ name: 'Rachel Garcia' });
```

["Hello, world" demo]()  *** link ***

Factoring template instantiation this way provides several benefits. Each concept ends up represented by a distinct object, which may make the model easier to explain and learn. Additionally, each of those objects can be used directly, which may broaden the application of this work.

These suggestions are essentially a refactoring of the functionality in the current HTML Template Instantiation proposal. The proposal can still address the same goals and use cases, as well as encompassing new scenarios.


## HTMLTemplateElement

In the current proposal, `HTMLTemplateElement` gains a number of new responsibilities, including parsing mustache syntax, generating elements, and updating elements. That creates something of a conceptual burden on a single class. It also bakes a particular era of framework thinking into `HTMLTemplateElement`.

The suggestion outlined here leaves `HTMLTemplateElement` untouched. It would be nothing more or less than what it is today: a static container for cloneable content.


## ElementFactory

As its name suggests, an `ElementFactory` is an object that can generate elements.

A common way to create an `ElementFactory` is to hand its constructor a template. This template will be parsed using mustache syntax.

```js
const factory = new ElementFactory(template);
```

The resulting factory holds the information necessary to instantiate new elements. The constructor's `template` parameter is optional. If omitted, the relevant information for element instantation can be created imperatively.

An `ElementFactory` creates a new instance via its `instantiate()` method. This returns _two_ objects: a new instance, and a `NodeUpdater` object (described below) that can update that particular instance.

```js
const { instance, updater } = factory.instantiate({ name: 'Jane Doe' });
updater.update({ name: 'Rachel Garcia' });
```


## Creating element factories through other means

An `ElementFactory` can be constructed by other means, not just via parsing mustache syntax in `HTMLTemplateElement` objects.

For example, [lit-html](https://github.com/PolymerLabs/lit-html/) is an example of a library that creates templates and stamps out instances. In that regard, it's very similar to the HTML template instantation proposal, only it uses JavaScript tagged template literals instead of `<template>` elements. Such libraries could create `ElementFactory` objects directly. This allows the library to leverage browser performance.

```js
// A library like lit-html
import { html, render } from '../src/lit-factory.js';

const hello = (name) => html`Hello, <strong>${name}</strong>.`;
render(hello('Jane Doe'), document.body);
```

[Tagged template literal demo]()  *** link ***

It's not obvious from the above code, but the result of the `html` tagged template literal includes an `ElementFactory` that's used by the `render` call.

It may turn out to be advantageous for other kinds of frameworks to create element factories of their own. In some cases, the factories may not actually utilize or inherit from `ElementFactory`, but still provide an isomorphic `instantiate()` method. E.g., a virtual DOM framework could create factories that had very different internals, but presented a consistent API to web developers.


## Using element factories in web components

Another result of this separation between regular (unparsed) `HTMLTemplateElement` and (parsed, instantiable) `ElementFactory` objects is that a developer can parse a template and hold on to the parsed result. This is useful in situations like web components.

```js
// Component template only needs to be parsed once.
const factory = new ElementFactory(template);

class IncrementDecrement extends HTMLElement {

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    const { instance, updater } = factory.instantiate(this);
    this.updater = updater;
    this.shadowRoot.appendChild(instance);
  }

}
```

[Web component demo]() *** link ***

The current HTML Template Instantation proposal could of course deliver the same parsing efficiency internally, but the above arrangement makes it more explicit.


## NodeUpdaters

The `instantiate()` method of an `ElementFactory` returns two objects: a new element instance, and a `NodeUpdater` object. A `NodeUpdater` is exposes an `update()` method updates the associated node tree to reflect new data. The `NodeUpdater` returned by `instantiate()` is bound to the new element instance, so can be invoked to update that instance:

```js
const { instance, updater } = factory.instantiate();
updater.update({ name: 'Rachel Garcia' });
```

A `NodeUpdater` is analagous to the `TemplatePart` class and its associated classes in the HTML Template Instantiation proposal. The chief difference is that a `NodeUpdater` has no direct connection to templates.

Among other things, a developer can construct `NodeUpdater` and various subclasses directly. For example, a developer could construct a `TextContentUpdater`, a subclass of `NodeUpdater` that updates text content:

```js
const text = new Text();
const updater = new TextContentUpdater(text);
updater.update('Hello');
```

[NodeUpdater demo]() *** link ***

Exposing updaters as a first-class object allows frameworks to construct them and use them directly, independent of `HTMLTemplateElement`. This allows other libraries, such as the hypothetical tagged template literal demo above, to generate compatible `ElementFactory` objects.


## Polyfilling

This suggested API carefully avoids touching existing DOM classes like `HTMLTemplateElement`. This is done chiefly to keep the existing role of those classes as focused as possible, but this also has the effect of making polyfilling easier. An implementation can be delivered as a plain JavaScript module, simplifying adoption. The polyfill does not have to patch DOM classes, nor does it have to introduce window globals. If necessary, different versions of the polyfill could be used in a single application.


## Future proofing

As the web evolves, better syntaxes or approaches will be found for creating templates and generating elements. If that happens, it may be easier to deprecate or replace use of a class like `ElementFactory`, on which no other class depends, than it would be to deprecate or replace use of a method on `HTMLTemplateElement`.

If someone wants to introduce a better syntax someday, they can implement their syntax via a new class, `BetterElementFactory`. This class can consume the same `HTMLTemplateElement` we use today — the template doesn't care about the text it holds.

In contrast, if we add mustache syntax parsing directly to `HTMLTemplateElement`, then that core class needs to support that syntax via `createInstance()` indefinitely. If someone wants to introduce a better syntax someday, they would necessarily complicate `HTMLTemplateElement` further. They might add a new method, `createBetterInstance()`, or add a new parameter: `createInstance({ useSyntaxVersion: 'better' })`. Either way, the connection between `HTMLTemplateElement` and syntax might complicate platform evolution.

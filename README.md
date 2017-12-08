This repository sketches out some suggestions for the [HTML Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) proposal.

The main suggestion is to consider turning the notion of updating live elements into a first-class concept, independent of `<template>` elements. The goal would be to preserve the current proposal for `<template>` elements with mustache syntax, while adding support for: 1) other types of parsers such as [lit-html](https://github.com/PolymerLabs/lit-html/) or 2) a means to generate updatable elements directly through imperative code.

**Current proposal:**
The HTML Template Instantation proposal binds together several concepts: 1) a static template that can include mustache syntax, 2) an internal parsed, parameterized representation of the original template, 3) an instance of that parameterized representation, and 4) a means to update such an instance. The proposal incorporates these concepts into a single class, `HTMLTemplateElement`.

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

This is powerful, but the API is slightly awkward. As [noted](https://github.com/w3c/webcomponents/issues/685), the code uses the template instance in two very different ways. First it holds the nodes with the initial set of values. Then, after it's been added to the document, the template instances is used as an indirect means to talk to the previously-held nodes.

It feels like there are multiple concepts at work here, so perhaps we can evolve the API so that it reflects that.


**Suggestion:** Handle syntax parsing, instantiation, and updating as conceptually separate steps. Using the same template as above:

```js
// Parse a template with mustache syntax to obtain a parameterized template.
const parameterized = template.parse();
// Instantiate that to obtain both an instance and updater.
const { instance, updater } = parameterized.instantiate({
  name: 'Jane Doe'
});
// Add the instance to the document.
document.body.appendChild(instance);
// Later on, update.
updater.update({ name: 'Rachel Garcia' });
```

["Hello, world" demo]()  *** link ***

Factoring template instantiation this way provides several benefits. Notably, each concept ends up represented by an object. This may be easier to explain to developers. Additionally, each of those objects can be used directly, which may broaded the application of the template instantiation proposal.


## HTMLTemplateElement

Parsing `<template>` elements would work the same way as in the current proposal with the same mustache syntax. The chief difference is that the `parse()` operation returns a completely parsed _parameterized template_ (below) that can be instantiated.

```js
const parameterized = template.parse();
```

Aside from this `parse()` method, `HTMLTemplateElement` would remain basically the same as today: a static container for cloneable content.


## Parameterized templates

The output of the HTMLTemplateElement `parse()` method would be a new object. For the time being, call it an `HTMLParameterizedTemplateElement`.

A parameterized template is already parsed, and its `content` is read-only. It is ready to be instantiated via an `instantiate()` method, which returns _two_ objects: a cloned instance of the parameterized template, and a `NodeUpdater` object. The updater serves as a direct means to update the instantiated nodes.

```js
const { instance, updater } = parameterizedTemplate.instantiate({
  name: 'Jane Doe'
});
```

The chief advantage of such an object is that a could be constructed by other means as well, not just via parsing `HTMLTemplateElement` objects with mustache syntax.

For example, lit-html is an example of a library that creates templates and stamps out instances. In that regard, it's similar to what HTML template instantation does, only with JavaScript tagged template literals instead of `<template>` elements. Such libraries could create `HTMLParameterizedTemplateElement` objects, that is, sharing a parameterized template representation with the browser. This allows the library to leverage browser performance.

[Tagged template literal demo]()  *** link ***

Another result of this separation between regular (unparsed) `HTMLTemplateElement` and (parsed, instantiable) `HTMLParameterizedTemplateElement` objects is that a developer can parse a template and hold on to the parsed result. This is useful in situations like web components.

```js
// Component template only needs to be parsed once.
const parameterizedTemplate = template.parse();

class IncrementDecrement extends HTMLElement {

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    const { instance, updater } = parameterizedTemplate.instantiate(this);
    this.updater = updater;
    this.shadowRoot.appendChild(instance);
  }

}
```

[Web component demo]() *** link ***

The same parsing efficiency is possible internally with the current HTML Template Instantation proposal, although the above arrangement makes it more explicit. Consider a template in the current proposal which is modified after it's been instantiated:

```js
const template = document.createElement('template');
template.content.appendChild(new Text('foo'));
const instance1 = template.createInstance();
// Is the template reparsed every time? (Probably not.)
const instance2 = template.createInstance();
// Does the following modify existing instances? (No.)
template.content.appendChild(new Text('bar'));
```

It's clearly possible for a template to internally hold parsed results so they can be efficiently reused for subsequent calls to `createInstance()`, but that's not obvious in the API. Additionally, the effects of modifying a template after instantiation may not be obvious. Treating parsed results as first-class objects may make things clearer to developers:

```js
const template = document.createElement('template');
template.content.appendChild(new Text('foo'));
const parameterized = template.parse();
const instance1 = parameterized.createInstance();
// Is the template reparsed every time? (Obviously no; we only used the parsed result.)
const instance2 = parameterized.createInstance();
// Does the following modify existing instances? (Again, obviously no.)
template.content.appendChild(new Text('bar'));
```

If desired, a variation of the suggested API could shift parsing from `HTMLTemplateElement` to `HTMLParameterizedTemplateElement`:

```js
// HTMLTemplateElement knows how to parse mustache syntax.
const parameterized = template.parse();
// Or move parsing to the constructor of HTMLParameterizedTemplateElement.
const parameterized = new HTMLParameterizedTemplateElement(template);
```



## NodeUpdaters

A `NodeUpdater` is an object that is associated with a node, and exposes an `update()` method that updates the associated node tree.

```js
updater.update({ name: 'Rachel Garcia' });
```

A `NodeUpdater` is analagous to the `TemplatePart` class and its associated classes in the HTML Template Instantiation proposal. The chief difference is that a `NodeUpdater` has no direct connection to templates. A developer can construct one manually. Here a developer constructs a `TextContentUpdater`, a subclass of `NodeUpdater` that updates text content:

```js
const text = new Text();
const updater = new TextContentUpdater(text);
updater.update('Hello');
```

[NodeUpdater demo]() *** link ***

Exposing updaters as a first-class object allows frameworks to construct them and use them directly, independent of `HTMLTemplateElement`.


## Assessment

The suggestions above are essentially a modest refactoring of the functionality in the current HTML Template Instantiation proposal. The proposal can still address the same goals and use cases, as well as encompassing new scenarios.

There's been a general interest in identifying a minimal feature set so that core features can be delivered early, and developer feedback can be incorporated into subsequent improvements. In that spirit, some of the above concepts could be implemented behind the scenes, but not yet exposed directly to developers. Designing with these goals in mind may allow us to arrive at a better long-term solution.

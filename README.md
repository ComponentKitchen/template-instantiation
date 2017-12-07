This repository sketches out some API ideas for the [HTML Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) proposal.

The core idea is to upgrade the notion of updating live elements with data into a first-class concept. This concept can be used with `<template>` elements with mustache syntax as in the original proposal, as well as with other types of parsers such as [lit-html](https://github.com/PolymerLabs/lit-html/) or created directly through imperative code.

**Current proposal:** The HTML Template Instantation proposal currently ties together parsing of mustache syntax, element instantiation, and element updating into a single object, `HTMLTemplateElement`.

```html
<template>
  Hello, {name}.
</template>
```

```js
// Initial population from template.
let content = template.createInstance({ name: 'Jane Doe' });
document.body.appendChild(content);
// Later on, update.
content.update({ name: 'Rachel Garcia' });
```

**Suggestion:** Handle syntax parsing, instantiation, and updating as conceptually separate steps. Using the same template as above...

```js
// Parse a template with mustache syntax to obtain a parameterized template.
const parameterizedTemplate = template.parse();
// Instantiate that to obtain both an instance and updater.
const { instance, updater } = parameterizedTemplate.instantiate({
  name: 'Jane Doe'
});
// Add the instance to the document.
document.body.appendChild(instance);
// Later on, update.
updater.update({ name: 'Rachel Garcia' });
```


## Updaters


## Parameterized templates

UpdaterDescriptor


## Parsing templates


## Use in other libraries


## Incremental approach

There's been a general interest in spec'ing and implementing a minimal feature set for HTML Template Instantiation so that core features can be delivered early and developer feedback can be incorporated into subsequent improvements. In that spirit, some of the above concepts could be implemented but not yet exposed directly to developers.

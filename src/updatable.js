export class Updater {
  evaluate(expression, data) {
    if (!expression) {
      return data;
    }
    const terms = expression.split('.');
    const result = terms.reduce((current, term) => current[term], data);
    return result;
  }
}


export class MultiUpdater extends Updater {
  constructor(updaters) {
    super();
    this.updaters = updaters;
  }
  update(value) {
    this.updaters.forEach(updater => {
      updater.update(value);
    });
  }
}


export class ElementUpdater extends Updater {
  constructor(element) {
    super();
    this.element = element;
  }
}


export class AttributeUpdater extends ElementUpdater {
  constructor(element, attributeName, parts, expressions) {
    super(element);
    this.element = element;
    this.parts = parts;
    this.expressions = expressions;
  }
  update(value) {
    this.expressions.forEach((expression, index) => {
      if (expression) {
        part[index] = this.evaluate(expression, data);
      }
    });
    return parts.join('');
  }
}


export class TextContentUpdater extends ElementUpdater {
  constructor(element, expression) {
    super(element);
    this.expression = expression;
  }
  update(value) {
    this.element.textContent = this.evaluate(this.expression, value);
  }
}


class ChildVector {

}

export class HTMLParamaterizedTemplateElement extends HTMLTemplateElement {
  instantiate(data) {
    const instance = document.importNode(this.content, true);
    // Bind updaters.
    const updaters = this.unboundUpdaters.map(unboundUpdater => {
      const { address, updaterClass, expression } = unboundUpdater;
      const element = elementAtAddress(instance, address);
      return new updaterClass(element, expression);
    });
    const updater = new MultiUpdater(updaters);
    if (data != null) {
      updater.update(data);
    }
    return { instance, updater };
  }
}


function elementAtAddress(node, address) {
  if (address.length === 0) {
    return node;
  } else {
    const index = address[0];
    const rest = address.slice(1);
    const element = node.childNodes[index];
    return elementAtAddress(element, rest);
  }
}


export function parse(node, address = []) {
  if (node instanceof Text) {
    return parseTextNode(node, address);
  } else {
    const clone = node.cloneNode(false);
    const unboundUpdaters = [];
    let index = 0;
    node.childNodes.forEach(child => {
      const childAddress = address.concat(index);
      const { parsed: parsedChild, unboundUpdaters: childUpdaters } = parse(child, childAddress);
      // Adjust addresses.
      childUpdaters.forEach(childUpdater => {
        const address = childUpdater.address;
        address[address.length - 1] += index
      });
      index += parsedChild.childNodes.length;
      clone.appendChild(parsedChild);
      unboundUpdaters.splice(unboundUpdaters.length, 0, ...childUpdaters);
    });
    return {
      parsed: clone,
      unboundUpdaters
    };
  }
}


export function parseTextNode(node) {
  const tokens = tokenizeText(node.textContent);
  const unboundUpdaters = [];
  const fragment = document.createDocumentFragment();
  const children = tokens.map((token, index) => {
    const child = new Text();
    if (token.static) {
      child.textContent = token.static;
    } else {
      const unboundUpdater = {
        address: [index],
        updaterClass: TextContentUpdater,
        expression: token.expression
      };
      unboundUpdaters.push(unboundUpdater);
    }
    fragment.appendChild(child);
  });
  return {
    parsed: fragment,
    unboundUpdaters
  };
}


export function tokenizeText(text) {
  const generator = nextPlaceholder(text);
  const placeholders = [...generator];
  let start = 0;
  const tokens = [];
  placeholders.forEach((placeholder, index) => {
    const end = placeholder.index;
    if (start !== end) {
      // Add text before placeholder.
      tokens.push({
        static: text.substr(start, end)
      });
    }
    // Add placeholder.
    tokens.push({
      expression: placeholder[1]
    });
    start += placeholder.index + placeholder[0].length;
  });
  if (start < text.length) {
    // Add text after last placeholder.
    tokens.push({
      static: text.substr(start)
    });
  }
  return tokens;
}


function* nextPlaceholder(text) {
  // Quick and dirty ID matching -- doesn't support Unicode yet.
  // It *does* support dot '.' operator for object members.

  // TODO: Use non-capture group for loop
  const placeholderRegex = /{\s*([a-zA-Z_$][\.0-9a-zA-Z_$]*)\s*}/g;
  let match = placeholderRegex.exec(text);
  while (match) {
    yield match;
    match = placeholderRegex.exec(text);
  }
}


window.HTMLTemplateElement.prototype.parse = function() {
  const { parsed, unboundUpdaters } = parse(this.content);
  const updatable = document.createElement('template');
  updatable.content.appendChild(parsed);
  updatable.unboundUpdaters = unboundUpdaters;
  Object.setPrototypeOf(updatable, HTMLParamaterizedTemplateElement.prototype);
  return updatable;
};

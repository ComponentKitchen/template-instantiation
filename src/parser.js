import { TextContentUpdater } from './updaters.js';


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
  tokens.map((token, index) => {
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

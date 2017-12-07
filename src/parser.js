/*
 * Default template parser
 */


import { TextContentUpdater, UpdaterDescriptor } from './updaters.js';


export function parse(node) {
  if (node instanceof Text) {
    return parseTextNode(node);
  } else {
    const parsed = node.cloneNode(false);
    const updaterDescriptors = [];
    let offset = 0;
    node.childNodes.forEach((child) => {
      const { parsed: parsedChild, updaterDescriptors: childUpdaterDescriptors } = parse(child);
      // Adjust the addresses in the returned descriptors to account for their
      // actual position in the parsed tree.
      childUpdaterDescriptors.forEach(updaterDescriptor => {
        if (parsedChild instanceof DocumentFragment) {
          // Will be spliced in; shift address.
          updaterDescriptor.address[0] += offset;
        } else {
          // Will be added as a child, add one level of hierarchy to address.
          updaterDescriptor.address.unshift(offset);
        }
      });
      offset += parsedChild instanceof DocumentFragment ?
        parsedChild.childNodes.length :
        1;
      parsed.appendChild(parsedChild);
      updaterDescriptors.splice(updaterDescriptors.length, 0, ...childUpdaterDescriptors);
    });

    return {
      parsed,
      updaterDescriptors
    };
  }
}


export function parseTextNode(node) {
  const tokens = tokenizeText(node.textContent);
  const updaterDescriptors = [];
  const fragment = document.createDocumentFragment();
  tokens.map((token, index) => {
    const child = new Text();
    if (token.static) {
      child.textContent = token.static;
    } else {
      const address = [index];
      const expression = token.expression;
      const updaterDescriptor = new UpdaterDescriptor(address, TextContentUpdater, expression)
      updaterDescriptors.push(updaterDescriptor);
    }
    fragment.appendChild(child);
  });
  return {
    parsed: fragment,
    updaterDescriptors
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

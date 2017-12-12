/*
 * Default template parser for mustache syntax.
 * 
 * This currently supports only mustache syntax in text nodes.
 */


import { AttributeValueUpdater, TextContentUpdater, UpdaterDescriptor } from './updaters.js';


export function parse(node) {
  if (node instanceof Text) {
    return parseTextNode(node);
  } else if (node instanceof DocumentFragment) {
    return parseChildNodes(node);
  } else if (node instanceof Element) {

    const parsed = document.createElement(node.localName);

    const attributeResults = parseAttributes(node);
    attributeResults.parsed.forEach(parsedAttributeNode => {
      parsed.setAttributeNode(parsedAttributeNode);
    });

    const childNodeResults = parseChildNodes(node);
    parsed.appendChild(childNodeResults.parsed);

    const updaterDescriptors = [
      ...attributeResults.updaterDescriptors,
      ...childNodeResults.updaterDescriptors
    ];

    return {
      parsed,
      updaterDescriptors
    };
  } else {
    return node.cloneNode(true);
  }
}


export function parseAttributes(node) {
  const parsed = [];
  const updaterDescriptors = [];
  Array.prototype.forEach.call(node.attributes, attribute => {
    const attributeResult = parseAttribute(attribute);
    parsed.push(attributeResult.parsed);
    if (attributeResult.updaterDescriptor) {
      updaterDescriptors.push(attributeResult.updaterDescriptor);
    }
  });
  return {
    parsed,
    updaterDescriptors
  };
}


export function parseAttribute(attribute) {
  const parsed = document.createAttribute(attribute.name);
  let updaterDescriptor;
  const tokens = tokenizeText(attribute.value);
  const hasExpression = tokens.length > 1 || tokens[0].expression !== undefined;
  if (hasExpression) {
    const address = [];
    updaterDescriptor = new UpdaterDescriptor(
      address,
      AttributeValueUpdater,
      attribute.name,
      tokens
    );
  } else {
    parsed.value = attribute.value;
  }
  return {
    parsed,
    updaterDescriptor
  };
}


export function parseChildNodes(node) {
  const parsed = document.createDocumentFragment();
  const updaterDescriptors = [];
  let offset = 0;
  node.childNodes.forEach((child) => {
    const childResult = parse(child);
    // Adjust the addresses in the returned descriptors to account for their
    // actual position in the parsed tree.
    childResult.updaterDescriptors.forEach(updaterDescriptor => {
      if (childResult.parsed instanceof DocumentFragment) {
        // Will be spliced in; shift address.
        updaterDescriptor.address[0] += offset;
      } else {
        // Will be added as a child, add one level of hierarchy to address.
        updaterDescriptor.address.unshift(offset);
      }
    });
    offset += childResult.parsed instanceof DocumentFragment ?
      childResult.parsed.childNodes.length :
      1;
    parsed.appendChild(childResult.parsed);
    updaterDescriptors.splice(updaterDescriptors.length, 0, ...childResult.updaterDescriptors);
  });
  return {
    parsed,
    updaterDescriptors
  };
}


export function parseTextNode(node) {
  const tokens = tokenizeText(node.textContent);
  const updaterDescriptors = [];
  const parsed = document.createDocumentFragment();
  tokens.map((token, index) => {
    const child = new Text();
    if (token.static) {
      child.textContent = token.static;
    } else {
      const address = [index];
      const expression = token.expression;
      const updaterDescriptor = new UpdaterDescriptor(address, TextContentUpdater, expression);
      updaterDescriptors.push(updaterDescriptor);
    }
    parsed.appendChild(child);
  });
  return {
    parsed,
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
        static: text.substring(start, end)
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
      static: text.substring(start)
    });
  }
  return tokens;
}


// Return the next mustache placeholder in the text.
// Examples: {name} or { name } or {name.first}
function* nextPlaceholder(text) {
  // Simplistic JavaScript ID pattern. Does not handle Unicode.
  const initialChar = `[a-zA-Z_$]`;
  const char = `[a-zA-Z_$0-9]`;
  const id = `${initialChar}${char}*`;

  // An expression is a sequence of ID delimited by dots.
  const expression = `${id}(?:\.${id})*`;

  // A placeholder is an expression and optional whitespace in curly braces.
  const placeholder = `{\s*(${expression})\s*}`;
  const placeholderRegex = new RegExp(placeholder, 'g');

  let match = placeholderRegex.exec(text);
  while (match) {
    yield match;
    match = placeholderRegex.exec(text);
  }
}

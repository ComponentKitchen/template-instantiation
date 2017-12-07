import HTMLParameterizedTemplateElement from '../src/HTMLParameterizedTemplateElement.js';
import { parse } from '../src/parser.js';


const templates = new Map();


/*
 * HTML template tag.
 *
 * This is intended to be invoked as a JavaScript tagged template literal
 * function. This will pass in the set of stings which are HTML fragments, and a
 * set of values.
 *
 * This returns a parameterized template and the original set of values.
 */
export function html(strings, ...values) {
  // Do we already have a parameterized template for this set of strings?
  let template = templates.get(strings);
  if (!template) {
    template = templateFromHTMLFragments(strings);
    // Remember the parameterized template for next time.
    templates.set(strings, template);
  }
  return {
    template,
    values
  };
}


/*
 * Given the result of the html template literal function above, render that
 * result into the indicated container. The first time this is called, the
 * existing contents of the container will be entirely replaced. Subsequent
 * calls will simply update the content with new data.
 */
export function render(litResult, container) {
  const { template, values } = litResult;
  if (!container._updater) {
    // Initial render.
    while (container.childNodes.length > 0) {
      container.childNodes[0].remove();
    }
    const { instance, updater } = template.instantiate(values);
    container.appendChild(instance);
    container._updater = updater;
  } else {
    // Subsequent render, just update.
    container._updater.update(values);
  }
}


/*
 * Given a set of strings representing consecutive fragments of HTML,
 * return a parameterized template that can be instantiated (with data)
 * to obtain complete HTML.
 * 
 * For this simple proof of concept, we don't do our own parsing. Instead, we
 * cheat and create equivalent HTML which our parameterized template parser can
 * handle, then fix up the result. A real implementation would do its own
 * parsing.
 */
function templateFromHTMLFragments(strings) {
  // Concatenate the strings to form HTML.
  // Insert placeholders of the form "placeholder0" between the strings.
  const html = strings.map((string, index) =>
    `${string}${index < strings.length - 1 ? `{placeholder${index}}` : ''}`
  ).join('');

  // Parse the parameterized HTML.
  const template = document.createElement('template');
  template.innerHTML = html;
  const { parsed, unboundUpdaters } = parse(template.content);

  // The updaters will look for expressions of the form "placeholder0". The
  // template literal function expects an array of values, so we fix up these
  // updaters to look for expressions like "0", which will result in grabbing
  // the corresponding array value.
  unboundUpdaters.forEach((updater, index) => {
    updater.expression = index.toString();
  });

  // Create and return a parameterized template.
  const parameterizedTemplate = new HTMLParameterizedTemplateElement();
  parameterizedTemplate.content.appendChild(parsed);
  parameterizedTemplate.unboundUpdaters = unboundUpdaters;
  return parameterizedTemplate;
}

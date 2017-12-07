import { parse } from './parser.js';
import HTMLParameterizedTemplateElement from './HTMLParameterizedTemplateElement.js';


/*
 * Patch HTMLTemplateElement to add a parse() method.
 * 
 * This parses the template's content and returns a corresponding parameterized
 * template.
 */
window.HTMLTemplateElement.prototype.parse = function() {
  const { parsed, updaterDescriptors } = parse(this.content);
  const parameterized = new HTMLParameterizedTemplateElement();
  parameterized.content.appendChild(parsed);
  parameterized.updaterDescriptors = updaterDescriptors;
  return parameterized;
};


window.HTMLParameterizedTemplateElement = HTMLParameterizedTemplateElement;

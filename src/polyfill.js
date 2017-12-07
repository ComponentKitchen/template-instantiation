import { parse } from './parser.js';
import HTMLParamaterizedTemplateElement from './HTMLParameterizedTemplateElement.js';


/*
 * Patch HTMLTemplateElement to add a parse() method.
 * 
 * This parses the template's content and returns a corresponding parameterized
 * template.
 */
window.HTMLTemplateElement.prototype.parse = function() {
  const { parsed, unboundUpdaters } = parse(this.content);
  const parameterized = new HTMLParamaterizedTemplateElement();
  parameterized.content.appendChild(parsed);
  parameterized.unboundUpdaters = unboundUpdaters;
  return parameterized;
};


window.HTMLParamaterizedTemplateElement = HTMLParamaterizedTemplateElement;

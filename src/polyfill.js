import { parse } from './parser.js';
import HTMLParamaterizedTemplateElement from './HTMLParameterizedTemplateElement.js';


window.HTMLTemplateElement.prototype.parse = function() {
  const { parsed, unboundUpdaters } = parse(this.content);
  const updatable = document.createElement('template');
  updatable.content.appendChild(parsed);
  updatable.unboundUpdaters = unboundUpdaters;
  Object.setPrototypeOf(updatable, HTMLParamaterizedTemplateElement.prototype);
  return updatable;
};


window.HTMLParamaterizedTemplateElement = HTMLParamaterizedTemplateElement;

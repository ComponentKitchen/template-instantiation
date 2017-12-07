import { MultiUpdater } from './updaters.js';


export default class HTMLParamaterizedTemplateElement extends HTMLElement {

  constructor() {
    super();
    this.template = document.createElement('template');
  }

  get content() {
    return this.template.content;
  }
  set content(content) {
    this.template.content = content;
  }

  get innerHTML() {
    return this.template.innerHTML;
  }
  set innerHTML(innerHTML) {
    this.template.innerHTML = innerHTML;
  }

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


customElements.define('parameterized-template', HTMLParamaterizedTemplateElement);

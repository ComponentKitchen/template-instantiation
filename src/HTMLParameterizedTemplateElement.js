import { UpdaterCollection } from './updaters.js';
import { nodeAtAddress } from './nodeAddress.js';


export default class HTMLParameterizedTemplateElement extends HTMLElement {

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
    // Attach updaters.
    const updaters = this.updaterDescriptors.map(updaterDescriptor =>
      updaterDescriptor.createUpdater(instance)
    );
    const updater = new UpdaterCollection(updaters);
    if (data != null) {
      updater.update(data);
    }
    return { instance, updater };
  }

}


customElements.define('parameterized-template', HTMLParameterizedTemplateElement);

import { nodeAtAddress } from './nodeAddress.js';
import { parse } from './parser.js';
import { UpdaterCollection } from './updaters.js';


const contentKey = Symbol();
const updaterDescriptorsKey = Symbol();


export default class ElementFactory {

  constructor(template) {
    if (template) {
      const { parsed, updaterDescriptors } = parse(template.content);
      this[contentKey] = parsed;
      this[updaterDescriptorsKey] = updaterDescriptors;
    } else {
      this[contentKey] = new DocumentFragment();
    }
  }

  get content() {
    return this[contentKey];
  }

  instantiate(data) {
    const instance = this[contentKey].cloneNode(true);
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

  get updaterDescriptors() {
    return this[updaterDescriptorsKey];
  }
  set updaterDescriptors(updaterDescriptors) {
    this[updaterDescriptorsKey] = updaterDescriptors;
  }

}

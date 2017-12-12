/*
 * NodeUpdater and associated classes for updating elements with data.
 */

import { nodeAtAddress } from './nodeAddress.js';


export class NodeUpdater {

  constructor(node) {
    this.node = node;
  }

  evaluate(expression, data) {
    if (!expression) {
      return data;
    }
    const terms = expression.split('.');
    const result = terms.reduce((current, term) => current[term], data);
    return result;
  }

}


export class AttributeValueUpdater extends NodeUpdater {
  constructor(node, attributeName, tokens) {
    super(node);
    this.attributeName = attributeName;
    this.tokens = tokens;
  }
  update(data) {
    const strings = this.tokens.map(token =>
      token.expression ?
        this.evaluate(token.expression, data) :
        token.static
    );
    const value = strings.join('');
    this.node.setAttribute(this.attributeName, value);
  }
}


/*
 * Updates the textContent of the associated node.
 */
export class TextContentUpdater extends NodeUpdater {

  constructor(node, expression) {
    super(node);
    this.expression = expression;
  }

  update(data) {
    this.node.textContent = this.evaluate(this.expression, data);
  }
  
}


/*
 * A bundle of updaters that can be updated together.
 */
export class UpdaterCollection {

  constructor(updaters) {
    this.updaters = updaters;
  }

  update(data) {
    this.updaters.forEach(updater => {
      updater.update(data);
    });
  }

}


/*
 * A record with sufficient data to create a NodeUpdater.
 * 
 * Such records are created in the parsing process, then realized (e.g., by
 * ElementFactory) when instantating an element.
 * 
 * You can think of this as a dehydrated form of NodeUpdater.
 */
export class UpdaterDescriptor {

  constructor (address, updaterClass, ...updaterArgs) {
    this.address = address;
    this.updaterClass = updaterClass;
    this.updaterArgs = updaterArgs;
  }

  createUpdater(root) {
    const node = nodeAtAddress(root, this.address);
    const updater = new this.updaterClass(node, ...this.updaterArgs);
    return updater;
  }

}

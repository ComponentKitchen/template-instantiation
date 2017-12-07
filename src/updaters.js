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


// export class AttributeValueUpdater extends NodeUpdater {
//   constructor(address, attributeName, parts, expressions) {
//     super(address);
//     this.parts = parts;
//     this.expressions = expressions;
//   }
//   update(value) {
//     this.expressions.forEach((expression, index) => {
//       if (expression) {
//         part[index] = this.evaluate(expression, data);
//       }
//     });
//     return parts.join('');
//   }
// }


export class TextContentUpdater extends NodeUpdater {

  constructor(node, expression) {
    super(node);
    this.expression = expression;
  }

  update(data) {
    this.node.textContent = this.evaluate(this.expression, data);
  }
  
}


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

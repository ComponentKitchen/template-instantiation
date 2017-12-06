export class Updater {
  evaluate(expression, data) {
    if (!expression) {
      return data;
    }
    const terms = expression.split('.');
    const result = terms.reduce((current, term) => current[term], data);
    return result;
  }
}


export class MultiUpdater extends Updater {
  constructor(updaters) {
    super();
    this.updaters = updaters;
  }
  update(value) {
    this.updaters.forEach(updater => {
      updater.update(value);
    });
  }
}


export class ElementUpdater extends Updater {
  constructor(element) {
    super();
    this.element = element;
  }
}


export class AttributeUpdater extends ElementUpdater {
  constructor(element, attributeName, parts, expressions) {
    super(element);
    this.element = element;
    this.parts = parts;
    this.expressions = expressions;
  }
  update(value) {
    this.expressions.forEach((expression, index) => {
      if (expression) {
        part[index] = this.evaluate(expression, data);
      }
    });
    return parts.join('');
  }
}


export class TextContentUpdater extends ElementUpdater {
  constructor(element, expression) {
    super(element);
    this.expression = expression;
  }
  update(value) {
    this.element.textContent = this.evaluate(this.expression, value);
  }
}

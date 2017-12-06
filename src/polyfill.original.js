/*
 * Copyright (C) 2017 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

let TemplatePart;
let TemplateInstance;
let AttributeTemplatePart;
let NodeTemplatePart;
(function () {

    function defaultProcessor(fragment, parts, parameters)
    {
        for (let part of parts) {
            const key = part.expression.trim();
            if (key in parameters)
                part.value = parameters[key];
        }
    }

    TemplateInstance = class TemplateInstance extends DocumentFragment {
        update(parameters, processor)
        {
            if (processor == undefined)
                processor = this._processor;
            processor(this, this._parts, parameters);
        }
    }

    TemplatePart = class TemplatePart {
        constructor(expression)
        {
            if (!constructingTemplatePart)
                throw 'This objet cannot be constructed directly';
            this._expression = expression.trim();
            this._valueGetter = null;
            this._valueSetter = null;
        }

        toString() { return this.value; }
        get value() { return this._valueGetter(); }
        set value(newValue) { return this._valueSetter(newValue); }

        get expression() { return this._expression; }
        set expression(newValue) { } // Expression is readonly.
    }

    HTMLTemplateElement.prototype.createInstance = function (parameters, processor = defaultProcessor)
    {
        console.log(this.content)
        const fragment = document.importNode(this.content, true);
        const parts = [];
        fragment._parts = parts;
        fragment._processor = processor;
        fragment.__proto__ = TemplateInstance.prototype;
        recursivelyInstantiate(fragment, parts);

        processor(fragment, parts, parameters);

        return fragment;
    }

    AttributeTemplatePart = class AttributeTemplatePart extends TemplatePart {
    }

    NodeTemplatePart = class NodeTemplatePart extends TemplatePart {
        constructor(expression)
        {
            super(expression);
            this._nodeSetter = null;
        }

        replace(newNodes)
        {
            this._nodeSetter(newNodes);
        }

        replaceHTML(html)
        {
            // Should we instead use innerHTML of the parent element?
            let template = document.createElement('template');
            template.innerHTML = html;
            let fragment = document.importNode(template.content, true);
            this._nodeSetter([...fragment.childNodes]);
        }
    }

    function recursivelyInstantiate(node, parts) {
        if (node instanceof Element) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                if (attr.value.indexOf('{{') >= 0)
                    parts.splice(parts.length, 0, ...createPartsForAttribute(node, attr.localName));
            }
        } else if (node instanceof Text) {
            if (node.nodeValue.indexOf('{{') >= 0)
                parts.splice(parts.length, 0, ...createPartsForNode(node));
        }

        for (let child of node.childNodes)
            recursivelyInstantiate(child, parts);
    }

    function parseTemplateString(text, partCallback, textCallback = (text) => text)
    {
        let offset = 0;
        let length = text.length;
        let parts = [];
        do {
            const start = text.indexOf('{{', offset);
            if (start < 0)
                break;
            const end = text.indexOf('}}', offset);
            if (end < 0)
                break;

            let spansFullText = false;
            if (start > offset)
                parts.push(textCallback(text.substring(offset, start)));
            else
                spansFullText = length == end + 2;

            parts.push(partCallback(text.substring(start + 2, end), spansFullText));

            offset = end + 2;
        } while (offset < length);

        if (offset < length)
            parts.push(textCallback(text.substring(offset, length)));

        return parts;
    }

    let constructingTemplatePart = false;

    function createPartsForAttribute(element, attributeName)
    {
        constructingTemplatePart = true;
        let parts = [];
        let partsWithText = parseTemplateString(element.getAttribute(attributeName), (expression) => {
            let newPart = new AttributeTemplatePart(expression);
            parts.push(newPart);
            return newPart;
        });
        constructingTemplatePart = false;

        if (partsWithText.length == 1) { // Full templatization.
            parts[0]._valueGetter = () => element.getAttribute(attributeName);
            parts[0]._valueSetter = (newValue) => element.setAttribute(attributeName, newValue);
            element.setAttribute(attributeName, '');
            return parts;
        }

        const detach = () => {
            element = null;
            observer.disconnect();
        }
        const detachIfNeeded = () => {
            if (element && observer.takeRecords().length)
                detach();
        }
        const observer = new MutationObserver(detach);

        parts.forEach((part) => {
            let value = '';
            part._valueGetter = () => {
                detachIfNeeded();
                return value;
            };
            part._valueSetter = (newValue) => {
                detachIfNeeded();
                value = newValue;
                if (!element)
                    return;
                element.setAttribute(attributeName, partsWithText.join(''));
                observer.takeRecords();
            };
        });

        observer.observe(element, {attributes: true, attributeFilter: [attributeName]});
        element.setAttribute(attributeName, partsWithText.join(''));
        observer.takeRecords();

        return parts;
    }

    function textContent(nodeList)
    {
        let result = '';
        for (let node of nodeList)
            result += node.textContent;
        return result;
    }

    function createPartsForNode(textNode)
    {
        constructingTemplatePart = true;
        const parts = [];
        const partsWithText = parseTemplateString(textNode.nodeValue, (expression) => {
            const part = new NodeTemplatePart(expression);
            parts.push(part);
            return {nodes: [], part};
        }, (text) => {
            return {nodes: [new Text(text)]};
        });
        constructingTemplatePart = false;

        if (partsWithText.length == 1 && textNode.parentNode.childNodes.length == 1) { // Full templatization.
            const part = parts[0];
            const parentNode = textNode.parentNode;
            part._valueGetter = () => textContent(parentNode.childNodes);
            part._valueSetter = (text) => parentNode.textContent = text;
            part._nodeSetter = (nodes) => {
                let oldNodes = [...parentNode.childNodes];
                for (let node of oldNodes)
                    node.remove();
                for (let node of nodes)
                    parentNode.appendChild(node);
            }
            part._valueSetter('');
            return parts;
        }

        const nodeInfo = {
            parentNode: textNode.parentNode,
            previousSibling: textNode.previousSibling,
            nextSibling: textNode.nextSibling,
            insertedNodes: null,
        }

        // FIXME: What should we do if nodes' attributes have been mutated?
        const detachIfNeeded = (mutationRecords) => {
            if (shouldDetach(mutationRecords, nodeInfo)) {
                observer.disconnect();
                observer = null;
            }
        }
        const shouldUpdate = () => {
            if (observer)
                detachIfNeeded(observer.takeRecords());
            return !!observer;
        }
        let observer = new MutationObserver(detachIfNeeded);
        observer.observe(nodeInfo.parentNode, {childList: true});

        partsWithText.forEach((item) => {
            if (!item.part)
                return;

            const part = item.part;
            part._nodeGetter = () => item.nodes;
            part._nodeSetter = (newNodes) => {
                item.nodes = newNodes;
                if (!shouldUpdate()) {
                    return;
                }

                replaceNodes(partsWithText, nodeInfo);
                observer.takeRecords();
            }
            part._valueGetter = () => textContent(item.nodes);
            part._valueSetter = (text) => {
                if (text == '')
                    part._nodeSetter([]);
                else if (shouldUpdate() && isSingleTextNode(item.nodes))
                    item.nodes[0].data = text;
                else
                    part._nodeSetter([new Text(text)]);
            };
        });

        replaceNodes(partsWithText, nodeInfo);
        observer.takeRecords();

        return parts;
    }

    // nodeInfo = {previousSibling, nextSibling, parentNode, insertedNodes};
    function shouldDetach(mutationRecords, nodeInfo)
    {
        for (let record of mutationRecords) {
            for (let removedNode of record.removedNodes) {
                if (removedNode == nodeInfo.previousSibling)
                    nodeInfo.previousSibling = record.previousSibling;
                if (removedNode == nodeInfo.nextSibling)
                    nodeInfo.nextSibling = record.nextSibling;
                if (nodeInfo.insertedNodes.includes(removedNode))
                    return true;
            }
            if (record.addedNodes.length) {
                if (record.nextSibling == nodeInfo.nextSibling)
                    nodeInfo.nextSibling = record.addedNodes[0];
                if (record.previousSibling == nodeInfo.previousSibling)
                    nodeInfo.previousSibling = record.addedNodes[record.addedNodes.length - 1];
                if (nodeInfo.insertedNodes.includes(record.nextSibling)
                    && nodeInfo.insertedNodes.includes(record.previousSibling))
                    return true;
            }
        }
        return false;
    }

    function replaceNodes(partsWithText, nodeInfo)
    {
        let nextSibling = nodeInfo.nextSibling;
        let parentNode = nodeInfo.parentNode;
        let existingNodes = [];

        const startingNode = nodeInfo.previousSibling ? nodeInfo.previousSibling.nextSibling : parentNode.firstChild;
        for (let node = startingNode; node && node != nextSibling; node = node.nextSibling)
            existingNodes.push(node);

        let newNodes = [];
        for (let part of partsWithText) {
            for (let node of part.nodes)
                newNodes.push(node);
        }

        let start = 0;
        let minLength = Math.min(existingNodes.length, newNodes.length);
        while (existingNodes[start] == newNodes[start] && start < minLength)
            start++;

        let end = 0;
        if (existingNodes.length && newNodes.length) {
            const existingEnd = existingNodes.length - 1;
            const newEnd = newNodes.length - 1;
            while (existingNodes[existingEnd - end] == newNodes[newEnd - end] && end < minLength)
                end++;
        }
        let removeEnd = existingNodes.length - end;
        let addEnd = newNodes.length - end;

        nextSibling = existingNodes[removeEnd] || nextSibling;
        for (let i = start; i < removeEnd; i++)
            existingNodes[i].remove();

        for (let i = start; i < addEnd; i++)
            parentNode.insertBefore(newNodes[i], nextSibling);

        nodeInfo.insertedNodes = newNodes;
    }

    function isSingleTextNode(value)
    {
        return value.length == 1 && value[0] instanceof Text;
    }

})();
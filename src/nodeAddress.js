

export function nodeAtAddress(root, address) {
  if (address.length === 0) {
    return root;
  } else {
    const index = address[0];
    const rest = address.slice(1);
    const element = root.childNodes[index];
    return nodeAtAddress(element, rest);
  }
}


// Given a node inside the tree owned by root, return its address.
export function findNodeAddress(root, node) {
  if (node === root) {
    return [];
  } else if (!node.parentNode) {
    return null;
  } else {
    const base = findNodeAddress(root, node.parentNode);
    const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
    return base.concat(index);
  }
}

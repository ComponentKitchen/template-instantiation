/*
 * A node address is an object that uniquely identifies a node in a tree *or any
 * identical clone of that tree*.
 * 
 * The address takes the form of an array of childNodes indices. The original
 * node can be obtained by descending the tree using those indices.
 * 
 * Example: in the following tree:
 * 
 *     <div>
 *       <span></span>
 *       <p>
 *         <strong></strong>
 *         <em></em>
 *       </p>
 *     </div>
 * 
 * The top div has address `[]`.
 * The span has address `[0]`.
 * The paragraph has address `[1]`.
 * The strong element has address `[1, 0]`.
 * The em element has address `[1, 1]`.
 */


// Return the node at the given address below the root.
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

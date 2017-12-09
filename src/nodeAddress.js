/*
 * A node address is an object that uniquely identifies a node in a tree *or any
 * identical clone of that tree*.
 * 
 * The address takes the form of an array of childNodes indices. The addressed
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
 * The top div has address [].
 * The span has address [0].
 * The paragraph has address [1].
 * The strong element has address [1, 0].
 * The em element has address [1, 1].
 */


// Return the node at the given address below the root.
export function nodeAtAddress(root, address) {
  return address.reduce((node, index) => node.childNodes[index], root);
}


// Given a node inside the tree owned by root, return its address.
// Return null if the node doesn't exist in the tree at or below root.
export function findNodeAddress(root, node) {
  if (node === root) {
    return [];
  }
  
  const parent = node.parentNode;
  if (!parent) {
    return null; // Not found
  }

  const parentAddress = findNodeAddress(root, parent);
  const index = Array.prototype.indexOf.call(parent.childNodes, node);
  const address = parentAddress.concat(index);
  return address;
}

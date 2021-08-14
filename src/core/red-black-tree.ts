import { Color, Node } from "./red-black-node";
import { greaterThanOrEqual, lessThan, lessThanOrEqual } from "./comparable";
import { equality } from "./equatable";
import { assert } from "../shared";

// Copied from
// https://www.cs.princeton.edu/~rs/talks/LLRB/LLRB.pdf
// https://www.cs.princeton.edu/~rs/talks/LLRB/RedBlack.pdf

function isRed<Key, Value>(node: Node<Key, Value> | null): boolean {
  if (node === null) {
    return false;
  }

  return node.color === Color.Red;
}

function flipColor<Key, Value>(node: Node<Key, Value>): void {
  node.color = isRed(node) ? Color.Black : Color.Red;
}

function flipColors<Key, Value>(node: Node<Key, Value>): void {
  flipColor(node);

  assert(node.left !== null);
  flipColor(node.left);

  assert(node.right !== null);
  flipColor(node.right);
}

function rotateLeft<Key, Value>(node: Node<Key, Value>): Node<Key, Value> {
  // Make a right-leaning 3-node lean to the left.
  const right = node.right;

  assert(right !== null);
  node.right = right.left;
  right.left = node;
  right.color = node.color;
  node.color = Color.Red;

  return right;
}

function rotateRight<Key, Value>(node: Node<Key, Value>): Node<Key, Value> {
  // Make a left-leaning 3-node lean to the right.
  const left = node.left;

  assert(left !== null);
  node.left = left.right;
  left.right = node;
  left.color = node.color;
  node.color = Color.Red;

  return left;
}

function moveRedLeft<Key, Value>(node: Node<Key, Value>): Node<Key, Value> {
  // Assuming that node is red and both node.left and node.left.left
  // are black, make node.left or one of its children red.
  flipColors(node);

  assert(node.right !== null);

  if (isRed(node.right.left)) {
    node.right = rotateRight(node.right);
    node = rotateLeft(node);
    flipColors(node);
  }

  return node;
}

function moveRedRight<Key, Value>(node: Node<Key, Value>): Node<Key, Value> {
  // Assuming that node is red and both node.right and node.right.left
  // are black, make node.right or one of its children red.
  flipColors(node);

  assert(node.left !== null);

  if (isRed(node.left.left)) {
    node = rotateRight(node);
    flipColors(node);
  }

  return node;
}

function fixUp<Key, Value>(node: Node<Key, Value>): Node<Key, Value> {
  if (isRed(node.right) && !isRed(node.left)) {
    node = rotateLeft(node);
  }

  if (isRed(node.left)) {
    assert(node.left !== null);

    if (isRed(node.left.left)) {
      node = rotateRight(node);
    }
  }

  if (isRed(node.left) && isRed(node.right)) {
    flipColors(node);
  }

  return node;
}

/**
 * @public
 *
 * The red black tree holds key-value pairs.
 */
export class RedBlackTree<Key, Value> implements Iterable<[Key, Value]> {
  #root: Node<Key, Value> | null = null;
  #size = 0;

  /**
   * Creates a new red black tree.
   */
  constructor();

  /**
   * Creates a new, shallow-copied red black tree instance from an iterable
   * object.
   *
   * @param iterable - An `Array` or other iterable object whose elements are
   * key-value pairs. (For example, arrays with two elements, such as
   * `[[ 1, 'one' ],[ 2, 'two' ]]`.) Each key-value pair is added to the new
   * red black tree.
   */
  constructor(iterable: Iterable<[Key, Value]>);

  constructor(iterable: Iterable<[Key, Value]> = []) {
    for (const entry of iterable) {
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Returns the number of elements in a red black tree.
   */
  get size(): number {
    return this.#size;
  }

  /**
   * Returns a new Iterator object that contains the `[key, value]` pairs for
   * each element in the red black tree in in-order.
   */
  [Symbol.iterator](): Iterator<[Key, Value]> {
    return this.entries();
  }

  /**
   * Returns a new Iterator object that contains the `[key, value]` pairs for
   * each element in the red black tree in in-order.
   */
  entries(): Iterator<[Key, Value]> {
    let node = this.#root;
    const stack: Node<Key, Value>[] = [];

    return {
      next(): IteratorResult<[Key, Value]> {
        while (node !== null || stack.length > 0) {
          if (node !== null) {
            stack.push(node);
            node = node.left;
          } else {
            const last = stack.pop();

            assert(last !== undefined);
            node = last;

            const entry: [Key, Value] = [node.key, node.value];

            node = node.right;

            return {
              done: false,
              value: entry,
            };
          }
        }

        return {
          done: true,
          value: undefined,
        };
      },
    };
  }

  /**
   * Returns a new Iterator object that contains the keys for each element in
   * the red black tree in in-order.
   */
  keys(): Iterator<Key> {
    const iterator = this.entries();

    return {
      next(): IteratorResult<Key> {
        const next = iterator.next();

        if (next.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        const entry = next.value;

        return {
          done: false,
          value: entry[0],
        };
      },
    };
  }

  /**
   * Returns a new Iterator object that contains the values for each element in
   * the red black tree in in-order.
   */
  values(): Iterator<Value> {
    const iterator = this.entries();

    return {
      next(): IteratorResult<Value> {
        const next = iterator.next();

        if (next.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        const entry = next.value;

        return {
          done: false,
          value: entry[1],
        };
      },
    };
  }

  /**
   * Removes all elements from a red black tree.
   */
  clear(): void {
    this.#root = null;
    this.#size = 0;
  }

  /**
   * Returns a specified element from a red black tree.
   *
   * @param key - The key of the element to return from the red black tree.
   */
  get(key: Key): Value | undefined {
    const node = this.#get(this.#root, key);

    if (node === null) {
      return undefined;
    }

    return node.value;
  }

  /**
   * Returns the key of the smallest element from a red black tree.
   */
  min(): Key | undefined {
    if (this.#root === null) {
      return undefined;
    }

    return this.#min(this.#root).key;
  }

  /**
   * Returns the key of the largest element from a red black tree.
   */
  max(): Key | undefined {
    if (this.#root === null) {
      return undefined;
    }

    return this.#max(this.#root).key;
  }

  /**
   * Returns the key of the largest element less than to the given key.
   *
   * @param key - The given key.
   */
  previous(key: Key): Key | undefined {
    const node = this.#previous(this.#root, key);

    if (node === null) {
      return undefined;
    }

    return node.key;
  }

  /**
   * Returns the key of the smallest element greater than to the given key.
   *
   * @param key - The given key.
   */
  next(key: Key): Key | undefined {
    const node = this.#next(this.#root, key);

    if (node === null) {
      return undefined;
    }

    return node.key;
  }

  /**
   * Adds or updates an element with a specified key and a value to a red black
   * tree.
   *
   * @param key - The key of the element to add to the red black tree.
   * @param value - The value of the element to add to the red black tree.
   */
  set(key: Key, value: Value): RedBlackTree<Key, Value> {
    this.#root = this.#set(this.#root, key, value);
    this.#root.color = Color.Black;

    return this;
  }

  /**
   * Removes the smallest element from a red black tree.
   */
  deleteMin(): boolean {
    if (this.#root === null) {
      return false;
    }

    const size = this.#size;

    this.#root = this.#deleteMin(this.#root);

    if (this.#root === null) {
      return this.#size < size;
    }

    this.#root.color = Color.Black;

    return this.#size < size;
  }

  /**
   * Removes the largest element from a red black tree.
   */
  deleteMax(): boolean {
    if (this.#root === null) {
      return false;
    }

    const size = this.#size;

    this.#root = this.#deleteMax(this.#root);

    if (this.#root === null) {
      return this.#size < size;
    }

    this.#root.color = Color.Black;

    return this.#size < size;
  }

  /**
   * Removes the specified element from a red black tree by key.
   *
   * @param key - The key of the element to remove from the red black tree.
   */
  delete(key: Key): boolean {
    if (this.#root === null) {
      return false;
    }

    const size = this.#size;

    this.#root = this.#delete(this.#root, key);

    if (this.#root === null) {
      return this.#size < size;
    }

    this.#root.color = Color.Black;

    return this.#size < size;
  }

  #get(node: Node<Key, Value> | null, key: Key): Node<Key, Value> | null {
    if (node === null) {
      return null;
    }

    if (equality(key, node.key)) {
      return node;
    } else if (lessThan(key, node.key)) {
      return this.#get(node.left, key);
    } else {
      return this.#get(node.right, key);
    }
  }

  #min(node: Node<Key, Value>): Node<Key, Value> {
    if (node.left === null) {
      return node;
    }

    return this.#min(node.left);
  }

  #max(node: Node<Key, Value>): Node<Key, Value> {
    if (node.right === null) {
      return node;
    }

    return this.#max(node.right);
  }

  #previous(node: Node<Key, Value> | null, key: Key): Node<Key, Value> | null {
    if (node === null) {
      return null;
    }

    if (lessThanOrEqual(key, node.key)) {
      return this.#previous(node.left, key);
    } else {
      const previous = this.#previous(node.right, key);

      if (previous !== null) {
        return previous;
      } else {
        return node;
      }
    }
  }

  #next(node: Node<Key, Value> | null, key: Key): Node<Key, Value> | null {
    if (node === null) {
      return null;
    }

    if (greaterThanOrEqual(key, node.key)) {
      return this.#next(node.right, key);
    } else {
      const next = this.#next(node.left, key);

      if (next !== null) {
        return next;
      } else {
        return node;
      }
    }
  }

  #set(
    node: Node<Key, Value> | null,
    key: Key,
    value: Value
  ): Node<Key, Value> {
    if (node === null) {
      this.#size += 1;

      return new Node(key, value);
    }

    if (equality(key, node.key)) {
      node.value = value;
    } else if (lessThan(key, node.key)) {
      node.left = this.#set(node.left, key, value);
    } else {
      node.right = this.#set(node.right, key, value);
    }

    return fixUp(node);
  }

  #deleteMin(node: Node<Key, Value>): Node<Key, Value> | null {
    if (node.left === null) {
      this.#size -= 1;

      return null;
    }

    if (!isRed(node.left) && !isRed(node.left.left)) {
      node = moveRedLeft(node);
    }

    assert(node.left !== null);
    node.left = this.#deleteMin(node.left);

    return fixUp(node);
  }

  #deleteMax(node: Node<Key, Value>): Node<Key, Value> | null {
    if (isRed(node.left)) {
      node = rotateRight(node);
    }

    if (node.right === null) {
      this.#size -= 1;

      return null;
    }

    if (!isRed(node.right) && !isRed(node.right.left)) {
      node = moveRedRight(node);
    }

    assert(node.right !== null);
    node.right = this.#deleteMax(node.right);

    return fixUp(node);
  }

  #delete(node: Node<Key, Value>, key: Key): Node<Key, Value> | null {
    if (lessThan(key, node.key)) {
      assert(node.left !== null);

      if (!isRed(node.left)) {
        if (!isRed(node.left.left)) {
          node = moveRedLeft(node);
        }
      }

      assert(node.left !== null);
      node.left = this.#delete(node.left, key);
    } else {
      if (isRed(node.left)) {
        node = rotateRight(node);
      }

      if (equality(key, node.key) && node.right === null) {
        this.#size -= 1;

        return null;
      }

      if (!isRed(node.right)) {
        if (node.right !== null && !isRed(node.right.left)) {
          node = moveRedRight(node);
        }
      }

      if (equality(key, node.key)) {
        assert(node.right !== null);

        const min = this.#min(node.right);

        node.key = min.key;
        node.value = min.value;
        node.right = this.#deleteMin(node.right);
      } else {
        if (node.right !== null) {
          node.right = this.#delete(node.right, key);
        }
      }
    }

    return fixUp(node);
  }
}

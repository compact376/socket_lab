//#region node_modules/d3-hierarchy/src/hierarchy/count.js
function count(node) {
	var sum = 0, children = node.children, i = children && children.length;
	if (!i) sum = 1;
	else while (--i >= 0) sum += children[i].value;
	node.value = sum;
}
function count_default() {
	return this.eachAfter(count);
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/each.js
function each_default(callback, that) {
	let index = -1;
	for (const node of this) callback.call(that, node, ++index, this);
	return this;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/eachBefore.js
function eachBefore_default(callback, that) {
	var node = this, nodes = [node], children, i, index = -1;
	while (node = nodes.pop()) {
		callback.call(that, node, ++index, this);
		if (children = node.children) for (i = children.length - 1; i >= 0; --i) nodes.push(children[i]);
	}
	return this;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/eachAfter.js
function eachAfter_default(callback, that) {
	var node = this, nodes = [node], next = [], children, i, n, index = -1;
	while (node = nodes.pop()) {
		next.push(node);
		if (children = node.children) for (i = 0, n = children.length; i < n; ++i) nodes.push(children[i]);
	}
	while (node = next.pop()) callback.call(that, node, ++index, this);
	return this;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/find.js
function find_default(callback, that) {
	let index = -1;
	for (const node of this) if (callback.call(that, node, ++index, this)) return node;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/sum.js
function sum_default(value) {
	return this.eachAfter(function(node) {
		var sum = +value(node.data) || 0, children = node.children, i = children && children.length;
		while (--i >= 0) sum += children[i].value;
		node.value = sum;
	});
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/sort.js
function sort_default(compare) {
	return this.eachBefore(function(node) {
		if (node.children) node.children.sort(compare);
	});
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/path.js
function path_default(end) {
	var start = this, ancestor = leastCommonAncestor(start, end), nodes = [start];
	while (start !== ancestor) {
		start = start.parent;
		nodes.push(start);
	}
	var k = nodes.length;
	while (end !== ancestor) {
		nodes.splice(k, 0, end);
		end = end.parent;
	}
	return nodes;
}
function leastCommonAncestor(a, b) {
	if (a === b) return a;
	var aNodes = a.ancestors(), bNodes = b.ancestors(), c = null;
	a = aNodes.pop();
	b = bNodes.pop();
	while (a === b) {
		c = a;
		a = aNodes.pop();
		b = bNodes.pop();
	}
	return c;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/ancestors.js
function ancestors_default() {
	var node = this, nodes = [node];
	while (node = node.parent) nodes.push(node);
	return nodes;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/descendants.js
function descendants_default() {
	return Array.from(this);
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/leaves.js
function leaves_default() {
	var leaves = [];
	this.eachBefore(function(node) {
		if (!node.children) leaves.push(node);
	});
	return leaves;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/links.js
function links_default() {
	var root = this, links = [];
	root.each(function(node) {
		if (node !== root) links.push({
			source: node.parent,
			target: node
		});
	});
	return links;
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/iterator.js
function* iterator_default() {
	var node = this, current, next = [node], children, i, n;
	do {
		current = next.reverse(), next = [];
		while (node = current.pop()) {
			yield node;
			if (children = node.children) for (i = 0, n = children.length; i < n; ++i) next.push(children[i]);
		}
	} while (next.length);
}
//#endregion
//#region node_modules/d3-hierarchy/src/hierarchy/index.js
function hierarchy(data, children) {
	if (data instanceof Map) {
		data = [void 0, data];
		if (children === void 0) children = mapChildren;
	} else if (children === void 0) children = objectChildren;
	var root = new Node(data), node, nodes = [root], child, childs, i, n;
	while (node = nodes.pop()) if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
		node.children = childs;
		for (i = n - 1; i >= 0; --i) {
			nodes.push(child = childs[i] = new Node(childs[i]));
			child.parent = node;
			child.depth = node.depth + 1;
		}
	}
	return root.eachBefore(computeHeight);
}
function node_copy() {
	return hierarchy(this).eachBefore(copyData);
}
function objectChildren(d) {
	return d.children;
}
function mapChildren(d) {
	return Array.isArray(d) ? d[1] : null;
}
function copyData(node) {
	if (node.data.value !== void 0) node.value = node.data.value;
	node.data = node.data.data;
}
function computeHeight(node) {
	var height = 0;
	do
		node.height = height;
	while ((node = node.parent) && node.height < ++height);
}
function Node(data) {
	this.data = data;
	this.depth = this.height = 0;
	this.parent = null;
}
Node.prototype = hierarchy.prototype = {
	constructor: Node,
	count: count_default,
	each: each_default,
	eachAfter: eachAfter_default,
	eachBefore: eachBefore_default,
	find: find_default,
	sum: sum_default,
	sort: sort_default,
	path: path_default,
	ancestors: ancestors_default,
	descendants: descendants_default,
	leaves: leaves_default,
	links: links_default,
	copy: node_copy,
	[Symbol.iterator]: iterator_default
};
//#endregion
//#region node_modules/d3-hierarchy/src/tree.js
function defaultSeparation(a, b) {
	return a.parent === b.parent ? 1 : 2;
}
function nextLeft(v) {
	var children = v.children;
	return children ? children[0] : v.t;
}
function nextRight(v) {
	var children = v.children;
	return children ? children[children.length - 1] : v.t;
}
function moveSubtree(wm, wp, shift) {
	var change = shift / (wp.i - wm.i);
	wp.c -= change;
	wp.s += shift;
	wm.c += change;
	wp.z += shift;
	wp.m += shift;
}
function executeShifts(v) {
	var shift = 0, change = 0, children = v.children, i = children.length, w;
	while (--i >= 0) {
		w = children[i];
		w.z += shift;
		w.m += shift;
		shift += w.s + (change += w.c);
	}
}
function nextAncestor(vim, v, ancestor) {
	return vim.a.parent === v.parent ? vim.a : ancestor;
}
function TreeNode(node, i) {
	this._ = node;
	this.parent = null;
	this.children = null;
	this.A = null;
	this.a = this;
	this.z = 0;
	this.m = 0;
	this.c = 0;
	this.s = 0;
	this.t = null;
	this.i = i;
}
TreeNode.prototype = Object.create(Node.prototype);
function treeRoot(root) {
	var tree = new TreeNode(root, 0), node, nodes = [tree], child, children, i, n;
	while (node = nodes.pop()) if (children = node._.children) {
		node.children = new Array(n = children.length);
		for (i = n - 1; i >= 0; --i) {
			nodes.push(child = node.children[i] = new TreeNode(children[i], i));
			child.parent = node;
		}
	}
	(tree.parent = new TreeNode(null, 0)).children = [tree];
	return tree;
}
function tree_default() {
	var separation = defaultSeparation, dx = 1, dy = 1, nodeSize = null;
	function tree(root) {
		var t = treeRoot(root);
		t.eachAfter(firstWalk), t.parent.m = -t.z;
		t.eachBefore(secondWalk);
		if (nodeSize) root.eachBefore(sizeNode);
		else {
			var left = root, right = root, bottom = root;
			root.eachBefore(function(node) {
				if (node.x < left.x) left = node;
				if (node.x > right.x) right = node;
				if (node.depth > bottom.depth) bottom = node;
			});
			var s = left === right ? 1 : separation(left, right) / 2, tx = s - left.x, kx = dx / (right.x + s + tx), ky = dy / (bottom.depth || 1);
			root.eachBefore(function(node) {
				node.x = (node.x + tx) * kx;
				node.y = node.depth * ky;
			});
		}
		return root;
	}
	function firstWalk(v) {
		var children = v.children, siblings = v.parent.children, w = v.i ? siblings[v.i - 1] : null;
		if (children) {
			executeShifts(v);
			var midpoint = (children[0].z + children[children.length - 1].z) / 2;
			if (w) {
				v.z = w.z + separation(v._, w._);
				v.m = v.z - midpoint;
			} else v.z = midpoint;
		} else if (w) v.z = w.z + separation(v._, w._);
		v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
	}
	function secondWalk(v) {
		v._.x = v.z + v.parent.m;
		v.m += v.parent.m;
	}
	function apportion(v, w, ancestor) {
		if (w) {
			var vip = v, vop = v, vim = w, vom = vip.parent.children[0], sip = vip.m, sop = vop.m, sim = vim.m, som = vom.m, shift;
			while (vim = nextRight(vim), vip = nextLeft(vip), vim && vip) {
				vom = nextLeft(vom);
				vop = nextRight(vop);
				vop.a = v;
				shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
				if (shift > 0) {
					moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
					sip += shift;
					sop += shift;
				}
				sim += vim.m;
				sip += vip.m;
				som += vom.m;
				sop += vop.m;
			}
			if (vim && !nextRight(vop)) {
				vop.t = vim;
				vop.m += sim - sop;
			}
			if (vip && !nextLeft(vom)) {
				vom.t = vip;
				vom.m += sip - som;
				ancestor = v;
			}
		}
		return ancestor;
	}
	function sizeNode(node) {
		node.x *= dx;
		node.y = node.depth * dy;
	}
	tree.separation = function(x) {
		return arguments.length ? (separation = x, tree) : separation;
	};
	tree.size = function(x) {
		return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], tree) : nodeSize ? null : [dx, dy];
	};
	tree.nodeSize = function(x) {
		return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], tree) : nodeSize ? [dx, dy] : null;
	};
	return tree;
}
//#endregion
export { hierarchy as n, tree_default as t };

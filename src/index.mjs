/** Visitor factory for babel, converting React.createElement(...) to <jsx ...>...</jsx>
 *
 * What we want to handle here is this CallExpression v3:
 *
 *     React.createElement(
 *       type: StringLiteral|Identifier|MemberExpression,
 *       [props: ObjectExpression|Expression],
 *       [...children: StringLiteral|Expression]
 *     )
 *
 * Or v4 (children are included in props):
 *
 *     JsxRuntime.jsx(
 *       type: StringLiteral|Identifier|MemberExpression,
 *       [props: ObjectExpression|Expression],
 *     )
 *
 * Any of those arguments might also be missing (undefined) and/or invalid. */
 export default function (babel) {
  /**
   * This enables autocompletion in vs code
   * @type {{types: import("@babel/types")}}
   */
  const { types: t } = babel;

  function getJSXIdentifier(node) {
    //TODO: JSXNamespacedName
    if (t.isIdentifier(node)) return t.jSXIdentifier(node.name);
    if (t.isStringLiteral(node)) return t.jSXIdentifier(node.value);
    return null;
  }

  function getJSXAttributeValue(node) {
    if (t.isStringLiteral(node)) return node;
    if (t.isJSXElement(node)) return node;
    if (t.isExpression(node)) return t.jSXExpressionContainer(node);
    return null;
  }

  /** Get a JSXIdentifier or JSXMemberExpression from a Node of known type.
   * Returns null if a unknown node type, null or undefined is passed. */
  function getJSXName(node) {
    if (node == null) return null;

    const name = getJSXIdentifier(node);
    if (name !== null) return name;

    if (!t.isMemberExpression(node)) return null;
    const object = getJSXName(node.object);
    const property = getJSXName(node.property);
    if (object === null || property === null) return null;
    return t.jSXMemberExpression(object, property);
  }

  /** Get a array of JSX(Spread)Attribute from a props ObjectExpression.
   * Handles the _extends Expression babel creates from SpreadElement nodes.
   * Returns null if a validation error occurs. */
  function getJSXProps(node) {
    if (node == null || isNullLikeNode(node)) return [];

    if (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: "_extends" })
    ) {
      const props = node.arguments.map(getJSXProps);
      //if calling this recursively works, flatten.
      if (props.every((prop) => prop !== null))
        return [].concat.apply([], props);
    }

    if (!t.isObjectExpression(node) && t.isExpression(node))
      return [t.jSXSpreadAttribute(node)];

    if (!isPlainObjectExpression(node)) return null;
    return node.properties.map((prop) =>
      t.isObjectProperty(prop)
        ? t.jSXAttribute(
            getJSXIdentifier(prop.key),
            getJSXAttributeValue(prop.value)
          )
        : t.jSXSpreadAttribute(prop.argument)
    );
  }

  /** Tests if a node is “null” or “undefined” */
  const isNullLikeNode = (node) =>
    t.isNullLiteral(node) || t.isIdentifier(node, { name: "undefined" });

  /** Tests if a node is an object expression with noncomputed, nonmethod attrs */
  const isPlainObjectExpression = (node) =>
    t.isObjectExpression(node) &&
    node.properties.every(
      (m) =>
        t.isSpreadElement(m) ||
        (t.isObjectProperty(m, { computed: false }) &&
          getJSXIdentifier(m.key) !== null &&
          getJSXAttributeValue(m.value) !== null)
    );

  /** tests if a node is a react fragment (<></>) */
  const isReactFragment = (node) => {
    return (
      t.isMemberExpression(node) &&
      (
        t.isIdentifier(node.object, { name: "JsxRuntime" }) ||
        t.isIdentifier(node.object, { name: "ReasonReact" }) ||
        t.isIdentifier(node.object, { name: "React" })) &&
      (
        t.isIdentifier(node.property, { name: "Fragment" }) ||
        t.isIdentifier(node.property, { name: "fragment" }) ||
        t.isIdentifier(node.property, { name: "jsxFragment" }))
    );
  };

  /** Creates a JSX Fragment with given children */
  const createJsxFragment = (children) => {
    return t.jSXFragment(
      t.jSXOpeningFragment(),
      t.jSXClosingFragment(),
      children
    );
  };

  /** Creates a JSX Element */
  const createJsxElement = (name, props, children) => {
    // self-closing tag if no children
    const selfClosing = children.length === 0;
    const startTag = t.jSXOpeningElement(name, props, selfClosing);
    const endTag = selfClosing ? null : t.jSXClosingElement(name);

    return t.jSXElement(startTag, endTag, children, selfClosing);
  };

  function getJSXChild(node) {
    if (t.isStringLiteral(node)) {
      // Solidjs reads from node.extra.raw, but jSXText doesn't create it. So we do it by hand.
      return { ...t.jSXText(node.value), extra: { raw: node.value } };
    }
    if (getNodeJsxVersion(node)) return getJSXNode(node);
    if (t.isExpression(node)) return t.jSXExpressionContainer(node);
    return null;
  }

  /** Tests if a node is a CallExpression with a callee that matches a Jsx.Element
   * like “React.createElement” or "JsxRuntime.jsx".
   * @param {import("@babel/traverse").Node} node
   */
  const getNodeJsxVersion = (node) => {
    if (
      t.isCallExpression(node) &&
      t.isMemberExpression(node.callee) &&
      (
        t.isIdentifier(node.callee.object, { name: "JsxRuntime" }) ||
        t.isIdentifier(node.callee.object, { name: "React" }) ||
        t.isIdentifier(node.callee.object, { name: "ReactDOM" }) ||
        t.isIdentifier(node.callee.object, { name: "ReactDOMRe" })
      )
    ) {
      if (
        t.isIdentifier(node.callee.property, { name: "createElement" }) ||
        t.isIdentifier(node.callee.property, { name: "createElementVariadic" }) ||
        t.isIdentifier(node.callee.property, {
          name: "createDOMElementVariadic",
        })
      ) {
        return "v3"
      }  
      if (
        t.isIdentifier(node.callee.property, { name: "jsx" }) ||
        t.isIdentifier(node.callee.property, { name: "jsxs" }) ||
        t.isIdentifier(node.callee.property, { name: "jsxDEV" })
      ) {
        return "v4"
      } 
    }
    return null
  }

  /** tests if an array of nodes only contains empty ArrayExpressions */
  const isEmptyChildren = (children) => {
    return children.every(
      (child) => child.elements && child.elements.length === 0
    );
  };

  function getJSXChildrenV3(nodes) {
    const children = nodes
      .filter((node) => !isNullLikeNode(node))
      .map(getJSXChild);
    if (children.some((child) => child == null)) return null;
    return children;
  }
  
  function hasJSXChildrenV4(node) {
    return (
      t.isObjectExpression(node) &&
      node.properties.some((p) => t.isIdentifier(p.key, { name: "children" }))
    );
  }

  function getJSXChildrenV4(node) {
    const childrenProp = node.properties.filter((p) =>
      t.isIdentifier(p.key, { name: "children" })
    )[0].value;
    const children = t.isArrayExpression(childrenProp)
      ? childrenProp.elements
      : [childrenProp];
    return children.map(getJSXChild);
  }

  function removeChildrenFromPropsV4(node) {
    const props = node.properties.filter(
      (p) => !t.isIdentifier(p.key, { name: "children" })
    );
    return { ...node, ...{ properties: props } };
  }

  /** Get a JSXElement from a CallExpression
   * Returns null if this impossible 
   * @param {import("@babel/traverse").Node} node
   */
  function getJSXNode(node) {
    // only transform "React.createElement" or "JsxRuntime.jsx" Expressions
    const jsxVersion = getNodeJsxVersion(node)
    if (!jsxVersion) return null;

    // nameNode and propsNode may be undefined, getJSX* need to handle that
    const [nameNode, propsNode, ...childNodes] = node.arguments;

    let name = getJSXName(nameNode);
    if (name === null) return null; //name is required

    if (jsxVersion === "v3") {
      const children = isEmptyChildren(childNodes)
        ? []
        : getJSXChildrenV3(childNodes);
      if (children === null) return null; //no children → [], invalid → null

      if (isReactFragment(nameNode)) {
        return createJsxFragment(children);
      }

      const props = getJSXProps(propsNode);
      if (props === null) return null; //no props → [], invalid → null

      return createJsxElement(name, props, children);
    } else if (jsxVersion === "v4") {
      const children = hasJSXChildrenV4(propsNode)
        ? getJSXChildrenV4(propsNode)
        : [];

      if (isReactFragment(nameNode)) {
        return createJsxFragment(children);
      }

      const props = hasJSXChildrenV4(propsNode)
        ? getJSXProps(removeChildrenFromPropsV4(propsNode))
        : getJSXProps(propsNode);
      if (props === null) return null; //no props → [], invalid → null

      return createJsxElement(name, props, children);
    }
  }

  return {
    name: "rescript-transform-to-jsx",
    visitor: {
      /**
       * We are interested in Jsx components
       * @param {import("@babel/traverse").NodePath} path
       * @param {import("@babel/traverse").TraversalContext} state
       */
      CallExpression(path, _) {
        const node = getJSXNode(path.node)
        if (node === null) return null;
        if (node.length && node.length > 0) {
          path.replaceWithMultiple(node);
        } else {
          path.replaceWith(node);
        }
      },
    },
  };
}

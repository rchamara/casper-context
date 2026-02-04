/**
 * @fileoverview Core dependencies and configuration constants for the Babel transformation.
 * This module orchestrates the AST node names, hook identifiers, and internal 
 * library prefixes used to inject and modify React Context logic.
 */

/**
 * AST & Babel Node Constants
 * @description These constants map to standard Babel node types and configurations 
 * to ensure consistency across the transformation lifecycle.
 */
import {
    _CCTX_BODY,           // Target property for injecting nodes into a block
    _CCTX_VAR,            // 'var' or 'const' declaration keyword
    _CCTX_REQUIRE,        // CommonJS 'require' identifier
    ANONYMOUS_FUNCTION,   // Placeholder for unnamed function expressions
    PREV_STATE,           // Identifier for functional state updates (e.g., prevState => ...)
    _CCTX_,               // Internal library prefix for generated variables
    _CCTX_CONST,          // 'const' declaration keyword
    _CCTX_USE_CONTEXT,    // React 'useContext' hook name
    _CCTX_UNDUS_CORE_GBL_CONTEXT, // The default global context name for the core lib
    _CCTX_CMP_NAME_PREFIX, // Prefix used when generating unique component identifiers
    _CCTX_CREATE_ELEMENT, // 'createElement' identifier for JSX-to-JS conversion
    _CCTX_PROVIDER,       // Context '.Provider' identifier
    _CCTX_VALUE,          // 'value' prop identifier for Providers
    _CCTX_SET,            // Setter prefix for state management
    REACT_IMPORT_USE_STATE_HOOKS_NAME, // 'useState' hook name
    _CCTX_UNDUS_CORE_REACT, // Internal reference for the React package
    _CCTX_EMPTY           // Default empty string or null placeholder
} from './constants';

/**
 * Utility Helpers
 * @description Logic-heavy functions used to determine where and how to 
 * manipulate the AST tree without corrupting the code structure.
 */
import { 
    getInsertionIndex,    // Logic to find the safest line to inject new code
    resolveReact,          // Ensures React is available in the current scope
    isContextInstanceDeclare // Check if a context has already been initialized
} from './utilityHelpers';

/**
 * Inserts a `require` declaration at the top of a given AST node path.
 *
 * This function is designed to work with Babel AST transformations. It prepends
 * a variable declaration that assigns the result of a `require` call to a
 * specified identifier. Any errors during insertion are silently caught.
 *
 * @param {NodePath} path - The Babel AST node path where the `require` declaration should be inserted.
 *                          Typically, this is the Program path or a block statement path.
 * @param {object} t - The Babel types helper object (commonly imported from `@babel/types`) used to
 *                     construct AST nodes such as variable declarations, identifiers, and call expressions.
 * @param {string} identifier - The name of the variable that will hold the `require` result.
 *                              Example: `"fs"` to create `const fs = require("fs")`.
 * @param {string} stringLiteral - The module name to pass to `require`. Example: `"fs"`, `"path"`, etc.
 *
 * @returns {void} This function does not return a value. It directly modifies the AST at the given path.
 *
 * @important
 * - `_CCTX_BODY`, `_CCTX_VAR`, and `_CCTX_REQUIRE` are assumed to be predefined constants in scope:
 *   - `_CCTX_BODY`: the container key where the declaration is inserted (e.g., `"body"`).
 *   - `_CCTX_VAR`: the variable declaration kind (`"var"`, `"let"`, or `"const"`).
 *   - `_CCTX_REQUIRE`: the identifier used for `require`.
 * - Any insertion errors are silently caught; consider logging or handling errors if needed.
 * - This function mutates the AST in place and does not return a new node.
 */
export function buildRequireDeclaration (path, t, identifier, stringLiteral) {
    try {
        path.unshiftContainer(
            _CCTX_BODY,
            t.variableDeclaration(_CCTX_VAR, [
                t.variableDeclarator(
                    t.identifier(identifier),
                    t.callExpression(
                        t.identifier(_CCTX_REQUIRE),
                        [t.stringLiteral(stringLiteral)]
                    )
                )
            ])
        );
    } catch (e) {

    }
}

/**
 * Wraps a given return node with a React Context Provider call expression.
 *
 * This function transforms a React return node (JSX element or expression)
 * into a `React.createElement` call for a context provider, injecting the
 * specified state and its setter as the context value. It modifies the
 * AST node in place at the given path.
 *
 * @param {NodePath} path - The Babel AST node path where the return node resides.
 *                          Typically, this is the path of a return statement inside a function component.
 * @param {object} t - The Babel types helper object (from `@babel/types`) used to construct AST nodes.
 *                     Provides utilities like `callExpression`, `memberExpression`, and `objectExpression`.
 * @param {Node} returnNode - The AST node that represents the React component's return value.
 *                            Can be a JSX element or any valid expression.
 * @param {object} state - The current state object, used to resolve the React import name via `resolveReact`.
 * @param {string} stateName - The name of the state variable to be provided via context.
 *                             Example: `"User"` will inject `{ user, setUser }` as context value.
 *
 * @returns {void} This function does not return a value. It mutates the AST node at `path` by replacing its
 *                 `argument` with a `React.createElement` call for the context provider.
 *
 * @important
 * - `_CCTX_CREATE_ELEMENT`, `_CCTX_UNDUS_CORE_GBL_CONTEXT`, `_CCTX_PROVIDER`, `_CCTX_VALUE`, and `_CCTX_SET` 
 *   are assumed to be predefined constants controlling context creation and property naming.
 * - The state is injected as an object containing the state variable and its setter, following the pattern:
 *   `{ stateNameLowerCase, setStateName }`.
 * - JSX return nodes are converted to React.createElement using `t.jsxElementToReactCreateElement`.
 * - Any errors during AST manipulation are silently caught; consider logging for debugging purposes.
 * - This function mutates the original AST node in place and does not generate a new return statement.
 */
export function buildCtxProvider (path, t, returnNode, state, stateName) {
    try {
        const reactName = resolveReact(path, t, state)
        // Ensure returnNode is an expression
        const childrenExpr = t.isJSXElement(returnNode)
            ? t.jsxElementToReactCreateElement(returnNode) // We'll handle JSX separately if needed
            : returnNode;
        const reactCreateEl = t.callExpression(
            t.memberExpression(reactName, t.identifier(_CCTX_CREATE_ELEMENT)),
            [
                t.memberExpression(
                    t.memberExpression(
                        t.identifier(_CCTX_UNDUS_CORE_GBL_CONTEXT),
                        t.identifier(stateName)
                    ),
                    t.identifier(_CCTX_PROVIDER)
                ),
                t.objectExpression([
                    t.objectProperty(
                        t.identifier(_CCTX_VALUE),
                        t.objectExpression([
                            t.objectProperty(t.identifier(stateName[0].toLowerCase() + stateName.slice(1)), t.identifier(stateName[0].toLowerCase() + stateName.slice(1)), false, true),
                            t.objectProperty(t.identifier(`${_CCTX_SET}${stateName}`), t.identifier(`${_CCTX_SET}${stateName}`), false, true)
                        ])
                    )
                ]),
                childrenExpr
            ]
        );
        path.node.argument = reactCreateEl;
    } catch (e) {

    }
}

/**
 * Inserts a React `useState` declaration into the AST at the specified path.
 *
 * This function generates a `useState` hook declaration for a given state object
 * and injects it at the top of the target AST node's body. It handles different
 * import scenarios, including named `useState` imports, default React imports,
 * or the absence of a React import. The resulting declaration follows the
 * `[state, setState]` array pattern convention.
 *
 * @param {NodePath} path - The Babel AST node path where the `useState` declaration should be inserted.
 *                          Usually the Program body or a function component body.
 * @param {object} t - The Babel types helper object (`@babel/types`) for constructing AST nodes such as
 *                     variable declarations, identifiers, array patterns, member expressions, and call expressions.
 * @param {object} state - The current state of the transformation, including information about imported React identifiers.
 *                         Example structure: `{ importState: { useStateId, reactId } }`.
 * @param {Array<ObjectProperty>} objProps - An array of object properties to initialize the `useState` hook.
 *                                           These are used to construct the initial state object.
 * @param {string} key - The name of the state variable. The hook declaration will follow the pattern:
 *                       `[keyLowerCase, setKeyCapitalized]`.
 *                       Example: `"User"` → `[user, setUser]`.
 *
 * @returns {void} This function does not return a value. It directly mutates the AST by inserting a variable declaration.
 *
 * @important
 * - `_CCTX_CONST`, `_CCTX_SET`, and `_CCTX_UNDUS_CORE_REACT` are assumed to be predefined constants for variable
 *   declaration kind, setter naming, and fallback React identifier, respectively.
 * - `REACT_IMPORT_USE_STATE_HOOKS_NAME` is expected to be a predefined string for `"useState"`.
 * - The function creates a sequence expression `[0, useState]` as a fallback pattern; this ensures safe evaluation
 *   even if no React import is found.
 * - Errors during AST mutation are silently caught. Consider logging or handling errors for debugging purposes.
 * - The inserted variable declaration follows the standard React `useState` hook pattern and is prepended
 *   to the container body at `path.get(_CCTX_BODY)`.
 */
export function buildCtxUseStateDeclaration (path, t, state, objProps, key) {
    try {
        let useStateMembers
        if (state.importState.useStateId) {
            // case: import { useState } from 'react'
            useStateMembers = state.importState.useStateId;
        } else if (state.importState.reactId) {
            // case: import React from 'react'
            useStateMembers = t.memberExpression(state.importState.reactId, t.identifier(REACT_IMPORT_USE_STATE_HOOKS_NAME));
        } else {
            // fallback: file has no React import → optional
            const reactIdent = t.identifier(_CCTX_UNDUS_CORE_REACT);
            useStateMembers = t.memberExpression(reactIdent, t.identifier(REACT_IMPORT_USE_STATE_HOOKS_NAME));
        }
        const useStateSeq = t.sequenceExpression([
            t.numericLiteral(0),
            useStateMembers
        ]);

        const useStateCall = t.callExpression(
            useStateSeq,
            [t.objectExpression(objProps)]
        );
        const stateDecl = t.variableDeclaration(_CCTX_CONST, [
            t.variableDeclarator(
                t.arrayPattern([
                    t.identifier(key[0].toLowerCase() + key.slice(1)),
                    t.identifier(_CCTX_SET + key[0].toUpperCase() + key.slice(1))
                ]),
                useStateCall
            )
        ]);
        path.get(_CCTX_BODY).unshiftContainer(_CCTX_BODY, stateDecl);
    } catch (e) {

    }
}

/**
 * Finds the body path of the first React component function within a given AST path.
 *
 * This function searches through the child nodes of the provided AST `path`
 * and returns the body path of the first node that is a function declaration,
 * function expression, or arrow function expression and is identified as a React component.
 * If no matching component is found, it returns `null`.
 *
 * @param {NodePath} path - The Babel AST node path to search for React component functions.
 *                          Typically, this is a Program or block statement path.
 * @param {object} t - The Babel types helper object (`@babel/types`) for AST node inspection.
 *
 * @returns {NodePath|null} The AST node path corresponding to the body of the first React component function,
 *                          or `null` if no React component function is found.
 *
 * @important
 * - `_CCTX_BODY` is assumed to be a predefined constant specifying the container key for a node's body.
 * - `isReactComponent(p)` is assumed to be a helper function that determines if a node path `p` represents
 *   a valid React component (e.g., starts with a capital letter, returns JSX, etc.).
 * - Any errors during traversal are silently caught; consider adding logging for debugging.
 * - This function does not mutate the AST; it only inspects and returns the relevant body path.
 */
export function getComponentBodyPath (path, t) {
    try {
        const cmp = path.get(_CCTX_BODY).find(p =>
            (p.isFunctionDeclaration() || p.isFunctionExpression() || p.isArrowFunctionExpression())
            && isReactComponent(p)
        );
        if (!cmp) return null;
        return cmp.get(_CCTX_BODY);
    } catch (e) {

    }
}

/**
 * Retrieves the name of the nearest enclosing function or class component for a given AST path.
 *
 * This function traverses up the AST from the provided `path` to find the nearest function
 * declaration, function expression, arrow function, or class declaration. It returns the
 * identifier name if available, or a default placeholder for anonymous functions/classes.
 *
 * @param {NodePath} path - The Babel AST node path from which to start searching upwards.
 *
 * @returns {string|null} The name of the nearest enclosing function or class component.
 *                        - Returns `ANONYMOUS_FUNCTION` if the nearest function has no identifier.
 *                        - Returns `ANONYMOUS_CLASS` if the nearest class has no identifier.
 *                        - Returns `null` if no enclosing function or class is found (top-level).
 *
 * @important
 * - This function handles:
 *   1. Function declarations (`function MyComponent() {}`).
 *   2. Function expressions or arrow functions assigned to a variable (`const MyComponent = () => {}`).
 *   3. Function expressions or arrow functions assigned via assignment expression (`MyComponent = () => {}`).
 *   4. Class declarations (`class MyComponent {}`).
 * - `ANONYMOUS_FUNCTION` and `ANONYMOUS_CLASS` are assumed to be predefined constants for fallback names.
 * - Any errors during AST traversal are silently caught; logging is recommended for debugging.
 * - This function does **not** mutate the AST; it only inspects parent nodes to determine the name.
 */
export function getInheritantDecComponent (path) {
    try {
        let current = path;
        while (current) {
            if (current.isFunctionDeclaration()) {
                return current.node.id?.name || ANONYMOUS_FUNCTION;
            }
            if (
                current.isFunctionExpression() ||
                current.isArrowFunctionExpression()
            ) {
                // Check if assigned to a variable
                const parent = current.parentPath;
                if (parent?.isVariableDeclarator()) return parent.node.id?.name;
                if (parent?.isAssignmentExpression() && t.isIdentifier(parent.node.left)) {
                    return parent.node.left.name;
                }
                return ANONYMOUS_FUNCTION;
            }
            if (current.isClassDeclaration()) {
                return current.node.id?.name || ANONYMOUS_CLASS;
            }
            current = current.parentPath;
        }
        return null; // top-level, no enclosing component
    } catch (e) {

    }
}

/**
 * Retrieves the name of a React component or function from a given AST path.
 *
 * This function traverses up the AST from the provided `path` to determine the
 * component or function name. It handles function declarations, function/arrow
 * expressions assigned to variables, and default export declarations.
 *
 * @param {NodePath} path - The Babel AST node path from which to start searching upwards.
 *
 * @returns {string|null} The name of the component or function if found.
 *                        - Returns `null` if no name could be determined.
 *
 * @important
 * - Handles:
 *   1. Named function declarations: `function MyComponent() {}` → `"MyComponent"`.
 *   2. Arrow or function expressions assigned to a variable: `const MyComponent = () => {}` → `"MyComponent"`.
 *   3. Default exports with a named declaration: `export default function MyComponent() {}` → `"MyComponent"`.
 * - Does **not** mutate the AST; only inspects parent nodes.
 * - Any errors during traversal are silently caught; logging is recommended for debugging.
 * - Returns `null` if the AST path is top-level or no suitable declaration is found.
 */
export function getComponentName (path) {
    try {
        let current = path;

        while (current) {
            if (current.isFunctionDeclaration() && current.node.id) {
                return current.node.id.name;
            }

            if (
                (current.isArrowFunctionExpression() ||
                    current.isFunctionExpression()) &&
                current.parentPath?.isVariableDeclarator()
            ) {
                return current.parentPath.node.id.name;
            }

            if (
                current.isExportDefaultDeclaration()
            ) {
                const decl = current.node.declaration;

                if (decl.id?.name) {
                    return decl.id.name;
                }
            }

            current = current.parentPath;
        }

        return null;
    } catch (e) {

    }
}

/**
 * Determines whether a given AST function path represents a component-like function.
 *
 * This function checks if the provided AST `funcPath` corresponds to a function declaration,
 * or an arrow/function expression assigned to a variable. It is useful for identifying React
 * component functions in the AST.
 *
 * @param {NodePath} funcPath - The Babel AST node path to inspect.
 *
 * @returns {boolean} `true` if the node is a function declaration with an identifier, or an arrow/function expression
 *                    assigned to a variable; otherwise, `false`.
 *
 * @important
 * - Handles:
 *   1. Named function declarations: `function MyComponent() {}` → `true`.
 *   2. Arrow or function expressions assigned to a variable: `const MyComponent = () => {}` → `true`.
 * - Does **not** consider anonymous functions not assigned to variables as components.
 * - Any errors during AST inspection are silently caught; logging is recommended for debugging.
 * - This function does **not** mutate the AST; it only inspects the node type and parent path.
 */
function isComponentFunction (funcPath) {
    try {
        // function Child() {}
        if (funcPath.isFunctionDeclaration() && funcPath.node.id) {
            return true;
        }

        // const Child = () => {}
        if (
            (funcPath.isArrowFunctionExpression() ||
                funcPath.isFunctionExpression()) &&
            funcPath.parentPath.isVariableDeclarator()
        ) {
            return true;
        }

        return false;
    } catch (e) {

    }
}

/**
 * Finds the nearest enclosing React component function from a given AST path.
 *
 * This function traverses up the AST from the provided `path` and returns the
 * first function node (function declaration, function expression, or arrow function)
 * that qualifies as a component according to `isComponentFunction`. Callback functions
 * (like those in `useEffect` or array methods) are ignored.
 *
 * @param {NodePath} path - The Babel AST node path from which to start searching upwards.
 *
 * @returns {NodePath|null} The AST node path of the nearest enclosing component function,
 *                          or `null` if no component function is found.
 *
 * @important
 * - Relies on `isComponentFunction(current)` to determine whether a function is a component.
 * - Does not mutate the AST; it only traverses parent nodes to locate the component.
 * - Any errors during traversal are silently caught; consider logging for debugging.
 * - Returns `null` if the path is at the top-level or no qualifying component function exists.
 */
export function getInheritantComponent (path) {
    try {
        let current = path;

        while (current) {
            if (
                current.isFunctionDeclaration() ||
                current.isFunctionExpression() ||
                current.isArrowFunctionExpression()
            ) {
                // Exclude callbacks (useEffect, map, etc.)
                if (isComponentFunction(current)) {
                    return current;
                }
            }
            current = current.parentPath;
        }

        return null;
    } catch (e) {

    }
}

/**
 * Generates a Babel AST arrow function that returns a new object by spreading an existing state
 * and adding/updating a property with a specified value.
 *
 * This is typically used for creating updater functions in React state setters, e.g.,
 * `(prevState) => ({ ...prevState, key: value })`.
 *
 * @param {NodePath} path - The Babel AST node path representing an assignment expression
 *                          (e.g., `state.key = value`). The function uses `path.node.left`
 *                          as the property name and `path.node.right` as the value.
 * @param {object} t - The Babel types helper object (`@babel/types`) used to construct AST nodes
 *                     like identifiers, object expressions, arrow functions, and spread elements.
 *
 * @returns {Node|null} A Babel AST arrow function expression of the form:
 *                      `(prevState) => ({ ...prevState, [key]: value })`.
 *                      Returns `null` if an error occurs during AST construction.
 *
 * @important
 * - `PREV_STATE` is assumed to be a predefined constant string for the parameter name
 *   (commonly `"prevState"` in React state updater patterns).
 * - This function does **not** mutate the AST; it constructs and returns a new AST node.
 * - Errors during AST construction are silently caught. Consider logging for debugging purposes.
 */
export function buildSpreadObject (path, t) {
    try {
        const assignedValue = path.node.right;
        const paramIdentifier = t.identifier(PREV_STATE);
        const spreadExistingObject = t.spreadElement(paramIdentifier);
        const newProperty = t.objectProperty(
            t.identifier(path.node.left.name),
            assignedValue
        );
        const returnObject = t.objectExpression([
            spreadExistingObject,
            newProperty
        ]);
        const updateFunction = t.arrowFunctionExpression(
            [paramIdentifier],
            returnObject
        );
        return updateFunction
    } catch (e) {

    }
}

/**
 * Replaces an AST assignment or expression with a React setState call using a provided updater function.
 *
 * This function transforms the AST at the given `path` so that it calls the appropriate
 * state setter function (e.g., `setStateName`) with the provided update function as its argument.
 * Typically used in context/state management code transformations.
 *
 * @param {NodePath} path - The Babel AST node path to replace. Usually an assignment expression
 *                          or other state update expression.
 * @param {object} t - The Babel types helper object (`@babel/types`) used to construct AST nodes
 *                     like call expressions and identifiers.
 * @param {string} ctxName - The context or state name, which will be used to determine the setter
 *                           function name. Prefixes like `_CCTX_CMP_NAME_PREFIX` are stripped.
 *                           Example: `"User"` → generates `"setUser"`.
 * @param {Node} updateFunction - The Babel AST node representing the updater function to pass
 *                                to the setter (e.g., an arrow function created via `buildSpreadObject`).
 *
 * @returns {void} This function does not return a value; it directly replaces the AST node at `path`.
 *
 * @important
 * - `_CCTX_CMP_NAME_PREFIX` and `_CCTX_EMPTY` are assumed to be predefined constants used for cleaning
 *   or formatting the setter function name.
 * - This function mutates the AST in place and does **not** create new variable declarations.
 * - Errors during AST replacement are silently caught; logging is recommended for debugging.
 */
export function replaceWithSetState (path, t, ctxName, updateFunction) {
    try {
        path.replaceWith(t.callExpression(
            t.identifier(`set${ctxName.replace(_CCTX_CMP_NAME_PREFIX, _CCTX_EMPTY)}`),
            [updateFunction]
        ));
    } catch (e) {

    }
}

/**
 * Replaces an AST identifier or expression with a member expression accessing a state property.
 *
 * This function transforms the AST at the given `path` so that it accesses a property
 * of the specified state object. It converts the `ctxName` to lowercase for the object
 * and uses the original node name as the property key.
 *
 * @param {NodePath} path - The Babel AST node path to replace. Typically an identifier or assignment expression.
 * @param {object} t - The Babel types helper object (`@babel/types`) used to construct AST nodes
 *                     like member expressions and identifiers.
 * @param {string} ctxName - The context or state object name. The first character will be converted to lowercase
 *                           to match the common React state naming convention.
 *
 * @returns {void} This function does not return a value; it directly replaces the AST node at `path`.
 *
 * @important
 * - Converts `ctxName` to lowercase for the object reference: `"User"` → `"user.propertyName"`.
 * - Uses `t.memberExpression` with `computed: true` to allow dynamic property access.
 * - Mutates the AST in place; no new variables are declared.
 * - Any errors during AST replacement are silently caught; logging is recommended for debugging.
 */
export function replaceWithState (path, t, ctxName) {
    try {
        path.replaceWith(t.memberExpression(t.identifier(ctxName[0].toLowerCase() + ctxName.slice(1)), t.stringLiteral(path.node.name), true));
    } catch (e) {

    }
}

/**
 * Replaces an AST node with a call expression to a context-based setState function.
 *
 * This function transforms the AST at the given `path` so that it calls the context's
 * state setter function (e.g., `setStateName`) on a context object (e.g., `_CCTX_User`)
 * with a provided updater function.
 *
 * @param {NodePath} path - The Babel AST node path to replace. Typically an assignment or expression.
 * @param {object} t - The Babel types helper object (`@babel/types`) used to construct AST nodes
 *                     like call expressions, identifiers, and member expressions.
 * @param {string} ctxName - The context or state name. Used to construct both the context object
 *                           (`_CCTX_${ctxName}`) and the setter function name (`set${ctxName}`),
 *                           with `_CCTX_CMP_NAME_PREFIX` removed if present.
 * @param {Node} updateFunction - The Babel AST node representing the updater function
 *                                (e.g., an arrow function created via `buildSpreadObject`).
 *
 * @returns {void} This function does not return a value; it directly replaces the AST node at `path`.
 *
 * @important
 * - `_CCTX_`, `_CCTX_CMP_NAME_PREFIX`, and `_CCTX_EMPTY` are assumed to be predefined constants controlling
 *   context object naming and setter name formatting.
 * - Constructs the call as: `_CCTX_${ctxName}.set${ctxName}`(updateFunction).
 * - Mutates the AST in place; no new variable declarations are created.
 * - Errors during AST replacement are silently caught; logging is recommended for debugging.
 */
export function replaceWithContextSetState (path, t, ctxName, updateFunction) {
    try {
        const finalCallExpression = t.callExpression(
            t.memberExpression(
                t.identifier(`${_CCTX_}${ctxName}`),
                t.identifier(`set${ctxName.replace(_CCTX_CMP_NAME_PREFIX, _CCTX_EMPTY)}`)
            ),
            [updateFunction]
        );
        path.replaceWith(finalCallExpression);
    } catch (e) {

    }
}

/**
 * Replaces an AST node with a member expression accessing a property on a context state object.
 *
 * This function transforms the AST at the given `path` so that it accesses a property of
 * a context state object (e.g., `_CCTX_User.user`) using the original node name as the property key.
 *
 * @param {NodePath} path - The Babel AST node path to replace. Typically an identifier or assignment expression.
 * @param {object} t - The Babel types helper object (`@babel/types`) used to construct AST nodes
 *                     like member expressions and identifiers.
 * @param {string} ctxName - The context name. Used to construct the context object identifier (`_CCTX_${ctxName}`)
 *                           and the lowercase state property (`${ctxName[0].toLowerCase()}${ctxName.slice(1)}`).
 *
 * @returns {void} This function does not return a value; it directly replaces the AST node at `path`.
 *
 * @important
 * - Constructs the final access as: `_CCTX_${ctxName}.${ctxNameLowerCase}[propertyName]`.
 * - Uses `t.memberExpression` with `computed: true` to allow dynamic property access.
 * - Mutates the AST in place; no new variable declarations are created.
 * - `_CCTX_` is assumed to be a predefined constant for context object prefixing.
 * - Any errors during AST replacement are silently caught; logging is recommended for debugging.
 */
export function replaceWithContextState (path, t, ctxName) {
    try {
        const stateMember = t.memberExpression(
            t.identifier(`${_CCTX_}${ctxName}`),
            t.identifier(`${ctxName[0].toLowerCase()}${ctxName.slice(1)}`)
        );
        const finalMemberExpression = t.memberExpression(
            stateMember,
            t.stringLiteral(path.node.name),
            true
        );
        path.replaceWith(finalMemberExpression);
    } catch (e) {

    }
}

/**
 * Inserts a React `useContext` hook declaration for a specified context into a component's AST body.
 *
 * This function finds the nearest enclosing React component, checks whether a context
 * instance already exists, and if not, inserts a new `const ctxName = useContext(Context)` declaration
 * at an appropriate position in the component's body.
 *
 * @param {NodePath} path - The Babel AST node path from which to start searching for the enclosing component.
 * @param {object} state - The current transformation state, used for resolving React identifiers.
 * @param {object} t - The Babel types helper object (`@babel/types`) for constructing AST nodes
 *                     such as variable declarations, call expressions, identifiers, and member expressions.
 * @param {string} ctxName - The name of the context. Used to construct the context variable and access the
 *                           global context object (e.g., `_CCTX_${ctxName}`).
 *
 * @returns {void} This function does not return a value; it mutates the AST by inserting a context declaration.
 *
 * @important
 * - `_CCTX_`, `_CCTX_CONST`, `_CCTX_USE_CONTEXT`, and `_CCTX_UNDUS_CORE_GBL_CONTEXT` are assumed to be predefined
 *   constants controlling naming and React hook usage.
 * - The inserted declaration follows the pattern:
 *   ```js
 *   const _CCTX_${ctxName} = React.useContext(_CCTX_UNDUS_CORE_GBL_CONTEXT[ctxName]);
 *   ```
 * - Uses `getInheritantComponent` to find the enclosing component and `isContextInstanceDeclare`
 *   to avoid duplicate declarations.
 * - The declaration is inserted at an index determined by `getInsertionIndex` to maintain proper AST ordering.
 * - Silently catches errors; consider logging for debugging purposes.
 * - Does not return a value; directly mutates the component body in the AST.
 */
export function buildUseContextInstance (path, state, t, ctxName) {
    try {
        const inheritantCMP = getInheritantComponent(path);
        if (!inheritantCMP) return;
        const bodyPath = inheritantCMP.get(_CCTX_BODY);
        if (!bodyPath.isBlockStatement()) return;
        const ctxVarName = `${_CCTX_}${ctxName}`;
        if (isContextInstanceDeclare(bodyPath, t, ctxVarName)) return;
        const ctxId = t.identifier(ctxVarName);
        const reactName = resolveReact(path, t, state);
        const ctxDecl = t.variableDeclaration(_CCTX_CONST, [
            t.variableDeclarator(
                ctxId,
                t.callExpression(
                    t.sequenceExpression([
                        t.numericLiteral(0),
                        t.memberExpression(
                            reactName,
                            t.identifier(_CCTX_USE_CONTEXT)
                        )
                    ]),
                    [
                        t.memberExpression(
                            t.identifier(_CCTX_UNDUS_CORE_GBL_CONTEXT),
                            t.identifier(`${ctxName}`)
                        )
                    ]
                )
            )
        ]);
        const insertIndex = getInsertionIndex(bodyPath.node.body, t);
        bodyPath.node.body.splice(insertIndex, 0, ctxDecl);
    } catch (e) {

    }
}

/**
 * Finds the topmost React component function in the AST from a given path.
 *
 * This function climbs the function parent hierarchy starting from the provided `path`,
 * identifying the first function whose name starts with an uppercase letter (conventionally
 * a React component). It returns both the component's AST path and its name.
 *
 * @param {NodePath} path - The Babel AST node path from which to start searching upwards.
 *
 * @returns {{currentFuncParent: NodePath|null, componentName: string|null}} An object containing:
 *   - `currentFuncParent`: The AST node path of the root parent component function, or `null` if none found.
 *   - `componentName`: The name of the root component, or `null` if no component is found.
 *
 * @important
 * - Detects component functions using:
 *   1. Named function declarations: `function MyComponent() {}`.
 *   2. Arrow or function expressions assigned to a variable: `const MyComponent = () => {}`.
 * - Uses the convention that React component names start with an uppercase letter.
 * - Traverses function parents using `getFunctionParent()`.
 * - Does **not** mutate the AST.
 * - Errors during traversal are silently caught; consider logging for debugging.
 */
export function getRootParentComponent (path) {
    try {
        let currentFuncParent = path.getFunctionParent();
        let componentName = null;

        while (currentFuncParent) {
            let name = null;

            // Extract name from Function Declaration
            if (currentFuncParent.node.id) {
                name = currentFuncParent.node.id.name;
            }
            // Extract name from Arrow Function Variable Assignment
            else if (currentFuncParent.parentPath.isVariableDeclarator()) {
                name = currentFuncParent.parentPath.node.id.name;
            }

            // Check if it's a Component (starts with Uppercase)
            if (name && /^[A-Z]/.test(name)) {
                componentName = name;
                break; // Stop climbing! We found the Component.
            }

            // If not a component, keep climbing to the next function parent
            currentFuncParent = currentFuncParent.getFunctionParent();
        }
        return { currentFuncParent, componentName }
    } catch (e) {

    }
}
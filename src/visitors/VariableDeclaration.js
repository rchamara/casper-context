/**
 * @fileoverview Variable Registration & Classification Logic.
 * This module is responsible for the initial discovery phase of the transformation.
 * It identifies custom context variables during their declaration, classifies their 
 * initial values, and registers them within the global tracking registry.
 */

/**
 * AST Literal & Expression Constants
 * @description These constants are used to evaluate the 'init' value of a variable.
 * Your library uses these to distinguish between simple state and complex logic.
 */
import {
    NUMERIC_LITERAL,  // e.g., 42
    STRING_LITERAL,   // e.g., "hello"
    BOOLEAN_LITERAL,  // e.g., true
    ARRAY_EXPRESSION, // e.g., [1, 2, 3]
    OBJECT_EXPRESSION,// e.g., { key: 'value' }
    _CCTX_EMPTY       // Default fallback for uninitialized variables
} from '../utils/constants';

/**
 * Registration & Lifecycle Utilities
 * @description
 * - isExcludeFile: Prevents tracking variables in ignored files or directories.
 * - registerVariable: The core method that saves variable metadata to the virtualRegistry.
 * - getFilePathHASH: Ensures variables are scoped to a unique file ID to prevent collisions.
 */
import { isExcludeFile, registerVariable, getFilePathHASH } from '../utils/utilityHelpers';

/**
 * Scope & Inheritance Helpers
 * @description
 * - getInheritantDecComponent: Traverses upward from a variable declaration to find 
 * the parent component name, ensuring the variable is correctly scoped to its owner.
 */
import { getInheritantDecComponent } from '../utils/astHelpers';

/**
 * @important
 * **Classification Note:** When a variable is registered, its "Literal Type" determines 
 * how the subsequent `useState` hook is initialized. Non-literal initializers 
 * may require different handling during the `functionDeclarationExit` phase.
 */

/**
 * Extracts the initial value of a variable from a Babel AST `VariableDeclarator` node.
 *
 * This function inspects the `init` property of a variable declaration and
 * attempts to determine its literal value. It handles primitive literals,
 * arrays, and objects with literal values. Non-literal or complex expressions
 * are flagged as `NON_LITERAL`.
 *
 * @param {NodePath} path - Babel AST path for a `VariableDeclarator` node.
 *
 * @returns {any} The initial value of the variable:
 * - `number` for numeric literals
 * - `string` for string literals
 * - `boolean` for boolean literals
 * - `Array` of literal values for array expressions
 * - `Object` of literal key-value pairs for object expressions
 * - `NON_LITERAL` for other expressions or complex initializers
 * - `undefined` if the variable has no initializer
 *
 * @important
 * - Only inspects direct literal values. Nested expressions inside arrays or objects
 *   that are not literals will be ignored or marked as `null`.
 * - Errors during traversal or invalid AST nodes will return the current `initValue`.
 *
 * @example
 * ```js
 * // For "const a = 5;" → returns 5
 * // For "const b = [1, 2];" → returns [1, 2]
 * // For "const c = { x: 1, y: 'a' };" → returns { x: 1, y: 'a' }
 * ```
 */
function getVariableInitValue (path) {
    let initValue = undefined;
    try {
        if (path.node.init) {
            const valNode = path.node.init;
            if (valNode.type === NUMERIC_LITERAL ||
                valNode.type === STRING_LITERAL ||
                valNode.type === BOOLEAN_LITERAL) {
                initValue = valNode.value;
            }
            else if (valNode.type === ARRAY_EXPRESSION) {
                initValue =
                    valNode.elements.map(e => e.value ?? null);
            }
            else if (valNode.type === OBJECT_EXPRESSION) {
                const obj = {};
                for (const prop of valNode.properties) {
                    if (prop.key && prop.value && prop.value.value !== undefined) {
                        obj[prop.key.name || prop.key.value] = prop.value.value;
                    }
                }
                initValue = obj;
            }
            else {
                initValue = NON_LITERAL;
            }
        }
        return initValue;
    } catch (e) {
        return initValue;
    }
}

/**
 * Visitor for `VariableDeclarator` nodes to register state variables in the virtual registry.
 *
 * This function checks if a variable's name matches the plugin's configured prefix.
 * If so, it extracts the initial value, identifies the enclosing component, and
 * registers the variable in the `virtualRegistry`. It also ensures React and global
 * context imports are flagged if needed.
 *
 * @param {NodePath} path - Babel AST path for a `VariableDeclarator` node.
 * @param {Object} state - Plugin state, including filename, import metadata, and configuration flags.
 * @param {Object} t - Babel types helper (`@babel/types`) used to inspect or create AST nodes.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and their registered variables.
 *
 * @returns {void}
 * - Registers the variable in the `virtualRegistry` under the component hash.
 * - Sets `state.needsGblContext` if the variable belongs to a global context.
 * - Flags `state.needUseStateImport` if `useState` is not yet imported.
 *
 * @important
 * - Only processes variables whose names start with the configured prefix.
 * - Uses `getVariableInitValue` to determine the variable's initial value.
 * - Errors are silently caught; no action is taken if an exception occurs.
 *
 * @example
 * ```js
 * variableDeclarationVisitor(path, state, t, virtualRegistry);
 * // Registers a prefixed variable in the virtual registry with its initial value
 * ```
 */
export default function variableDeclarationVisitor (path, state, t, virtualRegistry) {
    try {
        const fileName = state.filename || _CCTX_EMPTY;
        if (!isExcludeFile(fileName, this.opts)) return;
        if (path.node.id.name?.startsWith(state.casperConfig.prefix)) {
            const inheritantCMP = getInheritantDecComponent(path);
            if (!inheritantCMP) return;
            const filePathHash = getFilePathHASH(fileName);
            let _init_value = getVariableInitValue(path);
            state.needsGblContext = true;
            if (
                !state.importState.reactId &&
                !state.importState.useStateId
            ) {
                state.needUseStateImport = true
            }
            registerVariable(`${inheritantCMP}_${filePathHash}`, path.node.id.name, _init_value, virtualRegistry);
        }
    } catch (e) {
       
    }
}

/**
 * Visitor for `VariableDeclarator` nodes inside a function's body to collect state variables.
 *
 * This function inspects variable declarations within a component function and collects
 * those whose names start with the plugin's configured prefix. Collected variables are
 * added to `localStateVars` for later use in context or state initialization.
 * The original declaration line is removed from the AST to prevent duplication.
 *
 * @param {NodePath} path - Babel AST path for a `VariableDeclarator` node.
 * @param {Object} state - Plugin state, containing the configuration and flags.
 * @param {Object} t - Babel types helper (`@babel/types`) used to inspect and manipulate AST nodes.
 * @param {Array<Object>} localStateVars - Array to collect state variables with `{ name, init }`.
 *
 * @returns {void}
 * - Pushes matched variables into `localStateVars`.
 * - Removes the original variable declaration or the specific declarator from the AST.
 *
 * @important
 * - Only processes identifiers whose names match the configured prefix.
 * - Safely handles declarations with multiple declarators by removing only the matched one.
 * - Errors are silently caught; no action occurs if an exception is thrown.
 *
 * @example
 * ```js
 * const localStateVars = [];
 * functionReturnVariableDelarationVisitor(path, state, t, localStateVars);
 * // localStateVars now contains the prefixed variables from the function
 * ```
 */
export function functionReturnVariableDelarationVisitor (path, state, t, localStateVars) {
    try {
        const id = path.node.id;
        const init = path.node.init;
        if (!t.isIdentifier(id)) return;
        if (id.name.startsWith(state.casperConfig.prefix)) {
            localStateVars.push({ name: id.name, init });
            // remove declaration line
            if (t.isVariableDeclaration(path.parent)) {
                if (path.parent.declarations.length === 1) {
                    path.parentPath.remove();
                } else {
                    path.remove();
                }
            }
        }
    } catch (e) {
       
    }
}
/**
 * @fileoverview Variable Reference & Usage Orchestration.
 * This module manages the detection and transformation of custom context variables 
 * when they are referenced in expressions. It handles the replacement of `_$_` 
 * identifiers with either local state accessors or injected Context hooks.
 */

/**
 * AST Node & Property Constants
 * @description Identifiers for specific nodes and keys used to navigate the AST 
 * during variable resolution and replacement.
 */
import {
    VARIABLE_DECLARATOR, // Target for initial variable definitions
    _CCTX_ID,            // Key for the identifier in a declaration
    ASSIGNMENT_EXPRESSION, // Target for variable updates
    _CCTX_LEFT,          // The 'write' side of an assignment
    UPDATE_EXPRESSION,   // Target for increments/decrements (e.g., ++, --)
    _CCTX_ARGUMENT,      // The variable inside an update expression
    _CCTX_KEY,           // Property key in object patterns
    _CCTX_UNKNOW,        // Fallback for unresolved identifiers
    _CCTX_EMPTY          // Default string initializer
} from '../utils/constants';

/**
 * Validation & Discovery Utilities
 * @description 
 * - isExcludeFile: Ensures the transformation doesn't run on ignored directories.
 * - findContextByVar: Locates the specific Context instance associated with a variable name.
 */
import { isExcludeFile, findContextByVar } from '../utils/utilityHelpers';

/**
 * AST Transformation & Scope Helpers
 * @description Functions that physically modify the code and resolve component hierarchy.
 * - replaceWithContextState: Replaces a reference with a Context-based accessor.
 * - replaceWithState: Replaces a reference with a local `useState` accessor.
 * - buildUseContextInstance: Injects the `useContext` hook if the variable is defined elsewhere.
 * - getRootParentComponent: Finds the top-level React Component to ensure hooks are valid.
 */
import { replaceWithContextState, replaceWithState, buildUseContextInstance, getRootParentComponent } from '../utils/astHelpers';

/**
 * @important
 * This module is highly sensitive to Scope. It must distinguish between a variable 
 * being "written to" (Assignment) and "read from" (Reference) to prevent 
 * infinite loops in the Babel transformation.
 */

/**
 * Babel visitor for handling identifier nodes in the AST.
 *
 * This visitor inspects identifiers that start with the configured Casper prefix.
 * It determines whether the identifier corresponds to a registered component or
 * context variable and replaces it with the appropriate state or context access
 * expression. This handles both component-local state and global/shared context usage.
 *
 * @param {NodePath} path - The Babel AST path representing the current identifier node.
 * @param {Object} state - Plugin state, including file info, configuration, and import metadata.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 * @param {Set<Node>} seen - A Set tracking identifiers that have already been processed to avoid duplicates.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and their
 *   registered variables/context info.
 *
 * @returns {void}
 * Modifies AST nodes in place by replacing identifiers with either direct state access
 * or context-based access. Does not return a value.
 *
 * @important
 * - Skips identifiers that are part of declarations, assignments, object keys, or JSX expressions.
 * - Only processes referenced identifiers matching the configured Casper prefix.
 * - Sets `state.needsGblContext` when global context usage is required.
 * - Automatically injects `useState` import if missing.
 * - Differentiates between same-component state and context usage across components.
 * - Errors are silently caught.
 *
 * @example
 * ```js
 * import identifierVisitor from './identifierVisitor';
 *
 * identifierVisitor(path, state, t, seen, virtualRegistry);
 * // Replaces matching identifiers with state or context references
 * ```
 */
export default function identifierVisitor (path, state, t, seen, virtualRegistry) {
    try {
        const fileName = state.filename || _CCTX_EMPTY;
        if (!isExcludeFile(fileName, this.opts)) return;
        if (path.node?.name?.startsWith(state.casperConfig.prefix)) {
            if (
                (path.parent.type === VARIABLE_DECLARATOR && path.parentKey === _CCTX_ID) ||
                (path.parent.type === ASSIGNMENT_EXPRESSION && path.parentKey === _CCTX_LEFT) ||
                (path.parent.type === UPDATE_EXPRESSION && path.parentKey === _CCTX_ARGUMENT)
            ) return;
            if (
                path.parentPath.isObjectProperty() &&
                path.parentKey === _CCTX_KEY &&
                !path.parent.computed
            ) return;
            if (path.findParent(p =>
                p.isJSXExpressionContainer() ||
                p.isJSXAttribute() ||
                p.isJSXOpeningElement() ||
                p.isJSXClosingElement() ||
                p.isJSXMemberExpression()
            )) return;
            if (!path.isReferencedIdentifier()) return;
            if (!seen.has(path.node)) {
                seen.add(path.node);
                state.needsGblContext = true;
                let {currentFuncParent,componentName} = getRootParentComponent(path);
                const ctxName = findContextByVar(path.node.name, virtualRegistry);
                if (!ctxName) return;
                let isSameCMP = false;
                if (ctxName.startsWith(componentName)) {
                    isSameCMP = true;
                }
                state.needsGblContext = true;
                if (
                    !state.importState.reactId &&
                    !state.importState.useStateId
                ) {
                    state.needUseStateImport = true
                }
                if (isSameCMP) {
                    replaceWithState(path, t, ctxName);
                } else {
                    buildUseContextInstance(currentFuncParent, state, t, ctxName);
                    replaceWithContextState(path, t, ctxName);
                }
            }
        }
    } catch (e) {

    }
}
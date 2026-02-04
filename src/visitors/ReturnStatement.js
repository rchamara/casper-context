/**
 * @fileoverview Application Root & Provider Orchestration.
 * This module manages the final wrapping phase of the AST transformation. 
 * It ensures that the transformed component tree is encapsulated within 
 * the custom Casper Context Provider, enabling global state distribution.
 */

/**
 * Core Logic Constants
 * @description
 * - _CCTX_CMP_NAME_PREFIX: The prefix used to identify and generate unique 
 * Context Provider instances (e.g., '_$_ctx_').
 * - _CCTX_EMPTY: A safe fallback initializer for string-based AST properties.
 */
import { _CCTX_CMP_NAME_PREFIX, _CCTX_EMPTY } from '../utils/constants';

/**
 * AST Transformation Helpers
 * @description
 * - buildCtxProvider: A structural helper that wraps a JSX element or 
 * Function body with a `<Context.Provider>` component, mapping internal 
 * state to the Provider's `value` prop.
 */
import { buildCtxProvider } from '../utils/astHelpers';

/**
 * @important
 * The `buildCtxProvider` function is typically invoked during the `Program.exit` 
 * or `ExportDefaultDeclaration` phase to ensure all nested transformations 
 * are complete before the final Provider wrapping occurs.
 */

/**
 * Visitor for `ReturnStatement` nodes inside a function declaration.
 *
 * This function inspects the return statement of a component function
 * and wraps its returned JSX or value with the corresponding context provider.
 * It ensures that the component correctly provides state and context to its children.
 *
 * @param {NodePath} path - The Babel AST path representing the `ReturnStatement` node.
 * @param {Object} state - Plugin state, including import information and configuration.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 * @param {Object} entry - Registry entry for the component, containing `ctxName` and variable names.
 *
 * @returns {void}
 * Modifies the return statement node in place, replacing it with a `React.createElement`
 * call that wraps the original return value with a context provider.
 *
 * @important
 * - Only processes return statements that have a non-null argument.
 * - Uses `buildCtxProvider` to generate the provider wrapper.
 * - Errors are silently caught; no changes occur if an exception is thrown.
 *
 * @example
 * ```js
 * functionDeclarationReturnStatementVisitor(path, state, t, entry);
 * // Wraps the return value of a component function with its context provider
 * ```
 */
export function functionDeclarationReturnStatementVisitor (path, state, t, entry) {
    try {
        const returnNode = path.node.argument;
        if (!returnNode) return;
        const stateName = entry.ctxName.replace(_CCTX_CMP_NAME_PREFIX, _CCTX_EMPTY);
        buildCtxProvider(path, t, returnNode, state, stateName);
    } catch (e) {
        
    }   
}
/**
 * @fileoverview Logic Orchestration for Function Transformation.
 * This module coordinates the 'Exit' phase of function traversal. It integrates 
 * specialized visitors for variable declarations and return statements to 
 * aggregate state metadata before injecting final React Hook declarations.
 */

/**
 * Validation & Hashing Utilities
 * @description
 * - isExcludeFile: Determines if the current file should be bypassed based on plugin configuration.
 * - getFilePathHASH: Generates a unique identifier based on the file path to prevent naming collisions.
 */
import { isExcludeFile, getFilePathHASH } from '../utils/utilityHelpers';

/**
 * Specialized Sub-Visitors
 * @description These visitors are manually invoked during the function's traversal 
 * to target specific node types within the component body.
 * - functionReturnVariableDelarationVisitor: Extracts state-relevant variable data.
 * - functionDeclarationReturnStatementVisitor: Processes JSX or return values for context binding.
 */
import { functionReturnVariableDelarationVisitor } from './VariableDeclaration';
import { functionDeclarationReturnStatementVisitor } from './ReturnStatement';

/**
 * AST Construction Helpers
 * @description
 * - buildCtxUseStateDeclaration: Physically constructs and injects the `useState` 
 * node into the Abstract Syntax Tree.
 */
import { buildCtxUseStateDeclaration } from '../utils/astHelpers';

/**
 * Core Constants
 * @description
 * - _CCTX_EMPTY: Provides a safe string fallback for file naming and path resolution.
 */
import { _CCTX_EMPTY } from '../utils/constants';

/**
 * @important
 * The coordination between these imports ensures that state is only injected 
 * once per component, and only if the component contains variables prefixed 
 * with the library's global identifier.
 */

/**
 * Babel visitor exit handler for `FunctionDeclaration` nodes.
 *
 * This function is invoked when exiting a function declaration during AST traversal.
 * It inspects the function for any state variables registered in the `virtualRegistry`
 * and transforms them into React `useState` declarations or context state as needed.
 *
 * @param {NodePath} path - The Babel AST path representing the current function declaration.
 * @param {Object} state - Plugin state, including file info, config, and import metadata.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and their
 *   registered variables/context info. Each key is `${componentName}_${fileHash}`.
 *
 * @returns {void}
 * Modifies AST nodes in place to inject state declarations and context usage;
 * does not return a value.
 *
 * @important
 * - Skips files excluded by `isExcludeFile`.
 * - Only processes functions with a valid name.
 * - Collects local state variable declarations and return statements using
 *   `functionReturnVariableDelarationVisitor` and `functionDeclarationReturnStatementVisitor`.
 * - Converts collected variables into an object expression for `buildCtxUseStateDeclaration`.
 * - Silent error handling; errors are caught but ignored.
 *
 * @example
 * ```js
 * // During Babel traversal:
 * functionDeclarationExit(path, state, t, virtualRegistry);
 * // Injects useState or context declarations for local state variables in the function
 * ```
 */
export function functionDeclarationExit (path, state, t, virtualRegistry) {
    try {
        const fileName = state.filename || _CCTX_EMPTY;
        if (!isExcludeFile(fileName, this.opts)) return;
        const name = path.node.id?.name;
        if (!name) return;
        const filePathHASH = getFilePathHASH(fileName);
        const key = `${name}_${filePathHASH}`;
        const entry = virtualRegistry[key];
        if (!entry || !entry.varNames.length) return;
        const localStateVars = [];
        path.traverse({
            VariableDeclarator(varPath) {
                functionReturnVariableDelarationVisitor.call(this, varPath, state, t, localStateVars);
            },
            ReturnStatement(retPath) {
                functionDeclarationReturnStatementVisitor.call(this, retPath, state, t, entry);
            },
        })
        if (localStateVars.length === 0) return;
        const objProps = localStateVars.map(v =>
            t.objectProperty(t.identifier(v.name), v.init || t.nullLiteral())
        );
        buildCtxUseStateDeclaration(path, t, state, objProps, key);

    } catch (e) {
       
    }
}
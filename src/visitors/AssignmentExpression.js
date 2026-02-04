/**
 * @fileoverview Transformation Logic & Node Orchestration.
 * This module integrates AST helpers with utility validators to perform 
 * the actual replacement of custom global variables (`_$_`) with 
 * React-compatible State and Context setters.
 */

/**
 * Core Constants
 * @description
 * - IDENTIFIER: Used to validate if the left-hand side of an assignment is a variable.
 * - _CCTX_EMPTY: Fallback value for filenames or uninitialized state strings.
 */
import { IDENTIFIER, _CCTX_EMPTY } from '../utils/constants';

/**
 * Utility & Validation Helpers
 * @description
 * - findContextByVar: Maps a `_$_` variable to its corresponding Context instance name.
 * - isExcludeFile: Security/Performance gate to prevent processing ignored files.
 */
import { findContextByVar, isExcludeFile } from '../utils/utilityHelpers';

/**
 * AST Transformation Utilities
 * @description The functional "engine" of the plugin that manipulates the Babel tree.
 * - buildSpreadObject: Creates the updated state object for setters.
 * - replaceWithSetState: Handles local component state updates.
 * - buildUseContextInstance: Injects `useContext` hooks when variables are cross-component.
 * - replaceWithContextSetState: Handles global/context-based state updates.
 * - getComponentName: Identifies the immediate parent function.
 * - getRootParentComponent: Recursively climbs the tree to find the top-level React Component.
 */
import { buildSpreadObject, replaceWithSetState, buildUseContextInstance, replaceWithContextSetState, getComponentName, getRootParentComponent } from '../utils/astHelpers';

/**
 * Babel visitor function for handling assignment expressions in the AST.
 *
 * This visitor inspects assignments in the code and replaces or augments them
 * with state/context updates for variables registered in the `virtualRegistry`.
 * It handles both direct component state updates and global/shared context updates.
 *
 * @param {NodePath} path - The Babel AST path representing the current node.
 * @param {Object} state - Plugin state, including file info, config, and import metadata.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and their
 *   registered variables/context info.
 *
 * @returns {void}
 * Updates AST nodes in place and sets plugin state flags; no return value.
 *
 * @important
 * - Only handles assignments where the left-hand identifier starts with the configured prefix.
 * - Supports both direct component `useState` updates and context-based updates.
 * - Automatically marks that a global context is needed (`state.needsGblContext = true`).
 * - Injects `useState` import if missing.
 * - Silent error handling; consider logging `e` for debugging.
 */
export default function assignmentExpressionVisitor (path, state, t, virtualRegistry) {
    try {
        const fileName = state.filename || _CCTX_EMPTY;
        if (!isExcludeFile(fileName, this.opts)) return;
        if (path.node.left.type === IDENTIFIER) {
            if (path.node.left.name?.startsWith(state.casperConfig.prefix)) {
                state.needsGblContext = true;
                const ctxName = findContextByVar(path.node.left.name, virtualRegistry);
                if (!ctxName) return;
                let {currentFuncParent,componentName} = getRootParentComponent(path);
                inheritantCMP = componentName
                if (!inheritantCMP) return;
                let isSameCMP = false;
                if (ctxName.startsWith(inheritantCMP)) {
                    isSameCMP = true;
                }
                state.needsGblContext = true;
                if (
                    !state.importState.reactId &&
                    !state.importState.useStateId
                ) {
                    state.needUseStateImport = true
                }
                const updateFunction = buildSpreadObject(path, t);
                if (isSameCMP) {
                    replaceWithSetState(path, t, ctxName, updateFunction);
                } else {
                    buildUseContextInstance(currentFuncParent, state, t, ctxName);
                    replaceWithContextSetState(path, t, ctxName, updateFunction);
                }

            }
        }
    } catch (e) {

    }
}
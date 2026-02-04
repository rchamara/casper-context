/**
 * @fileoverview Library Initialization & Dependency Injection Orchestrator.
 * This module manages the "Prep Phase" of the transformation, ensuring that
 * required React hooks and internal global context bridges are correctly 
 * imported or required before any code modifications occur.
 */

/**
 * Dependency & Alias Constants
 * @description Identifiers for React and internal library references used to 
 * avoid naming collisions with user-defined variables.
 */
import {
    _CCTX_REACT,                       // Internal alias for the React object
    _CCTX_EMPTY,                       // Safe string fallback for paths/names
    _CCTX_UNDUS_CORE_REACT,            // Normalized identifier for the React import
    _CCTX_UNDUS_CORE_GBL_CONTEXT,      // Identifier for the auto-generated global context
    REACT_IMPORT_CORE_NAME,            // Literal 'react' package name
    REACT_IMPORT_USE_STATE_HOOKS_NAME  // Literal 'useState' hook name
} from '../utils/constants';

/**
 * File System & Lifecycle Utilities
 * @description 
 * - CONTEXT_FILE_PATH: The absolute path to the generated context bridge.
 * - resetVarsForFile: Cleanup utility to clear tracking caches between file traversals.
 * - isExcludeFile: Security gate to prevent transformation of ignored files.
 * - getFilePathHASH: Generates a unique, stable ID for the current file's state bucket.
 */
import { CONTEXT_FILE_PATH, resetVarsForFile, isExcludeFile, getFilePathHASH } from '../utils/utilityHelpers';

/**
 * AST Injection Helpers
 * @description
 * - buildRequireDeclaration: Injects CommonJS `require` statements at the top of the file.
 */
import { buildRequireDeclaration } from '../utils/astHelpers';

/**
 * @important
 * This module is responsible for "Stateful Reset." Every time a new file is 
 * entered, `resetVarsForFile` must be called to ensure that context variables 
 * from the previous file do not leak into the current transformation scope.
 */

/**
 * Resolves and collects React import information from a file's AST.
 *
 * This function inspects all import declarations in the given file's AST
 * and identifies the React import. It tracks whether React was imported as
 * a default import, named import, or namespace import, and whether `useState`
 * is explicitly imported.
 *
 * @param {NodePath} path - The Babel AST path representing the file/program node.
 * @param {Object} state - Plugin state object where resolved import information
 *   will be stored under `state.importState`.
 * @param {Object} t - Babel types helper (`@babel/types`) used for AST type checks.
 *
 * @returns {void}
 * Updates `state.importState` with the following structure:
 * ```js
 * {
 *   reactId: Identifier | null,        // Local identifier for React import
 *   useStateId: Identifier | null,     // Local identifier for useState import
 *   isDefault: boolean,                // True if React is default-imported
 *   isNamed: boolean,                  // True if useState is explicitly named-imported
 *   isNamespace: boolean,              // True if React is namespace-imported
 *   reactImportPath: ImportDeclaration | null, // AST node of React import
 * }
 * ```
 *
 * @important
 * - Only resolves imports where `source.value` equals `REACT_IMPORT_CORE_NAME`.
 * - Handles three import forms:
 *   - `import React from 'react'`
 *   - `import { useState } from 'react'`
 *   - `import * as ReactNS from 'react'`
 * - Errors are silently caught; unresolved imports will leave `state.importState` with nulls.
 *
 * @example
 * ```js
 * importStateResolver(path, state, t);
 * console.log(state.importState.reactId); // Identifier for React import
 * console.log(state.importState.useStateId); // Identifier for useState if imported
 * ```
 */
function importStateResolver (path, state, t) {
    try {
        const importState = {
            reactId: null,
            useStateId: null,
            isDefault: false,
            isNamed: false,
            isNamespace: false,
            reactImportPath: null,
        };
        path.node.body.forEach(node => {
            if (!t.isImportDeclaration(node)) return;
            if (node.source.value !== REACT_IMPORT_CORE_NAME) return;
            importState.reactImportPath = node;
            node.specifiers.forEach(spec => {

                // import React from 'react'
                if (t.isImportDefaultSpecifier(spec)) {
                    importState.reactId = spec.local;
                    importState.isDefault = true;
                }

                // import { useState } from 'react'
                if (t.isImportSpecifier(spec)) {
                    if (spec.imported.name === REACT_IMPORT_USE_STATE_HOOKS_NAME) {
                        importState.useStateId = spec.local;
                        importState.isNamed = true;
                    }
                }

                // import * as ReactNS from 'react'
                if (t.isImportNamespaceSpecifier(spec)) {
                    importState.reactId = spec.local;
                    importState.isNamespace = true;
                }
            });
        });
        state.importState = importState;
    } catch (e) {
      
    }
}

/**
 * Resets the variable registry for the current file during AST traversal.
 *
 * This function clears any registered state variables in the `virtualRegistry`
 * that are associated with the current file. It is useful for ensuring that
 * state tracking does not leak across files when processing multiple files
 * in the plugin.
 *
 * @param {Object} state - Plugin state, including the filename and plugin options.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and
 *   their registered variables/context info.
 *
 * @returns {void}
 * Updates the `virtualRegistry` in place, resetting all variable names and
 * default values associated with the current file.
 *
 * @important
 * - Skips files excluded by `isExcludeFile`.
 * - Uses a hash of the filename to identify the relevant registry entries.
 * - Errors are silently caught.
 *
 * @example
 * ```js
 * resetRegisteryProcess(state, virtualRegistry);
 * // Clears all state variables for the current file in the virtualRegistry
 * ```
 */
function resetRegisteryProcess (state, virtualRegistry) {
    try {
        const fileName = state.filename || _CCTX_EMPTY;
        if (!isExcludeFile(fileName, this.opts)) return;
        const hash = getFilePathHASH(fileName);
        resetVarsForFile(virtualRegistry, hash);
    } catch (e) {
        
    }
}

/**
 * Babel visitor handler for the `Program` node when entering a file.
 *
 * This function initializes plugin state for the file, resolves React imports,
 * and resets the variable registry for the current file. It is typically used
 * at the beginning of processing each file to ensure a clean state.
 *
 * @param {NodePath} path - The Babel AST path representing the Program node.
 * @param {Object} state - Plugin state, including filename, import metadata, and configuration.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate or check AST nodes.
 * @param {Object<string, Object>} virtualRegistry - Registry of components and their
 *   registered variables/context info.
 * @param {Object} config - The plugin configuration for the current file.
 *
 * @returns {void}
 * - Updates `state.casperConfig` with the provided config.
 * - Populates `state.importState` with resolved React imports.
 * - Resets the variable registry for the current file in `virtualRegistry`.
 *
 * @important
 * - Must be called at the entry of each Program node to ensure correct setup.
 * - Errors are silently caught; consider logging during debugging.
 *
 * @example
 * ```js
 * programEnter(path, state, t, virtualRegistry, pluginConfig);
 * // Initializes plugin state, resolves React imports, resets file-specific registry
 * ```
 */
export function programEnter (path, state, t, virtualRegistry, config) {
    try {
        state.casperConfig = config
        importStateResolver(path, state, t);
        resetRegisteryProcess.call(this, state, virtualRegistry);
    } catch (e) {
        
    }
}

/**
 * Injects required imports for React and global context if they are missing.
 *
 * This function ensures that the necessary modules are imported at the top of
 * the file when the AST traversal detects that `useState` or global context usage
 * is needed. It adds the imports only when required, avoiding duplicate or
 * unnecessary imports.
 *
 * @param {NodePath} path - The Babel AST path where imports should be injected.
 * @param {Object} state - Plugin state, containing flags `needUseStateImport` and `needsGblContext`.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 *
 * @returns {void}
 * - Conditionally injects `React` import if `useState` is required.
 * - Conditionally injects global context import if any global context is used.
 * - Uses `buildRequireDeclaration` to insert the import statements at the top of the file.
 *
 * @important
 * - Checks `state.needUseStateImport` and `state.needsGblContext` to determine necessity.
 * - Errors are silently caught; no exception is thrown if import insertion fails.
 *
 * @example
 * ```js
 * bindMissingImport(path, state, t);
 * // Injects React and global context imports if they are missing
 * ```
 */
function bindMissingImport (path, state, t) {
    try {
        if (state?.needUseStateImport) buildRequireDeclaration(path, t, _CCTX_UNDUS_CORE_REACT, _CCTX_REACT);
        if (state?.needsGblContext) buildRequireDeclaration(path, t, _CCTX_UNDUS_CORE_GBL_CONTEXT, CONTEXT_FILE_PATH);
    } catch (e) {
       
    }
}

/**
 * Babel visitor handler for the `Program` node when exiting a file.
 *
 * This function is called after the AST traversal of the entire file is complete.
 * Its primary purpose is to inject any missing imports for React or global context
 * that were flagged as required during traversal.
 *
 * @param {NodePath} path - The Babel AST path representing the Program node.
 * @param {Object} state - Plugin state, including flags `needUseStateImport` and `needsGblContext`.
 * @param {Object} t - Babel types helper (`@babel/types`) used to generate AST nodes.
 *
 * @returns {void}
 * Modifies the AST in place by calling `bindMissingImport` to insert necessary imports.
 *
 * @important
 * - Should be paired with `programEnter` at the start of traversal.
 * - Only injects imports if flagged during traversal (`state.needUseStateImport` or `state.needsGblContext`).
 * - Errors are silently caught; AST modifications fail gracefully if errors occur.
 *
 * @example
 * ```js
 * programExit(path, state, t);
 * // Ensures React and global context imports are added if needed
 * ```
 */
export function programExit (path, state, t) {
    try {
        bindMissingImport(path, state, t);
    } catch (e) {
      
    }
}
/**
 * @fileoverview Path resolution and configuration management for Casper Context.
 * This module handles the physical location of generated context files, 
 * ESLint configurations, and the initialization of the library's runtime settings.
 */

/**
 * Core Node.js modules used throughout the Casper Babel utilities:
 * - `path` for resolving and normalizing file system paths.
 * - `fs` for reading, writing, and checking the existence of files.
 * - `crypto` for generating file-based hashes and unique identifiers.
 */
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Casper-specific constants imported from './constants':
 *
 * - Context and file naming:
 *   - `CONTEXT_FOLDER_NAME`, `CONTEXT_FILE_NAME`
 * - File and hash utilities:
 *   - `NO_FILE`, `FILE_HASH_MD5`, `UNICODE_UTF8`, `DIGEST_HEX`
 * - React & component prefixes:
 *   - `_CCTX_CMP_NAME_PREFIX`, `_CCTX_UNDUS_CORE_REACT`
 * - File/folder exclusions:
 *   - `GBL_CONTEXT_JS`, `NODE_MODULES`, `FOLDER_DIST`, `FOLDER_BUILD`
 * - ESLint & config integration:
 *   - `CASPER_ESLINT_GLOBAL_JS`, `CASPER_CONFIG_FILE`, `GLOBAL_PREFIX`
 * - Debugging utilities:
 *   - `CASPER_DEBUG_LOG_FILE_NAME`, `CASPER_STRING_TYPE`
 * - JavaScript directive:
 *   - `USE_STRICT`
 */
import {
    CONTEXT_FOLDER_NAME,
    CONTEXT_FILE_NAME,
    NO_FILE,
    USE_STRICT,
    _CCTX_CMP_NAME_PREFIX,
    FILE_HASH_MD5,
    UNICODE_UTF8,
    DIGEST_HEX,
    GBL_CONTEXT_JS,
    NODE_MODULES,
    FOLDER_DIST,
    FOLDER_BUILD,
    _CCTX_UNDUS_CORE_REACT,
    CASPER_ESLINT_GLOBAL_JS,
    CASPER_CONFIG_FILE,
    GLOBAL_PREFIX,
    CASPER_DEBUG_LOG_FILE_NAME,
    CASPER_STRING_TYPE
} from './constants';

/**
 * The absolute system path to the generated global context file.
 * @type {string}
 * @description Typically resolves to '[root]/src/scopeContext/gblContext.js'.
 */
export const CONTEXT_FILE_PATH = path.join(process.cwd(), CONTEXT_FOLDER_NAME, CONTEXT_FILE_NAME);

/**
 * The absolute system path to the auto-generated ESLint globals file.
 * @type {string}
 * @description Used to inject `_$_` variables into the ESLint environment to prevent 'undefined variable' errors.
 */
export const ESLINT_GLOBAL_JS_PATH = path.resolve(process.cwd(), CASPER_ESLINT_GLOBAL_JS);

/**
 * The absolute system path to the Casper Context configuration file (.casperctxrc.json).
 * @type {string}
 */
export const CASPER_CONFIG_PATH = path.join(process.cwd(), CASPER_CONFIG_FILE);

/**
 * Default fallback configuration for the plugin.
 * * This object is used if no `.casperctxrc.json` is found in the project root.
 * * @property {string} prefix - The character sequence identifying context variables (Default: '_$_').
 * @property {boolean} debug - Toggles verbose logging during the Babel transformation process.
 * @private
 */
const DEFAULT_CONFIG = {
    prefix: GLOBAL_PREFIX,
    debug: false
};

/**
 * Generates a short, deterministic hash based on a file’s absolute path.
 *
 * This function resolves the given file path to an absolute path and produces
 * a truncated MD5 hash. It is commonly used to create stable, filesystem-based
 * identifiers for files that remain consistent across executions.
 *
 * @param {string} fileName - The file path to hash. Can be relative or absolute.
 *
 * @returns {string} An 8-character hexadecimal hash derived from the file’s
 *                   absolute path, or `NO_FILE` if hashing fails.
 *
 * @important
 * - Uses the absolute path (`path.resolve`) to ensure consistency regardless
 *   of the current working directory.
 * - The hash is generated using MD5 and truncated to the first 8 characters
 *   for compactness (not intended for cryptographic security).
 * - `FILE_HASH_MD5`, `UNICODE_UTF8`, `DIGEST_HEX`, and `NO_FILE` are assumed
 *   to be predefined constants.
 * - Errors (invalid path, filesystem issues, crypto failures) are safely
 *   caught and result in returning `NO_FILE`.
 * - This function is deterministic: the same file path will always produce
 *   the same hash.
 */
export const getFilePathHASH = (fileName) => {
    try {
        const abs = path.resolve(fileName);
        return crypto
            .createHash(FILE_HASH_MD5)
            .update(abs, UNICODE_UTF8)
            .digest(DIGEST_HEX)
            .slice(0, 8);
    } catch (e) {
        return NO_FILE;
    }
}

/**
 * Registers a component-scoped variable in a virtual registry and returns its context name.
 *
 * This function ensures that variables belonging to the same component are grouped
 * under a single generated context name. If the variable is already registered for
 * the given component hash, the existing context name is returned without mutation.
 * Otherwise, the variable and its default value are recorded in the registry.
 *
 * @param {string} componentNameHash - A unique, deterministic hash representing a component.
 *                                    Used as the registry key to scope variables per component.
 * @param {string} varName - The name of the variable to register within the component context.
 * @param {*} defaultValue - The default value associated with the variable. Stored for
 *                           initializing context state.
 * @param {Object} virtualRegistry - A mutable in-memory registry object used to track
 *                                   component variables, context names, and defaults.
 *
 * @returns {string|undefined} The generated or existing context name associated with
 *                             the component, or `undefined` if an error occurs.
 *
 * @important
 * - The registry structure per component hash follows this shape:
 *   ```js
 *   {
 *     varNames: string[],
 *     ctxName: string | null,
 *     defaults: Record<string, any>
 *   }
 *   ```
 * - `_CCTX_CMP_NAME_PREFIX` is assumed to be a predefined constant used to namespace
 *   generated context names.
 * - Each component hash maps to exactly one context name.
 * - Variables are registered idempotently: re-registering the same variable will not
 *   duplicate entries.
 * - This function mutates `virtualRegistry` directly.
 * - Errors are silently caught; consider logging in debug or development builds.
 */
export const registerVariable = (componentNameHash, varName, defaultValue, virtualRegistry) => {
    try {
        if (!virtualRegistry[componentNameHash]) {
            virtualRegistry[componentNameHash] = {
                varNames: [],
                ctxName: null,
                defaults: {}
            };
        }

        if (virtualRegistry[componentNameHash] && virtualRegistry[componentNameHash].varNames.includes(varName)) {
            return virtualRegistry[componentNameHash].ctxName;
        }

        const ctxName = `${_CCTX_CMP_NAME_PREFIX}${componentNameHash}`;
        virtualRegistry[componentNameHash].ctxName = ctxName;
        virtualRegistry[componentNameHash].varNames = [...virtualRegistry[componentNameHash].varNames, varName]
        const newDefaults = { ...virtualRegistry[componentNameHash].defaults }
        newDefaults[varName] = defaultValue;
        virtualRegistry[componentNameHash].defaults = newDefaults;

        return ctxName;
    } catch (e) {

    }

}

/**
 * Finds the component context identifier associated with a given variable name.
 *
 * This function searches through the virtual registry and returns the component
 * hash (registry key) whose registered variable list contains the specified variable.
 * It is typically used to resolve which component context manages a given variable.
 *
 * @param {string} varName - The variable name to search for in the registry.
 * @param {Object} virtualRegistry - The in-memory registry that stores component
 *                                   context data, including variable mappings.
 *
 * @returns {string|null} The component hash (registry key) associated with the variable,
 *                        or `null` if the variable is not registered in any context.
 *
 * @important
 * - The registry is expected to follow this structure:
 *   ```js
 *   {
 *     [componentHash]: {
 *       varNames: string[],
 *       ctxName: string,
 *       defaults: Record<string, any>
 *     }
 *   }
 *   ```
 * - The function performs a linear search through registry entries.
 * - Returns the registry key (component hash), not the generated context name.
 * - Does **not** mutate the registry.
 * - Errors are silently caught; consider adding logging for debugging.
 */
export const findContextByVar = (varName, virtualRegistry) => {
    try {
        for (const [ctxName, ctxData] of Object.entries(virtualRegistry)) {
            if (ctxData.varNames && ctxData.varNames.includes(varName)) {
                return ctxName;
            }
        }
        return null;
    } catch (e) {

    }
}

/**
 * Checks whether a context instance variable is already declared within a block scope.
 *
 * This utility scans the statements inside a given BlockStatement path and determines
 * if a variable declaration with the specified name already exists. It is primarily
 * used to prevent duplicate `useContext` or context-instance declarations from being
 * injected multiple times during AST transformations.
 *
 * @param {NodePath} path - Babel NodePath pointing to a `BlockStatement`
 *                          (typically a component or function body).
 * @param {Object} t - Babel types helper (`@babel/types`) used for AST node checks.
 * @param {string} varName - The variable name to look for in existing declarations.
 *
 * @returns {boolean} `true` if a variable declaration with the given name is found,
 *                    otherwise `false`.
 *
 * @important
 * - Only inspects **top-level statements** within the provided block body.
 * - Detects `var`, `let`, and `const` declarations.
 * - Does **not** traverse nested blocks or scopes.
 * - Intended as a guard to ensure idempotent AST injection.
 * - Errors are silently caught; add logging if visibility is required.
 */
export const isContextInstanceDeclare = (path, t, varName) => {
    try {
        return path.node.body.some(stmt => {
            if (!t.isVariableDeclaration(stmt)) return false;

            return stmt.declarations.some(decl =>
                t.isIdentifier(decl.id, { name: varName })
            );
        });
    } catch (e) {

    }
}

/**
 * Determines the correct insertion index for injecting new statements
 * into a function or program body.
 *
 * If the first statement is a `"use strict"` directive, the insertion
 * point is moved **after** it to preserve directive semantics.
 * Otherwise, insertion occurs at the start of the body.
 *
 * This utility is commonly used when inserting context hooks,
 * variable declarations, or other setup code during Babel AST transforms.
 *
 * @param {Array} body - An array of AST statements (e.g. `BlockStatement.body`).
 * @param {Object} t - Babel types helper (`@babel/types`) used for node checks.
 *
 * @returns {number} The index at which new statements should be inserted.
 *
 * @important
 * - Only checks the **first statement** for a `"use strict"` directive.
 * - Assumes `body` is a valid statement array.
 * - Preserves directive ordering and avoids breaking strict mode.
 * - Errors are silently swallowed; consider logging for debugging.
 */
export const getInsertionIndex = (body, t) => {
    try {
        let index = 0;
        if (
            body[0] &&
            t.isExpressionStatement(body[0]) &&
            t.isStringLiteral(body[0].expression, { value: USE_STRICT })
        ) {
            index = 1;
        }
        return index;
    } catch (e) {

    }
}

/**
 * Appends debug information to the Casper debug log file.
 *
 * This helper writes a formatted log entry to a file located in the
 * current working directory. Each argument is converted into a string:
 * - String values are written as-is.
 * - Non-string values are serialized using `JSON.stringify`.
 *
 * All arguments are concatenated with spaces and written as a single
 * log line followed by a newline character.
 *
 * @param {...any} args - One or more values to log. Supports strings,
 * objects, arrays, numbers, booleans, or any serializable value.
 *
 * @returns {void} This function does not return a value.
 *
 * @important
 * - Logging is synchronous (`fs.appendFileSync`), which may impact performance
 *   if called frequently or inside hot execution paths.
 * - Log file location is resolved relative to `process.cwd()`.
 * - Non-serializable objects may throw during `JSON.stringify`.
 * - Errors are silently swallowed to prevent logging from breaking execution.
 * - Intended primarily for debugging, tracing, or development diagnostics.
 */
export function log (...args) {
    try {
        fs.appendFileSync(
            path.join(process.cwd(), CASPER_DEBUG_LOG_FILE_NAME),
            args.map(a => (typeof a === CASPER_STRING_TYPE ? a : JSON.stringify(a))).join(" ") + "\n"
        );
    } catch (e) {

    }
}

/**
 * Determines whether a file should be processed or excluded by the transformation.
 *
 * This utility filters files based on predefined exclusion rules and optional
 * source directory constraints.
 *
 * Exclusion Rules:
 * - Files inside `node_modules` are excluded.
 * - Files inside build output folders (e.g., `dist`, `build`) are excluded.
 * - The global context file is excluded.
 *
 * Inclusion Rule:
 * - If `opts.sourceDir` is provided, only files inside that directory
 *   (relative to `opts.root` or `process.cwd()`) are included.
 * - If `opts.sourceDir` is not provided, all non-excluded files are included.
 *
 * @param {string} file - Absolute or relative file path being evaluated.
 * @param {Object} [opts] - Optional configuration object.
 * @param {string} [opts.sourceDir] - Source directory to restrict processing.
 * @param {string} [opts.root] - Project root directory. Defaults to `process.cwd()`.
 *
 * @returns {boolean}
 * - `true` → File is allowed to be processed.
 * - `false` → File should be excluded.
 *
 * @important
 * - Path checks use simple string matching (`includes`, `startsWith`),
 *   so paths should be normalized before calling this function if
 *   cross-platform compatibility is required.
 * - Ensure `file` is an absolute path when using `sourceDir` filtering
 *   for accurate matching.
 */
export function isExcludeFile (file, opts) {
    try {
        if (file.includes(NODE_MODULES)) return false;
        if (file.includes(FOLDER_DIST) || file.includes(FOLDER_BUILD)) return false;
        if (file.includes(GBL_CONTEXT_JS)) return false;

        if (opts?.sourceDir) {
            const root = opts.root || process.cwd();
            const srcRoot = path.join(root, opts.sourceDir);
            return file.startsWith(srcRoot);
        }

        return true;
    } catch (e) {

    }
}

/**
 * Resolves the React identifier to be used when generating AST nodes.
 *
 * This function determines which React reference should be used based on
 * how React is imported in the current file.
 *
 * Resolution priority:
 * 1. `state.importState.reactId`
 *    - Covers:
 *      - `import React from 'react'`
 *      - `import * as React from 'react'`
 * 2. Fallback to an injected global/core React identifier
 *    - Used when no explicit React import exists in the file
 *
 * @param {NodePath} path - Current Babel path (not directly used, but kept for symmetry/future use).
 * @param {Object} t - Babel types helper.
 * @param {Object} state - Babel plugin state.
 * @param {Object} state.importState - Collected import metadata.
 * @param {Identifier} [state.importState.reactId] - Resolved React identifier, if imported.
 *
 * @returns {Identifier}
 * The identifier representing `React` to be used in generated expressions
 * (e.g. `React.createElement`, `React.useContext`).
 *
 * @important
 * - This function does NOT validate whether the fallback React identifier
 *   is actually in scope; callers must ensure it is injected if needed.
 * - Hooks-only imports (`import { useState } from 'react'`) will NOT
 *   populate `reactId`, so fallback behavior applies.
 */
export function resolveReact (path, t, state) {
    try {
        const importState = state.importState;

        let reactIdent;
        // -------- React identifier --------
        if (importState.reactId) {
            // default OR namespace import
            // import React from 'react'
            // import * as React from 'react'
            reactIdent = importState.reactId;
        } else {
            // fallback injected core react
            reactIdent = t.identifier(_CCTX_UNDUS_CORE_REACT);
        }
        return reactIdent;
    } catch (e) {

    }
}

/**
 * Resets registered variable metadata for all virtual registry entries
 * associated with a specific file hash.
 *
 * This function scans the provided `virtualRegistry` and clears the
 * `varNames` and `defaults` collections for any registry entry whose key
 * matches the given `fileHash` suffix. It is typically used when a file
 * is reprocessed to ensure stale variable mappings do not persist.
 *
 * @param {Object<string, Object>} virtualRegistry - Central registry object that stores
 * component/context mappings and variable metadata.
 * @param {string} fileHash - Unique hash identifier representing the file.
 * This hash is expected to be appended to registry keys using the format:
 * `"<componentHash>_<fileHash>"`.
 *
 * @returns {void}
 * This function mutates `virtualRegistry` in place and does not return a value.
 *
 * @important
 * - Only registry entries whose keys end with `_<fileHash>` are affected.
 * - The registry entry itself is NOT removed; only `varNames` and `defaults`
 *   are cleared.
 * - Safe to call multiple times; repeated calls will simply reset the same entries.
 * - Assumes registry keys consistently follow the expected naming convention.
 */
export function resetVarsForFile (virtualRegistry, fileHash) {
    try {
        for (const key of Object.keys(virtualRegistry)) {
            if (key.endsWith(`_${fileHash}`)) {
                virtualRegistry[key].varNames = [];
                virtualRegistry[key].defaults = {};
            }
        }
    } catch (e) {

    }
}

/**
 * Reads, parses, and caches the Casper configuration file.
 *
 * This function loads user-defined configuration from the Casper config file
 * located at `CASPER_CONFIG_PATH`. If the file exists and contains valid JSON,
 * its values are merged with `DEFAULT_CONFIG`. The merged result is cached to
 * avoid repeated filesystem reads and parsing during subsequent calls.
 *
 * If the config file does not exist or parsing fails, the function falls back
 * to `DEFAULT_CONFIG`.
 *
 * @returns {Object}
 * The resolved Casper configuration object, which is either:
 * - A merged object of `DEFAULT_CONFIG` and user-provided config values, or
 * - `DEFAULT_CONFIG` if no valid user configuration is found.
 *
 * @important
 * - Configuration is cached after the first successful read to improve performance.
 * - Subsequent calls return the cached configuration without re-reading the file.
 * - If runtime config reloading is required, `cachedConfig` must be manually cleared.
 * - User configuration values override matching keys in `DEFAULT_CONFIG`.
 * - Invalid JSON or filesystem errors automatically trigger fallback to `DEFAULT_CONFIG`.
 */
let cachedConfig = null;
export function readCasperConfig () {
    if (cachedConfig) return cachedConfig;
    try {
        if (fs.existsSync(CASPER_CONFIG_PATH)) {
            const file = fs.readFileSync(CASPER_CONFIG_PATH, "utf8");
            const userConfig = JSON.parse(file);

            cachedConfig = {
                ...DEFAULT_CONFIG,
                ...userConfig
            };
        } else {
            cachedConfig = DEFAULT_CONFIG;
        }

    } catch (e) {
        cachedConfig = DEFAULT_CONFIG;
    }
    return cachedConfig;
}


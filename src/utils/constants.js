/**
 * @fileoverview Centralized constants for the Casper Context Babel Plugin.
 * This module contains all configuration strings, AST node identifiers, 
 * and environment-specific constants used for state management and code injection.
 */

/** * Plugin Identity & Configuration */
export const PLUGIN_NAME = 'casper-context';
export const CASPER_CONFIG_FILE = '.casperctxrc.json';
export const CASPER_DEBUG_LOG_FILE_NAME = '.casperctx.debug.log';
export const USE_STRICT = 'use strict';

/** * Context Logic & Namespacing
 * @description Variables used to identify and scope the custom context transformation.
 */
export const GLOBAL_PREFIX = '_$_';
export const CONTEXT_NAMESPACE = '__CASPER_CONTEXT__';
export const CONTEXT_FOLDER_NAME = 'src/scopeContext';
export const CONTEXT_FILE_NAME = 'gblContext.js';
export const GBL_CONTEXT_JS = 'gblContext.js';
export const _CCTX_CMP_NAME_PREFIX = '_$_ctx_';
export const _CCTX_ = 'CTX_'; // Internal prefix for generated context variables

/** * React & Framework Identifiers
 * @description Standard React hook names and internal library aliases for injection.
 */
export const REACT_IMPORT_CORE_NAME = 'react';
export const REACT_IMPORT_USE_STATE_HOOKS_NAME = 'useState';
export const _CCTX_REACT = 'react';
export const _CCTX_USE_CONTEXT = 'useContext';
export const _CCTX_CREATE_ELEMENT = 'createElement';
export const _CCTX_PROVIDER = 'Provider';
export const _CCTX_VALUE = 'value';

/** * AST Node Type Mapping
 * @description Strings matching Babel's internal node types for safe AST traversal.
 */
export const IDENTIFIER = 'Identifier';
export const NUMERIC_LITERAL = 'NumericLiteral';
export const STRING_LITERAL = 'StringLiteral';
export const BOOLEAN_LITERAL = 'BooleanLiteral';
export const ARRAY_EXPRESSION = 'ArrayExpression';
export const OBJECT_EXPRESSION = 'ObjectExpression';
export const VARIABLE_DECLARATOR = 'VariableDeclarator';
export const ASSIGNMENT_EXPRESSION = 'AssignmentExpression';
export const UPDATE_EXPRESSION = 'UpdateExpression';

/** * AST Node Property Keys
 * @description Specific keys within Babel nodes used for targeting during transformation.
 */
export const _CCTX_ID = 'id';
export const _CCTX_LEFT = 'left';      // Used in AssignmentExpressions
export const _CCTX_ARGUMENT = 'argument'; // Used in UpdateExpressions
export const _CCTX_KEY = 'key';
export const _CCTX_BODY = 'body';

/** * Internal Transformation Aliases
 * @description Identifiers and keywords used for generating new code structures.
 */
export const _CCTX_VAR = 'var';
export const _CCTX_CONST = 'const';
export const _CCTX_REQUIRE = 'require';
export const _CCTX_UNDUS_CORE_REACT = '_react';
export const _CCTX_UNDUS_CORE_GBL_CONTEXT = '_gblContext';
export const PREV_STATE = 'prevState'; // For functional state updates: (prevState) => ...
export const _CCTX_SET = 'set';        // Prefix for state setter functions

/** * Component & Scope Classification */
export const COMPONENT = 'component';
export const ANONYMOUS_FUNCTION = 'anonymous_function';
export const ANONYMOUS_CLASS = 'anonymous_class';

/** * File System & Build Tooling
 * @description Constants for file manipulation, hashing, and distribution paths.
 */
export const UNICODE_UTF8 = 'utf8';
export const FILE_HASH_MD5 = 'md5';
export const DIGEST_HEX = 'hex';
export const NODE_MODULES = 'node_modules';
export const FOLDER_DIST = '/dist/';
export const FOLDER_BUILD = '/build/';
export const ESLINT_RC_FILE = '.eslintrc.js';
export const CASPER_ESLINT_GLOBAL_JS = 'casper-eslint.global.js';
export const CASPER_STRING_TYPE = 'string';
export const CASPER_READ_ONLY_TYPE = 'readonly';

/** * Sentinel, Fallback & Literal Values */
export const _CCTX_EMPTY = '';
export const _CCTX_UNDEFINED = 'undefined';
export const _CCTX_UNKNOW = 'Unknown';
export const NO_FILE = 'noFile';
export const NON_LITERAL = 'NON_LITERAL';
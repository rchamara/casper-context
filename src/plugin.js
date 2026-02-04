import { PLUGIN_NAME } from './utils/constants';
import preProcess from './lifecycle/pre';
import postProcess from './lifecycle/post';
import variableDeclarationVisitor from './visitors/VariableDeclaration';
import assignmentExpressionVisitor from './visitors/AssignmentExpression';
import identifierVisitor from './visitors/Identifier';
import { programExit, programEnter } from './visitors/Program';
import { functionDeclarationExit } from './visitors/FunctionDeclaration';
import { readCasperConfig } from './utils/utilityHelpers';

const virtualRegistry = {};
const prevVirtualRegistrySnap = {}

export default function ({ types: t }) {
    
    const config = readCasperConfig();
    const seen = new WeakSet();
    return {
        name: PLUGIN_NAME,
        pre(file) {
            preProcess.call(this, file, t);
        },
        visitor: {
            Program: {
                enter(path, state) {
                    programEnter.call(this, path, state, t, virtualRegistry, config);
                },
                exit(path, state) {
                    programExit.call(this, path, state, t);
                }
            },
            VariableDeclarator (path, state) {
                variableDeclarationVisitor.call(this, path, state, t, virtualRegistry);
            },
            AssignmentExpression (path, state) {
                assignmentExpressionVisitor.call(this, path, state, t, virtualRegistry);
            },
            Identifier (path, state) {
                identifierVisitor.call(this, path, state, t, seen, virtualRegistry);
            },
            FunctionDeclaration: {
                exit (path, state) {
        
                    functionDeclarationExit.call(this, path, state, t, virtualRegistry);
                }
            }
        },
        post(file) {
            postProcess.call(this, file, t, virtualRegistry, prevVirtualRegistrySnap);
        }
    }
}
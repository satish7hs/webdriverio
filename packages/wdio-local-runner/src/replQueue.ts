import type { ChildProcess } from 'child_process'

import WDIORepl from './repl'

interface Repl {
    childProcess: ChildProcess
    options: any
    onStart: Function
    onEnd: Function
}

/**
 * repl queue class
 * allows to run debug commands in mutliple workers one after another
 */
export default class ReplQueue {
    private _repls: Repl[] = []
    private _runningRepl?: WDIORepl

    add (childProcess: ChildProcess, options: any, onStart: Function, onEnd: Function) {
        this._repls.push({ childProcess, options, onStart, onEnd })
    }

    next () {
        if (this.isRunning || this._repls.length === 0) {
            return
        }

        const nextRepl = this._repls.shift()
        if (!nextRepl) {
            return
        }

        const { childProcess, options, onStart, onEnd } = nextRepl
        const runningRepl = this._runningRepl = new WDIORepl(childProcess, options)

        onStart()
        runningRepl.start().then(() => {
            const ev = {
                origin: 'debugger',
                name: 'stop'
            }
            runningRepl.childProcess.send(ev)
            onEnd(ev)

            delete this._runningRepl
            this.next()
        })
    }

    get isRunning () {
        return Boolean(this._runningRepl)
    }
}

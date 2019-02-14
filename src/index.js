require('babel-polyfill')
require('proxy-polyfill')

Object.defineProperty(global, '__stack', {
  get: function(...args) {
    var orig = Error.prepareStackTrace
    Error.prepareStackTrace = function(_, stack) {
      return stack
    }
    var err = new Error()
    Error.captureStackTrace(err, args.callee)
    var stack = err.stack
    Error.prepareStackTrace = orig
    while (stack[0].getFileName() === __filename) {
      stack.shift()
    }
    return stack
  }
})

const getCircularReplacer = () => {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}

function _log({ msg, level, context, backtrace }) {
  return JSON.stringify(
    {
      message: msg,
      src_line: __stack[0].getLineNumber(),
      src_file: __stack[0].getFileName(),
      context,
      level,
      time: new Date().toISOString(),
      backtrace
    },
    getCircularReplacer()
  )
}

function makeMethod(name) {
  return function(msg = '', context = this._context, backtrace) {
    const isValid =
      typeof msg === 'string' &&
      (typeof context === 'object' || typeof context === 'string')
    if (!isValid) {
      throw new TypeError('invalid arguments')
    } else {
      let mergedContext = this._context
      if (typeof context !== 'object') {
        mergedContext = Object.assign({}, mergedContext, { data: context })
      }
      mergedContext = Object.assign({}, mergedContext, context)
      console.log(
        _log.call(this, {
          level: name,
          msg,
          context: mergedContext,
          backtrace
        })
      )
    }
  }
}

const METHODS = ['info', 'debug', 'warning', 'error', 'fatal']

class Logger {
  constructor(context = { user: 'system' }) {
    this._context = context
    METHODS.map(method => (Logger.prototype[method] = makeMethod(method)))
  }
  static get _methods() {
    return METHODS
  }
  static get _log() {
    return _log
  }
}

module.exports = new Proxy(Logger, {
  apply(target, thisArg, argumentsList) {
    _log({
      msg: "[DEPRECATED]: always use 'new' for instantiation",
      level: 'warning'
    })
    return new target(argumentsList)
  }
})

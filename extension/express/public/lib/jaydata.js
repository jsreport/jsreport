// JayData 1.3.2
// Dual licensed under MIT and GPL v2
// Copyright JayStack Technologies (http://jaydata.org/licensing)
//
// JayData is a standards-based, cross-platform Javascript library and a set of
// practices to access and manipulate data from various online and offline sources.
//
// Credits:
//     Hajnalka Battancs, Dániel József, János Roden, László Horváth, Péter Nochta
//     Péter Zentai, Róbert Bónay, Szabolcs Czinege, Viktor Borza, Viktor Lázár,
//     Zoltán Gyebrovszki, Gábor Dolla
//
// More info: http://jaydata.org
// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke and released under an MIT
// license. The Unicode regexps (for identifiers and whitespace) were
// taken from [Esprima](http://esprima.org) by Ariya Hidayat.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/marijnh/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/marijnh/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") return mod(exports); // CommonJS
  if (typeof define == "function" && define.amd) return define(["exports"], mod); // AMD
  mod(self.acorn || (self.acorn = {})); // Plain browser env
})(function(exports) {
  "use strict";

  exports.version = "0.1.01";

  // The main exported interface (under `self.acorn` when in the
  // browser) is a `parse` function that takes a code string and
  // returns an abstract syntax tree as specified by [Mozilla parser
  // API][api], with the caveat that the SpiderMonkey-specific syntax
  // (`let`, `yield`, inline XML, etc) is not recognized.
  //
  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

  var options, input, inputLen, sourceFile;

  exports.parse = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();
    return parseTopLevel(options.program);
  };

  // A second optional argument can be given to further configure
  // the parser process. These options are recognized:

  var defaultOptions = exports.defaultOptions = {
    // `ecmaVersion` indicates the ECMAScript version to parse. Must
    // be either 3 or 5. This
    // influences support for strict mode, the set of reserved words, and
    // support for getters and setter.
    ecmaVersion: 5,
    // Turn on `strictSemicolons` to prevent the parser from doing
    // automatic semicolon insertion.
    strictSemicolons: false,
    // When `allowTrailingCommas` is false, the parser will not allow
    // trailing commas in array and object literals.
    allowTrailingCommas: true,
    // By default, reserved words are not enforced. Enable
    // `forbidReserved` to enforce them.
    forbidReserved: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onComment` option, which will
    // cause Acorn to call that function with `(block, text, start,
    // end)` parameters whenever a comment is skipped. `block` is a
    // boolean indicating whether this is a block (`/* */`) comment,
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments.
    onComment: null,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `location` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null
  };

  function setOptions(opts) {
    options = opts || {};
    for (var opt in defaultOptions) if (!options.hasOwnProperty(opt))
      options[opt] = defaultOptions[opt];
    sourceFile = options.sourceFile || null;
  }

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  var getLineInfo = exports.getLineInfo = function(input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreak.lastIndex = cur;
      var match = lineBreak.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else break;
    }
    return {line: line, column: offset - cur};
  };

  // Acorn is organized as a tokenizer and a recursive-descent parser.
  // The `tokenize` export provides an interface to the tokenizer.
  // Because the tokenizer is optimized for being efficiently used by
  // the Acorn parser itself, this interface is somewhat crude and not
  // very modular. Performing another parse or call to `tokenize` will
  // reset the internal state, and invalidate existing tokenizers.

  exports.tokenize = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();

    var t = {};
    function getToken(forceRegexp) {
      readToken(forceRegexp);
      t.start = tokStart; t.end = tokEnd;
      t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
      t.type = tokType; t.value = tokVal;
      return t;
    }
    getToken.jumpTo = function(pos, reAllowed) {
      tokPos = pos;
      if (options.locations) {
        tokCurLine = tokLineStart = lineBreak.lastIndex = 0;
        var match;
        while ((match = lineBreak.exec(input)) && match.index < pos) {
          ++tokCurLine;
          tokLineStart = match.index + match[0].length;
        }
      }
      var ch = input.charAt(pos - 1);
      tokRegexpAllowed = reAllowed;
      skipSpace();
    };
    return getToken;
  };

  // State is kept in (closure-)global variables. We already saw the
  // `options`, `input`, and `inputLen` variables above.

  // The current position of the tokenizer in the input.

  var tokPos;

  // The start and end offsets of the current token.

  var tokStart, tokEnd;

  // When `options.locations` is true, these hold objects
  // containing the tokens start and end line/column pairs.

  var tokStartLoc, tokEndLoc;

  // The type and value of the current token. Token types are objects,
  // named by variables against which they can be compared, and
  // holding properties that describe them (indicating, for example,
  // the precedence of an infix operator, and the original name of a
  // keyword token). The kind of value that's held in `tokVal` depends
  // on the type of the token. For literals, it is the literal value,
  // for operators, the operator name, and so on.

  var tokType, tokVal;

  // Interal state for the tokenizer. To distinguish between division
  // operators and regular expressions, it remembers whether the last
  // token was one that is allowed to be followed by an expression.
  // (If it is, a slash is probably a regexp, if it isn't it's a
  // division operator. See the `parseStatement` function for a
  // caveat.)

  var tokRegexpAllowed;

  // When `options.locations` is true, these are used to keep
  // track of the current line, and know when a new line has been
  // entered.

  var tokCurLine, tokLineStart;

  // These store the position of the previous token, which is useful
  // when finishing a node and assigning its `end` position.

  var lastStart, lastEnd, lastEndLoc;

  // This is the parser's state. `inFunction` is used to reject
  // `return` statements outside of functions, `labels` to verify that
  // `break` and `continue` have somewhere to jump to, and `strict`
  // indicates whether strict mode is on.

  var inFunction, labels, strict;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  function raise(pos, message) {
    var loc = getLineInfo(input, pos);
    message += " (" + loc.line + ":" + loc.column + ")";
    var err = new SyntaxError(message);
    err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
    throw err;
  }

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // These are the general types. The `type` property is only used to
  // make them recognizeable when debugging.

  var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
  var _name = {type: "name"}, _eof = {type: "eof"};

  // Keyword tokens. The `keyword` property (also used in keyword-like
  // operators) indicates that the token originated from an
  // identifier-like word, which is used when parsing property names.
  //
  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  //
  // `isLoop` marks a keyword as starting a loop, which is important
  // to know when parsing a label, in order to allow or disallow
  // continue jumps to that label.

  var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
  var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
  var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
  var _finally = {keyword: "finally"}, _for = {keyword: "for", isLoop: true}, _function = {keyword: "function"};
  var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
  var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
  var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {keyword: "new", beforeExpr: true};
  var _this = {keyword: "this"};

  // The keywords that denote values.

  var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
  var _false = {keyword: "false", atomValue: false};

  // Some keywords are treated as regular operators. `in` sometimes
  // (when parsing `for`) needs to be tested against specifically, so
  // we assign a variable name to it for quick comparing.

  var _in = {keyword: "in", binop: 7, beforeExpr: true};

  // Map keyword names to token types.

  var keywordTypes = {"break": _break, "case": _case, "catch": _catch,
                      "continue": _continue, "debugger": _debugger, "default": _default,
                      "do": _do, "else": _else, "finally": _finally, "for": _for,
                      "function": _function, "if": _if, "return": _return, "switch": _switch,
                      "throw": _throw, "try": _try, "var": _var, "while": _while, "with": _with,
                      "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                      "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
                      "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
                      "void": {keyword: "void", prefix: true, beforeExpr: true},
                      "delete": {keyword: "delete", prefix: true, beforeExpr: true}};

  // Punctuation token types. Again, the `type` property is purely for debugging.

  var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
  var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
  var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
  var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _question = {type: "?", beforeExpr: true};

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator. `isUpdate` specifies that the node produced by
  // the operator should be of type UpdateExpression rather than
  // simply UnaryExpression (`++` and `--`).
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
  var _assign = {isAssign: true, beforeExpr: true}, _plusmin = {binop: 9, prefix: true, beforeExpr: true};
  var _incdec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
  var _bin1 = {binop: 1, beforeExpr: true}, _bin2 = {binop: 2, beforeExpr: true};
  var _bin3 = {binop: 3, beforeExpr: true}, _bin4 = {binop: 4, beforeExpr: true};
  var _bin5 = {binop: 5, beforeExpr: true}, _bin6 = {binop: 6, beforeExpr: true};
  var _bin7 = {binop: 7, beforeExpr: true}, _bin8 = {binop: 8, beforeExpr: true};
  var _bin10 = {binop: 10, beforeExpr: true};

  // Provide access to the token types for external users of the
  // tokenizer.

  exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                      parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                      dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,
                      num: _num, regexp: _regexp, string: _string};
  for (var kw in keywordTypes) exports.tokTypes[kw] = keywordTypes[kw];

  // This is a trick taken from Esprima. It turns out that, on
  // non-Chrome browsers, to check whether a string is in a set, a
  // predicate containing a big ugly `switch` statement is faster than
  // a regular expression, and on Chrome the two are about on par.
  // This function uses `eval` (non-lexical) to produce such a
  // predicate from a space-separated string of words.
  //
  // It starts by sorting the words by length.

  function makePredicate(words) {
    words = words.split(" ");
    var f = "", cats = [];
    out: for (var i = 0; i < words.length; ++i) {
      for (var j = 0; j < cats.length; ++j)
        if (cats[j][0].length == words[i].length) {
          cats[j].push(words[i]);
          continue out;
        }
      cats.push([words[i]]);
    }
    function compareTo(arr) {
      if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
      f += "switch(str){";
      for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
      f += "return true}return false;";
    }

    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.

    if (cats.length > 3) {
      cats.sort(function(a, b) {return b.length - a.length;});
      f += "switch(str.length){";
      for (var i = 0; i < cats.length; ++i) {
        var cat = cats[i];
        f += "case " + cat[0].length + ":";
        compareTo(cat);
      }
      f += "}";

    // Otherwise, simply generate a flat `switch` statement.

    } else {
      compareTo(words);
    }
    return new Function("str", f);
  }

  // The ECMAScript 3 reserved word list.

  var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

  // ECMAScript 5 reserved words.

  var isReservedWord5 = makePredicate("class enum extends super const export import");

  // The additional reserved words in strict mode.

  var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

  // The forbidden variable names in strict mode.

  var isStrictBadIdWord = makePredicate("eval arguments");

  // And the keywords.

  var isKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.

  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/;
  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars = "\u0371-\u0374\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  // Whether a single character denotes a newline.

  var newline = /[\n\r\u2028\u2029]/;

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

  // Test whether a given character code starts an identifier.

  function isIdentifierStart(code) {
    if (code < 65) return code === 36;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  }

  // Test whether a given character is part of an identifier.

  function isIdentifierChar(code) {
    if (code < 48) return code === 36;
    if (code < 58) return true;
    if (code < 65) return false;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  }

  // ## Tokenizer

  // These are used when `options.locations` is on, for the
  // `tokStartLoc` and `tokEndLoc` properties.

  function line_loc_t() {
    this.line = tokCurLine;
    this.column = tokPos - tokLineStart;
  }

  // Reset the token state. Used at the start of a parse.

  function initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    skipSpace();
  }

  // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
  // `tokRegexpAllowed`, and skips the space after the token, so that
  // the next one's `tokStart` will point at the right position.

  function finishToken(type, val) {
    tokEnd = tokPos;
    if (options.locations) tokEndLoc = new line_loc_t;
    tokType = type;
    skipSpace();
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
  }

  function skipBlockComment() {
    var startLoc = options.onComment && options.locations && new line_loc_t;
    var start = tokPos, end = input.indexOf("*/", tokPos += 2);
    if (end === -1) raise(tokPos - 2, "Unterminated comment");
    tokPos = end + 2;
    if (options.locations) {
      lineBreak.lastIndex = start;
      var match;
      while ((match = lineBreak.exec(input)) && match.index < tokPos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length;
      }
    }
    if (options.onComment)
      options.onComment(true, input.slice(start + 2, end), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
  }

  function skipLineComment() {
    var start = tokPos;
    var startLoc = options.onComment && options.locations && new line_loc_t;
    var ch = input.charCodeAt(tokPos+=2);
    while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8329) {
      ++tokPos;
      ch = input.charCodeAt(tokPos);
    }
    if (options.onComment)
      options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
  }

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  function skipSpace() {
    while (tokPos < inputLen) {
      var ch = input.charCodeAt(tokPos);
      if (ch === 32) { // ' '
        ++tokPos;
      } else if(ch === 13) {
        ++tokPos;
        var next = input.charCodeAt(tokPos);
        if(next === 10) {
          ++tokPos;
        }
        if(options.locations) {
          ++tokCurLine;
          tokLineStart = tokPos;
        }
      } else if (ch === 10) {
        ++tokPos;
        ++tokCurLine;
        tokLineStart = tokPos;
      } else if(ch < 14 && ch > 8) {
        ++tokPos;
      } else if (ch === 47) { // '/'
        var next = input.charCodeAt(tokPos+1);
        if (next === 42) { // '*'
          skipBlockComment();
        } else if (next === 47) { // '/'
          skipLineComment();
        } else break;
      } else if ((ch < 14 && ch > 8) || ch === 32 || ch === 160) { // ' ', '\xa0'
        ++tokPos;
      } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++tokPos;
      } else {
        break;
      }
    }
  }

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  // The `forceRegexp` parameter is used in the one case where the
  // `tokRegexpAllowed` trick does not work. See `parseStatement`.

  function readToken_dot() {
    var next = input.charCodeAt(tokPos+1);
    if (next >= 48 && next <= 57) return readNumber(true);
    ++tokPos;
    return finishToken(_dot);
  }

  function readToken_slash() { // '/'
    var next = input.charCodeAt(tokPos+1);
    if (tokRegexpAllowed) {++tokPos; return readRegexp();}
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_slash, 1);
  }

  function readToken_mult_modulo() { // '%*'
    var next = input.charCodeAt(tokPos+1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_bin10, 1);
  }

  function readToken_pipe_amp(code) { // '|&'
    var next = input.charCodeAt(tokPos+1);
    if (next === code) return finishOp(code === 124 ? _bin1 : _bin2, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(code === 124 ? _bin3 : _bin5, 1);
  }

  function readToken_caret() { // '^'
    var next = input.charCodeAt(tokPos+1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_bin4, 1);    
  }

  function readToken_plus_min(code) { // '+-'
    var next = input.charCodeAt(tokPos+1);
    if (next === code) return finishOp(_incdec, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_plusmin, 1);    
  }

  function readToken_lt_gt(code) { // '<>'
    var next = input.charCodeAt(tokPos+1);
    var size = 1;
    if (next === code) {
      size = code === 62 && input.charCodeAt(tokPos+2) === 62 ? 3 : 2;
      if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
      return finishOp(_bin8, size);
    }
    if (next === 61)
      size = input.charCodeAt(tokPos+2) === 61 ? 3 : 2;
    return finishOp(_bin7, size);
  }
  
  function readToken_eq_excl(code) { // '=!'
    var next = input.charCodeAt(tokPos+1);
    if (next === 61) return finishOp(_bin6, input.charCodeAt(tokPos+2) === 61 ? 3 : 2);
    return finishOp(code === 61 ? _eq : _prefix, 1);
  }

  function getTokenFromCode(code) {
    switch(code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit.
    case 46: // '.'
      return readToken_dot();

      // Punctuation tokens.
    case 40: ++tokPos; return finishToken(_parenL);
    case 41: ++tokPos; return finishToken(_parenR);
    case 59: ++tokPos; return finishToken(_semi);
    case 44: ++tokPos; return finishToken(_comma);
    case 91: ++tokPos; return finishToken(_bracketL);
    case 93: ++tokPos; return finishToken(_bracketR);
    case 123: ++tokPos; return finishToken(_braceL);
    case 125: ++tokPos; return finishToken(_braceR);
    case 58: ++tokPos; return finishToken(_colon);
    case 63: ++tokPos; return finishToken(_question);

      // '0x' is a hexadecimal number.
    case 48: // '0'
      var next = input.charCodeAt(tokPos+1);
      if (next === 120 || next === 88) return readHexNumber();
      // Anything else beginning with a digit is an integer, octal
      // number, or float.
    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
      return readNumber(false);

      // Quotes produce strings.
    case 34: case 39: // '"', "'"
      return readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47: // '/'
      return readToken_slash(code);

    case 37: case 42: // '%*'
      return readToken_mult_modulo();

    case 124: case 38: // '|&'
      return readToken_pipe_amp(code);

    case 94: // '^'
      return readToken_caret();

    case 43: case 45: // '+-'
      return readToken_plus_min(code);

    case 60: case 62: // '<>'
      return readToken_lt_gt(code);

    case 61: case 33: // '=!'
      return readToken_eq_excl(code);

    case 126: // '~'
      return finishOp(_prefix, 1);
    }

    return false;
  }

  function readToken(forceRegexp) {
    if (!forceRegexp) tokStart = tokPos;
    else tokPos = tokStart + 1;
    if (options.locations) tokStartLoc = new line_loc_t;
    if (forceRegexp) return readRegexp();
    if (tokPos >= inputLen) return finishToken(_eof);

    var code = input.charCodeAt(tokPos);
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();
    
    var tok = getTokenFromCode(code);

    if (tok === false) {
      // If we are here, we either found a non-ASCII identifier
      // character, or something that's entirely disallowed.
      var ch = String.fromCharCode(code);
      if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
      raise(tokPos, "Unexpected character '" + ch + "'");
    } 
    return tok;
  }

  function finishOp(type, size) {
    var str = input.slice(tokPos, tokPos + size);
    tokPos += size;
    finishToken(type, str);
  }

  // Parse a regular expression. Some context-awareness is necessary,
  // since a '/' inside a '[]' set does not end the expression.

  function readRegexp() {
    var content = "", escaped, inClass, start = tokPos;
    for (;;) {
      if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
      var ch = input.charAt(tokPos);
      if (newline.test(ch)) raise(start, "Unterminated regular expression");
      if (!escaped) {
        if (ch === "[") inClass = true;
        else if (ch === "]" && inClass) inClass = false;
        else if (ch === "/" && !inClass) break;
        escaped = ch === "\\";
      } else escaped = false;
      ++tokPos;
    }
    var content = input.slice(start, tokPos);
    ++tokPos;
    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    var mods = readWord1();
    if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regexp flag");
    return finishToken(_regexp, new RegExp(content, mods));
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  function readInt(radix, len) {
    var start = tokPos, total = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
      var code = input.charCodeAt(tokPos), val;
      if (code >= 97) val = code - 97 + 10; // a
      else if (code >= 65) val = code - 65 + 10; // A
      else if (code >= 48 && code <= 57) val = code - 48; // 0-9
      else val = Infinity;
      if (val >= radix) break;
      ++tokPos;
      total = total * radix + val;
    }
    if (tokPos === start || len != null && tokPos - start !== len) return null;

    return total;
  }

  function readHexNumber() {
    tokPos += 2; // 0x
    var val = readInt(16);
    if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
    return finishToken(_num, val);
  }

  // Read an integer, octal integer, or floating-point number.
  
  function readNumber(startsWithDot) {
    var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
    if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
    if (input.charCodeAt(tokPos) === 46) {
      ++tokPos;
      readInt(10);
      isFloat = true;
    }
    var next = input.charCodeAt(tokPos);
    if (next === 69 || next === 101) { // 'eE'
      next = input.charCodeAt(++tokPos);
      if (next === 43 || next === 45) ++tokPos; // '+-'
      if (readInt(10) === null) raise(start, "Invalid number")
      isFloat = true;
    }
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

    var str = input.slice(start, tokPos), val;
    if (isFloat) val = parseFloat(str);
    else if (!octal || str.length === 1) val = parseInt(str, 10);
    else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
    else val = parseInt(str, 8);
    return finishToken(_num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  function readString(quote) {
    tokPos++;
    var out = "";
    for (;;) {
      if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
      var ch = input.charCodeAt(tokPos);
      if (ch === quote) {
        ++tokPos;
        return finishToken(_string, out);
      }
      if (ch === 92) { // '\'
        ch = input.charCodeAt(++tokPos);
        var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
        if (octal) octal = octal[0];
        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, octal.length - 1);
        if (octal === "0") octal = null;
        ++tokPos;
        if (octal) {
          if (strict) raise(tokPos - 2, "Octal literal in strict mode");
          out += String.fromCharCode(parseInt(octal, 8));
          tokPos += octal.length - 1;
        } else {
          switch (ch) {
          case 110: out += "\n"; break; // 'n' -> '\n'
          case 114: out += "\r"; break; // 'r' -> '\r'
          case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
          case 117: out += String.fromCharCode(readHexChar(4)); break; // 'u'
          case 85: out += String.fromCharCode(readHexChar(8)); break; // 'U'
          case 116: out += "\t"; break; // 't' -> '\t'
          case 98: out += "\b"; break; // 'b' -> '\b'
          case 118: out += "\u000b"; break; // 'v' -> '\u000b'
          case 102: out += "\f"; break; // 'f' -> '\f'
          case 48: out += "\0"; break; // 0 -> '\0'
          case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
          case 10: // ' \n'
            if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
            break;
          default: out += String.fromCharCode(ch); break;
          }
        }
      } else {
        if (ch === 13 || ch === 10 || ch === 8232 || ch === 8329) raise(tokStart, "Unterminated string constant");
        out += String.fromCharCode(ch); // '\'
        ++tokPos;
      }
    }
  }

  // Used to read character escape sequences ('\x', '\u', '\U').

  function readHexChar(len) {
    var n = readInt(16, len);
    if (n === null) raise(tokStart, "Bad character escape sequence");
    return n;
  }

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.

  var containsEsc;

  // Read an identifier, and return it as a string. Sets `containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Only builds up the word character-by-character when it actually
  // containeds an escape, as a micro-optimization.

  function readWord1() {
    containsEsc = false;
    var word, first = true, start = tokPos;
    for (;;) {
      var ch = input.charCodeAt(tokPos);
      if (isIdentifierChar(ch)) {
        if (containsEsc) word += input.charAt(tokPos);
        ++tokPos;
      } else if (ch === 92) { // "\"
        if (!containsEsc) word = input.slice(start, tokPos);
        containsEsc = true;
        if (input.charCodeAt(++tokPos) != 117) // "u"
          raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
        ++tokPos;
        var esc = readHexChar(4);
        var escStr = String.fromCharCode(esc);
        if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
          raise(tokPos - 4, "Invalid Unicode escape");
        word += escStr;
      } else {
        break;
      }
      first = false;
    }
    return containsEsc ? word : input.slice(start, tokPos);
  }

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  function readWord() {
    var word = readWord1();
    var type = _name;
    if (!containsEsc) {
      if (isKeyword(word)) type = keywordTypes[word];
      else if (options.forbidReserved &&
               (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(word) ||
               strict && isStrictReservedWord(word))
        raise(tokStart, "The keyword '" + word + "' is reserved");
    }
    return finishToken(type, word);
  }

  // ## Parser

  // A recursive descent parser operates by defining functions for all
  // syntactic elements, and recursively calling those, each function
  // advancing the input stream and returning an AST node. Precedence
  // of constructs (for example, the fact that `!x[1]` means `!(x[1])`
  // instead of `(!x)[1]` is handled by the fact that the parser
  // function that parses unary prefix operators is called first, and
  // in turn calls the function that parses `[]` subscripts â€” that
  // way, it'll receive the node for `x[1]` already parsed, and wraps
  // *that* in the unary operator node.
  //
  // Acorn uses an [operator precedence parser][opp] to handle binary
  // operator precedence, because it is much more compact than using
  // the technique outlined above, which uses different, nesting
  // functions to specify precedence, for all of the ten binary
  // precedence levels that JavaScript defines.
  //
  // [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

  // ### Parser utilities

  // Continue to the next token.
  
  function next() {
    lastStart = tokStart;
    lastEnd = tokEnd;
    lastEndLoc = tokEndLoc;
    readToken();
  }

  // Enter strict mode. Re-reads the next token to please pedantic
  // tests ("use strict"; 010; -- should fail).

  function setStrict(strct) {
    strict = strct;
    tokPos = lastEnd;
    while (tokPos < tokLineStart) {
      tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
      --tokCurLine;
    }
    skipSpace();
    readToken();
  }

  // Start an AST node, attaching a start offset.

  function node_t() {
    this.type = null;
    this.start = tokStart;
    this.end = null;
  }

  function node_loc_t() {
    this.start = tokStartLoc;
    this.end = null;
    if (sourceFile !== null) this.source = sourceFile;
  }

  function startNode() {
    var node = new node_t();
    if (options.locations)
      node.loc = new node_loc_t();
    if (options.ranges)
      node.range = [tokStart, 0];
    return node;
  }

  // Start a node whose start offset information should be based on
  // the start of another node. For example, a binary operator node is
  // only started after its left-hand side has already been parsed.

  function startNodeFrom(other) {
    var node = new node_t();
    node.start = other.start;
    if (options.locations) {
      node.loc = new node_loc_t();
      node.loc.start = other.loc.start;
    }
    if (options.ranges)
      node.range = [other.range[0], 0];

    return node;
  }

  // Finish an AST node, adding `type` and `end` properties.

  function finishNode(node, type) {
    node.type = type;
    node.end = lastEnd;
    if (options.locations)
      node.loc.end = lastEndLoc;
    if (options.ranges)
      node.range[1] = lastEnd;
    return node;
  }

  // Test whether a statement node is the string literal `"use strict"`.

  function isUseStrict(stmt) {
    return options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
  }

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  function eat(type) {
    if (tokType === type) {
      next();
      return true;
    }
  }

  // Test whether a semicolon can be inserted at the current position.

  function canInsertSemicolon() {
    return !options.strictSemicolons &&
      (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));
  }

  // Consume a semicolon, or, failing that, see if we are allowed to
  // pretend that there is a semicolon at this position.

  function semicolon() {
    if (!eat(_semi) && !canInsertSemicolon()) unexpected();
  }

  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error.

  function expect(type) {
    if (tokType === type) next();
    else unexpected();
  }

  // Raise an unexpected token error.

  function unexpected() {
    raise(tokStart, "Unexpected token");
  }

  // Verify that a node is an lval â€” something that can be assigned
  // to.

  function checkLVal(expr) {
    if (expr.type !== "Identifier" && expr.type !== "MemberExpression")
      raise(expr.start, "Assigning to rvalue");
    if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name))
      raise(expr.start, "Assigning to " + expr.name + " in strict mode");
  }

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  function parseTopLevel(program) {
    lastStart = lastEnd = tokPos;
    if (options.locations) lastEndLoc = new line_loc_t;
    inFunction = strict = null;
    labels = [];
    readToken();

    var node = program || startNode(), first = true;
    if (!program) node.body = [];
    while (tokType !== _eof) {
      var stmt = parseStatement();
      node.body.push(stmt);
      if (first && isUseStrict(stmt)) setStrict(true);
      first = false;
    }
    return finishNode(node, "Program");
  }

  var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo);`, where looking at the previous token
  // does not help.

  function parseStatement() {
    if (tokType === _slash)
      readToken(true);

    var starttype = tokType, node = startNode();

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {
    case _break: case _continue:
      next();
      var isBreak = starttype === _break;
      if (eat(_semi) || canInsertSemicolon()) node.label = null;
      else if (tokType !== _name) unexpected();
      else {
        node.label = parseIdent();
        semicolon();
      }

      // Verify that there is an actual destination to break or
      // continue to.
      for (var i = 0; i < labels.length; ++i) {
        var lab = labels[i];
        if (node.label == null || lab.name === node.label.name) {
          if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
          if (node.label && isBreak) break;
        }
      }
      if (i === labels.length) raise(node.start, "Unsyntactic " + starttype.keyword);
      return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

    case _debugger:
      next();
      semicolon();
      return finishNode(node, "DebuggerStatement");

    case _do:
      next();
      labels.push(loopLabel);
      node.body = parseStatement();
      labels.pop();
      expect(_while);
      node.test = parseParenExpression();
      semicolon();
      return finishNode(node, "DoWhileStatement");

      // Disambiguating between a `for` and a `for`/`in` loop is
      // non-trivial. Basically, we have to parse the init `var`
      // statement or expression, disallowing the `in` operator (see
      // the second parameter to `parseExpression`), and then check
      // whether the next token is `in`. When there is no init part
      // (semicolon immediately after the opening parenthesis), it is
      // a regular `for` loop.

    case _for:
      next();
      labels.push(loopLabel);
      expect(_parenL);
      if (tokType === _semi) return parseFor(node, null);
      if (tokType === _var) {
        var init = startNode();
        next();
        parseVar(init, true);
        if (init.declarations.length === 1 && eat(_in))
          return parseForIn(node, init);
        return parseFor(node, init);
      }
      var init = parseExpression(false, true);
      if (eat(_in)) {checkLVal(init); return parseForIn(node, init);}
      return parseFor(node, init);

    case _function:
      next();
      return parseFunction(node, true);

    case _if:
      next();
      node.test = parseParenExpression();
      node.consequent = parseStatement();
      node.alternate = eat(_else) ? parseStatement() : null;
      return finishNode(node, "IfStatement");

    case _return:
      if (!inFunction) raise(tokStart, "'return' outside of function");
      next();

      // In `return` (and `break`/`continue`), the keywords with
      // optional arguments, we eagerly look for a semicolon or the
      // possibility to insert one.
      
      if (eat(_semi) || canInsertSemicolon()) node.argument = null;
      else { node.argument = parseExpression(); semicolon(); }
      return finishNode(node, "ReturnStatement");

    case _switch:
      next();
      node.discriminant = parseParenExpression();
      node.cases = [];
      expect(_braceL);
      labels.push(switchLabel);

      // Statements under must be grouped (by label) in SwitchCase
      // nodes. `cur` is used to keep the node that we are currently
      // adding statements to.
      
      for (var cur, sawDefault; tokType != _braceR;) {
        if (tokType === _case || tokType === _default) {
          var isCase = tokType === _case;
          if (cur) finishNode(cur, "SwitchCase");
          node.cases.push(cur = startNode());
          cur.consequent = [];
          next();
          if (isCase) cur.test = parseExpression();
          else {
            if (sawDefault) raise(lastStart, "Multiple default clauses"); sawDefault = true;
            cur.test = null;
          }
          expect(_colon);
        } else {
          if (!cur) unexpected();
          cur.consequent.push(parseStatement());
        }
      }
      if (cur) finishNode(cur, "SwitchCase");
      next(); // Closing brace
      labels.pop();
      return finishNode(node, "SwitchStatement");

    case _throw:
      next();
      if (newline.test(input.slice(lastEnd, tokStart)))
        raise(lastEnd, "Illegal newline after throw");
      node.argument = parseExpression();
      semicolon();
      return finishNode(node, "ThrowStatement");

    case _try:
      next();
      node.block = parseBlock();
      node.handler = null;
      if (tokType === _catch) {
        var clause = startNode();
        next();
        expect(_parenL);
        clause.param = parseIdent();
        if (strict && isStrictBadIdWord(clause.param.name))
          raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
        expect(_parenR);
        clause.guard = null;
        clause.body = parseBlock();
        node.handler = finishNode(clause, "CatchClause");
      }
      node.finalizer = eat(_finally) ? parseBlock() : null;
      if (!node.handler && !node.finalizer)
        raise(node.start, "Missing catch or finally clause");
      return finishNode(node, "TryStatement");

    case _var:
      next();
      node = parseVar(node);
      semicolon();
      return node;

    case _while:
      next();
      node.test = parseParenExpression();
      labels.push(loopLabel);
      node.body = parseStatement();
      labels.pop();
      return finishNode(node, "WhileStatement");

    case _with:
      if (strict) raise(tokStart, "'with' in strict mode");
      next();
      node.object = parseParenExpression();
      node.body = parseStatement();
      return finishNode(node, "WithStatement");

    case _braceL:
      return parseBlock();

    case _semi:
      next();
      return finishNode(node, "EmptyStatement");

      // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.

    default:
      var maybeName = tokVal, expr = parseExpression();
      if (starttype === _name && expr.type === "Identifier" && eat(_colon)) {
        for (var i = 0; i < labels.length; ++i)
          if (labels[i].name === maybeName) raise(expr.start, "Label '" + maybeName + "' is already declared");
        var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
        labels.push({name: maybeName, kind: kind});
        node.body = parseStatement();
        labels.pop();
        node.label = expr;
        return finishNode(node, "LabeledStatement");
      } else {
        node.expression = expr;
        semicolon();
        return finishNode(node, "ExpressionStatement");
      }
    }
  }

  // Used for constructs like `switch` and `if` that insist on
  // parentheses around their expression.

  function parseParenExpression() {
    expect(_parenL);
    var val = parseExpression();
    expect(_parenR);
    return val;
  }

  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowStrict` is true (used for
  // function bodies).

  function parseBlock(allowStrict) {
    var node = startNode(), first = true, strict = false, oldStrict;
    node.body = [];
    expect(_braceL);
    while (!eat(_braceR)) {
      var stmt = parseStatement();
      node.body.push(stmt);
      if (first && isUseStrict(stmt)) {
        oldStrict = strict;
        setStrict(strict = true);
      }
      first = false
    }
    if (strict && !oldStrict) setStrict(false);
    return finishNode(node, "BlockStatement");
  }

  // Parse a regular `for` loop. The disambiguation code in
  // `parseStatement` will already have parsed the init statement or
  // expression.

  function parseFor(node, init) {
    node.init = init;
    expect(_semi);
    node.test = tokType === _semi ? null : parseExpression();
    expect(_semi);
    node.update = tokType === _parenR ? null : parseExpression();
    expect(_parenR);
    node.body = parseStatement();
    labels.pop();
    return finishNode(node, "ForStatement");
  }

  // Parse a `for`/`in` loop.

  function parseForIn(node, init) {
    node.left = init;
    node.right = parseExpression();
    expect(_parenR);
    node.body = parseStatement();
    labels.pop();
    return finishNode(node, "ForInStatement");
  }

  // Parse a list of variable declarations.

  function parseVar(node, noIn) {
    node.declarations = [];
    node.kind = "var";
    for (;;) {
      var decl = startNode();
      decl.id = parseIdent();
      if (strict && isStrictBadIdWord(decl.id.name))
        raise(decl.id.start, "Binding " + decl.id.name + " in strict mode");
      decl.init = eat(_eq) ? parseExpression(true, noIn) : null;
      node.declarations.push(finishNode(decl, "VariableDeclarator"));
      if (!eat(_comma)) break;
    }
    return finishNode(node, "VariableDeclaration");
  }

  // ### Expression parsing

  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function(s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.

  // Parse a full expression. The arguments are used to forbid comma
  // sequences (in argument lists, array literals, or object literals)
  // or the `in` operator (in for loops initalization expressions).

  function parseExpression(noComma, noIn) {
    var expr = parseMaybeAssign(noIn);
    if (!noComma && tokType === _comma) {
      var node = startNodeFrom(expr);
      node.expressions = [expr];
      while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
      return finishNode(node, "SequenceExpression");
    }
    return expr;
  }

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.

  function parseMaybeAssign(noIn) {
    var left = parseMaybeConditional(noIn);
    if (tokType.isAssign) {
      var node = startNodeFrom(left);
      node.operator = tokVal;
      node.left = left;
      next();
      node.right = parseMaybeAssign(noIn);
      checkLVal(left);
      return finishNode(node, "AssignmentExpression");
    }
    return left;
  }

  // Parse a ternary conditional (`?:`) operator.

  function parseMaybeConditional(noIn) {
    var expr = parseExprOps(noIn);
    if (eat(_question)) {
      var node = startNodeFrom(expr);
      node.test = expr;
      node.consequent = parseExpression(true);
      expect(_colon);
      node.alternate = parseExpression(true, noIn);
      return finishNode(node, "ConditionalExpression");
    }
    return expr;
  }

  // Start the precedence parser.

  function parseExprOps(noIn) {
    return parseExprOp(parseMaybeUnary(noIn), -1, noIn);
  }

  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.

  function parseExprOp(left, minPrec, noIn) {
    var prec = tokType.binop;
    if (prec != null && (!noIn || tokType !== _in)) {
      if (prec > minPrec) {
        var node = startNodeFrom(left);
        node.left = left;
        node.operator = tokVal;
        next();
        node.right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
        var node = finishNode(node, /&&|\|\|/.test(node.operator) ? "LogicalExpression" : "BinaryExpression");
        return parseExprOp(node, minPrec, noIn);
      }
    }
    return left;
  }

  // Parse unary operators, both prefix and postfix.

  function parseMaybeUnary(noIn) {
    if (tokType.prefix) {
      var node = startNode(), update = tokType.isUpdate;
      node.operator = tokVal;
      node.prefix = true;
      next();
      node.argument = parseMaybeUnary(noIn);
      if (update) checkLVal(node.argument);
      else if (strict && node.operator === "delete" &&
               node.argument.type === "Identifier")
        raise(node.start, "Deleting local variable in strict mode");
      return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
    }
    var expr = parseExprSubscripts();
    while (tokType.postfix && !canInsertSemicolon()) {
      var node = startNodeFrom(expr);
      node.operator = tokVal;
      node.prefix = false;
      node.argument = expr;
      checkLVal(expr);
      next();
      expr = finishNode(node, "UpdateExpression");
    }
    return expr;
  }

  // Parse call, dot, and `[]`-subscript expressions.

  function parseExprSubscripts() {
    return parseSubscripts(parseExprAtom());
  }

  function parseSubscripts(base, noCalls) {
    if (eat(_dot)) {
      var node = startNodeFrom(base);
      node.object = base;
      node.property = parseIdent(true);
      node.computed = false;
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (eat(_bracketL)) {
      var node = startNodeFrom(base);
      node.object = base;
      node.property = parseExpression();
      node.computed = true;
      expect(_bracketR);
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (!noCalls && eat(_parenL)) {
      var node = startNodeFrom(base);
      node.callee = base;
      node.arguments = parseExprList(_parenR, false);
      return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
    } else return base;
  }

  // Parse an atomic expression â€” either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  function parseExprAtom() {
    switch (tokType) {
    case _this:
      var node = startNode();
      next();
      return finishNode(node, "ThisExpression");
    case _name:
      return parseIdent();
    case _num: case _string: case _regexp:
      var node = startNode();
      node.value = tokVal;
      node.raw = input.slice(tokStart, tokEnd);
      next();
      return finishNode(node, "Literal");

    case _null: case _true: case _false:
      var node = startNode();
      node.value = tokType.atomValue;
      node.raw = tokType.keyword
      next();
      return finishNode(node, "Literal");

    case _parenL:
      var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;
      next();
      var val = parseExpression();
      val.start = tokStart1;
      val.end = tokEnd;
      if (options.locations) {
        val.loc.start = tokStartLoc1;
        val.loc.end = tokEndLoc;
      }
      if (options.ranges)
        val.range = [tokStart1, tokEnd];
      expect(_parenR);
      return val;

    case _bracketL:
      var node = startNode();
      next();
      node.elements = parseExprList(_bracketR, true, true);
      return finishNode(node, "ArrayExpression");

    case _braceL:
      return parseObj();

    case _function:
      var node = startNode();
      next();
      return parseFunction(node, false);

    case _new:
      return parseNew();

    default:
      unexpected();
    }
  }

  // New's precedence is slightly tricky. It must allow its argument
  // to be a `[]` or dot subscript expression, but not a call â€” at
  // least, not without wrapping it in parentheses. Thus, it uses the 

  function parseNew() {
    var node = startNode();
    next();
    node.callee = parseSubscripts(parseExprAtom(), true);
    if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
    else node.arguments = [];
    return finishNode(node, "NewExpression");
  }

  // Parse an object literal.

  function parseObj() {
    var node = startNode(), first = true, sawGetSet = false;
    node.properties = [];
    next();
    while (!eat(_braceR)) {
      if (!first) {
        expect(_comma);
        if (options.allowTrailingCommas && eat(_braceR)) break;
      } else first = false;

      var prop = {key: parsePropertyName()}, isGetSet = false, kind;
      if (eat(_colon)) {
        prop.value = parseExpression(true);
        kind = prop.kind = "init";
      } else if (options.ecmaVersion >= 5 && prop.key.type === "Identifier" &&
                 (prop.key.name === "get" || prop.key.name === "set")) {
        isGetSet = sawGetSet = true;
        kind = prop.kind = prop.key.name;
        prop.key = parsePropertyName();
        if (tokType !== _parenL) unexpected();
        prop.value = parseFunction(startNode(), false);
      } else unexpected();

      // getters and setters are not allowed to clash â€” either with
      // each other or with an init property â€” and in strict mode,
      // init properties are also not allowed to be repeated.

      if (prop.key.type === "Identifier" && (strict || sawGetSet)) {
        for (var i = 0; i < node.properties.length; ++i) {
          var other = node.properties[i];
          if (other.key.name === prop.key.name) {
            var conflict = kind == other.kind || isGetSet && other.kind === "init" ||
              kind === "init" && (other.kind === "get" || other.kind === "set");
            if (conflict && !strict && kind === "init" && other.kind === "init") conflict = false;
            if (conflict) raise(prop.key.start, "Redefinition of property");
          }
        }
      }
      node.properties.push(prop);
    }
    return finishNode(node, "ObjectExpression");
  }

  function parsePropertyName() {
    if (tokType === _num || tokType === _string) return parseExprAtom();
    return parseIdent(true);
  }

  // Parse a function declaration or literal (depending on the
  // `isStatement` parameter).

  function parseFunction(node, isStatement) {
    if (tokType === _name) node.id = parseIdent();
    else if (isStatement) unexpected();
    else node.id = null;
    node.params = [];
    var first = true;
    expect(_parenL);
    while (!eat(_parenR)) {
      if (!first) expect(_comma); else first = false;
      node.params.push(parseIdent());
    }

    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldInFunc = inFunction, oldLabels = labels;
    inFunction = true; labels = [];
    node.body = parseBlock(true);
    inFunction = oldInFunc; labels = oldLabels;

    // If this is a strict mode function, verify that argument names
    // are not repeated, and it does not try to bind the words `eval`
    // or `arguments`.
    if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {
      for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {
        var id = i < 0 ? node.id : node.params[i];
        if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name))
          raise(id.start, "Defining '" + id.name + "' in strict mode");
        if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name)
          raise(id.start, "Argument name clash in strict mode");
      }
    }

    return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
  }

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  function parseExprList(close, allowTrailingComma, allowEmpty) {
    var elts = [], first = true;
    while (!eat(close)) {
      if (!first) {
        expect(_comma);
        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
      } else first = false;

      if (allowEmpty && tokType === _comma) elts.push(null);
      else elts.push(parseExpression(true));
    }
    return elts;
  }

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  function parseIdent(liberal) {
    var node = startNode();
    node.name = tokType === _name ? tokVal : (liberal && !options.forbidReserved && tokType.keyword) || unexpected();
    next();
    return finishNode(node, "Identifier");
  }

});

(function (global) {
    if (typeof window === "undefined") {
        window = this;
    }
    //$data = window["$data"] || (window["$data"] = {});
    $data = window["$data"] || (window["$data"] = (function _data_handler() {
        //console.log("@@@@", this);
        if (this instanceof _data_handler) {
            //console.log(
            var type = _data_handler["implementation"].apply(this, arguments);
            return new type(arguments[1]);
        } else {

            return _data_handler["implementation"].apply(this, arguments)
        }
    }));
})(this);

if (typeof console === 'undefined') {
    console = {
        warn: function () { },
        error: function () { },
        log: function () { },
        dir: function () { },
        time: function () { },
        timeEnd: function () { }
    };
}

if (!console.warn) console.warn = function () { };
if (!console.error) console.error = function () { };

(function ($data) {
    ///<summary>
    /// Collection of JayData services
    ///</summary>
    $data.__namespace = true;
    $data.version = "JayData 1.3.2";
    $data.versionNumber = "1.3.2";
    $data.root = {};
    $data.Acorn = $data.Acorn || (typeof acorn == 'object' ? acorn : undefined);
    $data.Esprima = $data.Esprima || (typeof esprima == 'object' ? esprima : undefined);

})($data);

// Do not remove this block, it is used by jsdoc 
/**
    @name $data.Base
    @class base class
*/
Exception = function(message, name, data) {
    Error.call(this);
	if (Error.captureStackTrace)
	    Error.captureStackTrace(this, this.constructor);
    
    this.name = name || "Exception";
    this.message = message;
    this.data = data;

    //this.toString = function() { return JSON.stringify(this); };

}

Exception.prototype.__proto__ = Error.prototype;

Exception.prototype._getStackTrace = function () {
    var callstack = [];
    var isCallstackPopulated = false;
	// unreachable code
    //return;
    /*try {
        i.dont.exist += 0;
    }
    catch (e) {
        if (e.stack) { // Firefox, Chrome
            var lines = e.stack.split('\n');
            for (var i = 0, len = lines.length; i < len; i++) {
                //if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                if (lines[i].indexOf(" at ") >= 0)
                    callstack.push(lines[i]);
            }
            //Remove call to printStackTrace()
            callstack.shift();
            //TODO: Remove call to new Exception( chain
            //callstack.shift();
            isCallstackPopulated = true;
        }
        else if (window.opera && e.message) { //Opera
            var lines = e.message.split('\n');
            for (var i = 0, len = lines.length; i < len; i++) {
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                    var entry = lines[i];
                    //Append next line also since it has the file info
                    if (lines[i + 1]) {
                        entry += ' at ' + lines[i + 1];
                        i++;
                    }
                    callstack.push(entry);
                }
            }
            //Remove call to printStackTrace()
            callstack.shift();
            //TODO: Remove call to new Exception( chain
            //callstack.shift();
            isCallstackPopulated = true;
        }
    }

    //if (!isCallstackPopulated) { //IE and Safari
    //    var currentFunction = arguments.callee.caller;
    //    while (currentFunction) {
    //        var fn = currentFunction.toString();
    //        var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('(')) || 'anonymous';
    //        callstack.push(fname);
    //        if (currentFunction == currentFunction.caller) {
    //            Guard.raise("Infinite loop");
    //        }
    //        currentFunction = currentFunction.caller;
    //    }
    //}
    return callstack.join("\n\r");	 */
};
Guard = {};
Guard.requireValue = function (name, value) {
    if (typeof value === 'undefined' || value === null) {
        Guard.raise(name + " requires a value other than undefined or null");
    }
};

Guard.requireType = function (name, value, typeOrTypes) {
    var types = typeOrTypes instanceof Array ? typeOrTypes : [typeOrTypes];
    return types.some(function (item) {
        switch (typeof item) {
            case "string":
                return typeof value === item;
            case "function":
                return value instanceof item;
            default:
                Guard.raise("Unknown type format : " + typeof item + " for: "+ name);
        }
    });
};

Guard.raise = function(exception){
	if (typeof intellisense === 'undefined') {
		if (exception instanceof Exception){
			console.error(exception.name + ':', exception.message + '\n', exception);
		}else{
			console.error(exception);
		}
		throw exception;
	}
};

Object.isNullOrUndefined = function (value) {
    return value === undefined || value === null;
};
(function ObjectMethodsForPreHTML5Browsers() {

	if (!Object.getOwnPropertyNames){
		Object.getOwnPropertyNames = function(o){
			var names = [];

			for (var i in o){
				if (o.hasOwnProperty(i)) names.push(i);
			}

			return names;
		};
	}

    if (!Object.create) {
        Object.create = function (o) {
            if (arguments.length > 1) {
                Guard.raise(new Error('Object.create implementation only accepts the first parameter.'));
            }
            function F() { }
            F.prototype = o;
            return new F();
        };
    }

    if (!Object.keys) {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = ['toString',
                    'toLocaleString',
                    'valueOf',
                    'hasOwnProperty',
                    'isPrototypeOf',
                    'propertyIsEnumerable',
                    'constructor'],
        dontEnumsLength = dontEnums.length;

        Object.keys = function (obj) {

            ///Refactor to Assert.IsObjectOrFunction
            if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) Guard.raise(new TypeError('Object.keys called on non-object'));

            var result = [];

            for (var prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }

            if (hasDontEnumBug) {
                for (var i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }

            return result;
        };
    }

    if (!Object.defineProperty) {
        Object.defineProperty = function (obj, propName, propDef) {
            obj[propName] = propDef.value || {};
        };
    }

    if (!Object.defineProperties) {
        Object.defineProperties = function (obj, defines) {
            for (var i in defines) {
                if(defines.hasOwnProperty(i))
                    obj[i] = defines[i].value || {};
            }
        };
    }

    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (handler, thisArg) {
            for (var i = 0, l = this.length; i < l; i++) {
                if (thisArg) { handler.call(thisArg, this[i], i, this); }
                else { handler(this[i], i, this); };
            };
        };
    };

    if (!Array.prototype.filter) {
        Array.prototype.filter = function (handler, thisArg) {
            var result = [];
            for (var i = 0, l = this.length; i < l; i++) {
                var r = thisArg ?
                    handler.call(thisArg, this[i], i, this) :
                    handler(this[i], i, this);
                if (r === true) {
                    result.push(this[i]);
                }
            }
            return result;
        };
    }

    if (!Array.prototype.map) {
        Array.prototype.map = function (handler, thisArg) {
            var result = [];
            for (var i = 0, l = this.length; i < l; i++) {
                var r = thisArg ?
                    handler.call(thisArg, this[i], i, this) :
                    handler(this[i], i, this);
                result.push(r);
            }
            return result;
        };
    }

    if (!Array.prototype.some) {
        Array.prototype.some = function (handler, thisArg) {
            for (var i = 0, l = this.length; i < l; i++) {
                var r = thisArg ?
                    handler.call(thisArg, this[i], i, this) :
                    handler(this[i], i, this);
                if (r) { return true; }

            }
            return false;
        };
    }

    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (item, from) {
            for (var i = 0, l = this.length; i < l; i++) {
                if (this[i] === item) {
                    return i;
                };
            };
            return -1;
        };
    }

    if (!String.prototype.trimLeft) {
        String.prototype.trimLeft = function () {
            return this.replace(/^\s+/, "");
        }
    }

    if (!String.prototype.trimRight) {
        String.prototype.trimRight = function () {
            return this.replace(/\s+$/, "");
        }
    }

    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== "function") {
                // closest thing possible to the ECMAScript 5 internal IsCallable function
                throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () { },
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis
                                           ? this
                                           : oThis,
                                         aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }
    
    if (typeof Uint8Array == 'undefined'){
        Uint8Array = function(v){
            if (v instanceof Uint8Array) return v;
            var self = this;
            var buffer = Array.isArray(v) ? v : new Array(v);
            this.length = buffer.length;
            this.byteLength = this.length;
            this.byteOffset = 0;
            this.buffer = { byteLength: self.length };
            var getter = function(index){
                return buffer[index];
            };
            var setter = function(index, value){
                buffer[index] = (value | 0) & 0xff;
            };
            var makeAccessor = function(i){
                buffer[i] = buffer[i] || 0;
                Object.defineProperty(self, i, {
                    enumerable: true,
                    configurable: false,
                    get: function(){
                        if (isNaN(+i) || ((i | 0) < 0 || (i | 0) >= self.length)){
                            try{
                                if (typeof document != 'undefined') document.createTextNode("").splitText(1);
                                return new RangeError("INDEX_SIZE_ERR");
                            }catch(e){
                                return e;
                            }
                        }
                        return getter(i);
                    },
                    set: function(v){
                        if (isNaN(+i) || ((i | 0) < 0 || (i | 0) >= self.length)){
                            try{
                                if (typeof document != 'undefined') document.createTextNode("").splitText(1);
                                return new RangeError("INDEX_SIZE_ERR");
                            }catch(e){
                                return e;
                            }
                        }
                        setter(i | 0, v);
                    }
                });
            };
            for (var i = 0; i < self.length; i++){
                makeAccessor(i);
            }
        };
    }

})();
(function init($data, global) {

    function il(msg) {
        if (typeof intellisense !== 'undefined') {
            if (!intellisense.i) {
                intellisense.i = 0;
            }
            intellisense.i = intellisense.i + 1;
            intellisense.logMessage(msg + ":" + intellisense.i);
        }
    }

    function MemberDefinition(memberDefinitionData, definedClass) {

        ///<field name="name" type="String">*</field>
        ///<field name="dataType" type="Object">*</field>
        ///<field name="elementType" type="Object"></field>
        ///<field name="kind" type="String" />
        ///<field name="classMember" type="Boolean" />
        ///<field name="set" type="Function" />
        ///<field name="get" type="Function" />
        ///<field name="value" type="Object" />
        ///<field name="initialValue" type="Object" />
        ///<field name="method" type="Function" />
        ///<field name="enumerable" type="Boolean" />
        ///<field name="configurable" type="Boolean" />
        ///<field name="key" type="Boolean" />
        ///<field name="computed" type="Boolean" />
        ///<field name="storeOnObject" type="Boolean">[false] if false value is stored in initData, otherwise on the object</field>
        ///<field name="monitorChanges" type="Boolean">[true] if set to false propertyChange events are not raise and property tracking is disabled</field>

        this.kind = MemberTypes.property;
        //this.definedBy = definedClass;
        Object.defineProperty(this, 'definedBy', { value: definedClass, enumerable: false, configurable: false, writable: false });
        if (memberDefinitionData) {
            if (typeof memberDefinitionData === 'function' || typeof memberDefinitionData.asFunction === 'function') {
                this.method = memberDefinitionData;
                this.kind = MemberTypes.method;
            } else {
                this.enumerable = true;
                this.configurable = true;
                if (typeof memberDefinitionData === "number") {
                    this.value = memberDefinitionData;
                    this.type = $data.Number;
                    this.dataType = $data.Number;
                } else if (typeof memberDefinitionData === "string") {
                    this.value = memberDefinitionData;
                    this.dataType = $data.String;
                    this.type = $data.String;
                } else {
                    for (var item in memberDefinitionData) {
                        if (memberDefinitionData.hasOwnProperty(item)) {
                            this[item] = memberDefinitionData[item];
                        }
                    }
                }
            }
            if (this.type !== undefined) {
                this.dataType = this.dataType || this.type;
            } else {
                this.type = this.dataType;
            }

            this.originalType = this.type;
            if (this.elementType !== undefined) {
                this.originalElementType = this.elementType;
            }
        }
    }
    MemberDefinition.prototype.createPropertyDescriptor = function (classFunction, value) {
        ///<returns type="Object" />
        var pd = this;
        var result = {
            enumerable: this.enumerable == undefined ? true : this.enumerable,
            configurable: this.configurable == undefined ? true : this.configurable
        };
        if (this.set && this.get) {
            result.set = this.set;
            result.get = this.get;
        } else if ("value" in this || value) {
            result.value = value || this.value;
            //TODO
            //result.writable = this.writable;
            result.writable = true;
        }
        else {
            result.set = function (value) { this.storeProperty(pd, value); };
            result.get = function () { return this.retrieveProperty(pd); };
        }
        return result;
    };
    MemberDefinition.prototype.createStorePropertyDescriptor = function (value) {
        var pd = this;
        return { enumerable: false, writable: true, configurable: pd.configurable, value: value };
    };
    MemberDefinition.prototype.createGetMethod = function () {
        var pd = this;
        return {
            enumerable: false, writable: false, configurable: false,
            value: function (callback, tran) { return this.getProperty(pd, callback, tran); }
        };
    };
    MemberDefinition.prototype.createSetMethod = function () {
        var pd = this;
        return {
            enumerable: false, writable: false, configurable: false,
            value: function (value, callback, tran) { return this.setProperty(pd, value, callback, tran); }
        };
    };
    MemberDefinition.translateDefinition = function (memDef, name, classFunction) {
        var holder = classFunction;
        var memberDefinition;
        
        if (memDef.type && Container.isTypeRegistered(memDef.type)) {
            holder = Container.resolveType(memDef.type);
            if (typeof holder.translateDefinition === 'function') {
                memberDefinition = holder.translateDefinition.apply(holder, arguments);
                memberDefinition.name = memberDefinition.name || name;
            } else {
                holder = classFunction;
            }
        }


        if (!(memberDefinition instanceof MemberDefinition)) {
            memberDefinition = new MemberDefinition(memberDefinition || memDef, holder);
            memberDefinition.name = name;
        }
        classFunction.resolverThunks = classFunction.resolverThunks || [];
        classFunction.childResolverThunks = classFunction.childResolverThunks || [];


        var t = memberDefinition.type;
        var et = memberDefinition.elementType;

        function addChildThunk(referencedType) {
            if (referencedType && referencedType.isAssignableTo && $data.Entity && referencedType.isAssignableTo($data.Entity)) {
                classFunction.childResolverThunks.push(function () {
                    if (referencedType.resolveForwardDeclarations) {
                        referencedType.resolveForwardDeclarations();
                    }
                });
            }
        }

        addChildThunk(t);
        addChildThunk(et);

        if ("string" === typeof t) {
            if ("@" === t[0]) {
                memberDefinition.type = t.substr(1);
                memberDefinition.dataType = t.substr(1);
            } else {
                //forward declared types get this callback when type is registered
                classFunction.resolverThunks.push(function () {
                    var rt = classFunction.container.resolveType(t);
                    addChildThunk(rt);
                    memberDefinition.type = rt;
                    memberDefinition.dataType = rt;
                });
            }
        }

        if (et) {
            if ("string" === typeof et) {
                if ("@" === et[0]) {
                    memberDefinition.elementType = et.substr(1);
                } else {
                    //forward declared types get this callback when type is registered
                    classFunction.resolverThunks.push(function () {
                        var rt = classFunction.container.resolveType(et);
                        addChildThunk(rt);
                        memberDefinition.elementType = rt;
                    });

                }
            }
        }


        //if (!classFunction)

        classFunction.resolveForwardDeclarations = function () {
            classFunction.resolveForwardDeclarations = function () { };
            $data.Trace.log("resolving: " + classFunction.fullName);
            this.resolverThunks.forEach(function (thunk) {
                thunk();
            });
            //this.resolverThunks = [];
            this.childResolverThunks.forEach(function (thunk) {
                thunk();
            });
            //this.childResolverThunks = [];
        }

        return memberDefinition;
    };

    MemberDefinition.prototype.toJSON = function () {
        var alma = {};
        for (var name in this) {
            if (name !== 'defineBy' && name !== 'storageModel') {
                alma[name] = this[name];
            }
        }
        return alma;
    }

    //TODO global/window
    $data.MemberDefinition = window["MemberDefinition"] = MemberDefinition;

    var memberDefinitionPrefix = '$';
    function MemberDefinitionCollection() { };
    MemberDefinitionCollection.prototype = {
        clearCache: function () {
            this.arrayCache = undefined;
            this.pubMapPropsCache = undefined;
            this.keyPropsCache = undefined;
            this.propByTypeCache = undefined;
            this.pubMapMethodsCache = undefined;
            this.pubMapPropNamesCache = undefined;
        },
        asArray: function () {
            if (!this.arrayCache) {
                this.arrayCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0)
                        this.arrayCache.push(this[i]);
                }
            }
            return this.arrayCache;
        },
        getPublicMappedProperties: function () {
            if (!this.pubMapPropsCache) {
                this.pubMapPropsCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && !this[i].notMapped && this[i].enumerable)
                        this.pubMapPropsCache.push(this[i]);
                }
            }
            return this.pubMapPropsCache;// || (this.pubMapPropsCache = this.asArray().filter(function (m) { return m.kind == 'property' && !m.notMapped && m.enumerable; }));
        },
        getPublicMappedPropertyNames: function () {
            if (!this.pubMapPropNamesCache) {
                this.pubMapPropNamesCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && !this[i].notMapped && this[i].enumerable)
                        this.pubMapPropNamesCache.push(this[i].name);
                }
            }
            return this.pubMapPropNamesCache;
        },
        getKeyProperties: function () {
            if (!this.keyPropsCache) {
                this.keyPropsCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'property' && this[i].key)
                        this.keyPropsCache.push(this[i]);
                }
            }
            return this.keyPropsCache;
            //return this.keyPropsCache || (this.keyPropsCache = this.asArray().filter(function (m) { return m.kind == 'property' && m.key; }));
        },
        getPublicMappedMethods: function () {
            if (!this.pubMapMethodsCache) {
                this.pubMapMethodsCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].kind == 'method' && this[i].method/* && this.hasOwnProperty(i)*/)
                        this.pubMapMethodsCache.push(this[i]);
                }
            }
            return this.pubMapMethodsCache;
        },
        getPropertyByType: function (type) {
            if (!this.propByTypeCache) {
                this.propByTypeCache = [];
                for (var i in this) {
                    if (i.indexOf(memberDefinitionPrefix) === 0 && this[i].dataType == type)
                        this.propByTypeCache.push(this[i]);
                }
            }
            return this.propByTypeCache;
            //return this.propByTypeCache || (this.propByTypeCache = this.asArray().filter(function (m) { return m.dataType == type; }));
        },
        getMember: function (name) { return this[memberDefinitionPrefix + name]; },
        setMember: function (value) { this[memberDefinitionPrefix + value.name] = value; }
    };
    MemberDefinitionCollection.prototype.constructor = MemberDefinitionCollection;
    $data.MemberDefinitionCollection = window["MemberDefinitionCollection"] = MemberDefinitionCollection;

    function ClassEngineBase() {
        this.classNames = {};
    }

    function MemberTypes() {
        ///<field name="method" type="string" />
        ///<field name="property" type="string" />
        ///<field name="field" type="string" />
        ///<field name="complexProperty" type="string" />
    }
    MemberTypes.__enum = true;

    MemberTypes.method = "method";
    MemberTypes.property = "property";
    MemberTypes.navProperty = "navProperty";
    MemberTypes.complexProperty = "complexProperty";
    MemberTypes.field = "field";

    $data.MemberTypes = MemberTypes;

    //function classToJSON() {
    //    var ret = {};
    //    for (var i in this) {
    //        if (this.hasOwnProperty(i)) {
    //            ret[i] = this[i];
    //        }
    //    }
    //    return ret;
    //}
    //$data.Base.toJSON = classToJSON;

    ClassEngineBase.prototype = {

        //getClass: function (classReference) {
        //},

        //getProperties: function (classFunction) {
        //    return classFunction.propertyDefinitions;
        //},

        define: function (className, baseClass, container, instanceDefinition, classDefinition) {
            /// <signature>
            ///     <summary>Creates a Jaydata type</summary>
            ///     <param name="className" type="String">Name of the class</param>
            ///     <param name="baseClass" type="Function">Basetype of the class</param>
            ///     <param name="interfaces" type="Object" elementType="Function" />
            ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
            ///     <param name="classDefinition" type="Object">Class static definition</param>
            ///     <example>
            ///         
            ///         var t = new $data.Class.define('Types.A', $data.Base, null, {
            ///             constructor: function(){ },
            ///             func1: function(){ },
            ///             member1: { type: 'string' }
            ///         }, { 
            ///             staticFunc1: function() {}    
            ///         })
            ///         
            ///     </example>
            /// </signature>

            return this.defineEx(className, [{ type: baseClass }], container, instanceDefinition, classDefinition);
        },
        defineEx: function (className, baseClasses, container, instanceDefinition, classDefinition) {
            /// <signature>
            ///     <summary>Creates a Jaydata type</summary>
            ///     <param name="className" type="String">Name of the class</param>
            ///     <param name="baseClasses" type="Array" elementType="Functions">Basetypes of the class. First is a real base, others are mixins</param>
            ///     <param name="interfaces" type="Object" elementType="Function" />
            ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
            ///     <param name="classDefinition" type="Object">Class static definition</param>
            ///     <example>
            ///         
            ///         var t = new $data.Class.define('Types.A', [$data.Base, $data.Mixin1, $data.Mixin2], null, {
            ///             constructor: function(){ },
            ///             func1: function(){ },
            ///             member1: { type: 'string' }
            ///         }, { 
            ///             staticFunc1: function() {}    
            ///         })
            ///         
            ///     </example>
            /// </signature>
            /// <signature>
            ///     <summary>Creates a Jaydata type</summary>
            ///     <param name="className" type="String">Name of the class</param>
            ///     <param name="baseClasses" type="Array" elementType="Object">Basetypes of the class. First is a real base, others are mixins or propagations</param>
            ///     <param name="interfaces" type="Object" elementType="Function" />
            ///     <param name="instanceDefinition" type="Object">Class definition (properties, methods, etc)</param>
            ///     <param name="classDefinition" type="Object">Class static definition</param>
            ///     <example>
            ///         
            ///         var t = new $data.Class.define('Types.A', [
            ///                         { type: $data.Base, params: [1, 'secondParameterValue', new ConstructorParameter(0)] },
            ///                         { type: $data.Mixin1, },
            ///                         { type: $data.Mixin2, },
            ///                         { type: $data.Propagation1, params: [new ConstructorParameter(1)], propagateTo:'Propagation1' },
            ///                         { type: $data.Propagation2, params: ['firstParameterValue'], propagateTo:'Propagation2' }
            ///                     ], null, {
            ///             constructor: function(){ },
            ///             func1: function(){ },
            ///             member1: { type: 'string' }
            ///         }, { 
            ///             staticFunc1: function() {}    
            ///         })
            ///         
            ///     </example>
            /// </signature>

            container = container || $data.Container;

            if (baseClasses.length == 0) {
                baseClasses.push({ type: $data.Base });
            } else if (baseClasses.length > 0 && !baseClasses[0].type) {
                baseClasses[0].type = $data.Base;
            }
            for (var i = 0, l = baseClasses.length; i < l; i++) {
                if (typeof baseClasses[i] === 'function')
                    baseClasses[i] = { type: baseClasses[i] };
            }

            var providedCtor = instanceDefinition ? instanceDefinition.constructor : undefined;

            var classNameParts = className.split('.');
            var shortClassName = classNameParts.splice(classNameParts.length - 1, 1)[0];

            var root = container === $data.Container ? window : container;
            for (var i = 0; i < classNameParts.length; i++) {
                var part = classNameParts[i];
                if (!root[part]) {
                    var ns = {};
                    ns.__namespace = true;
                    root[part] = ns;
                }
                root = root[part];
            }


            var classFunction = null;
            classFunction = this.classFunctionBuilder(shortClassName, baseClasses, classDefinition, instanceDefinition);
            classFunction.fullName = className;
            classFunction.namespace = classNameParts.join('.'); //classname splitted
            classFunction.name = shortClassName;
            classFunction.container = container;
            classFunction.container.registerType(className, classFunction);

            this.buildType(classFunction, baseClasses, instanceDefinition, classDefinition);



            if (typeof intellisense !== 'undefined') {
                if (instanceDefinition && instanceDefinition.constructor) {
                    intellisense.annotate(classFunction, instanceDefinition.constructor);
                }
            }

            root[shortClassName] = this.classNames[className] = classFunction;
            //classFunction.toJSON = classToJSON;
            var baseCount = classFunction.baseTypes.length;
            for (var i = 0; i < baseCount; i++) {
                var b = classFunction.baseTypes[i];
                if ("inheritedTypeProcessor" in b) {
                    b.inheritedTypeProcessor(classFunction);
                }
            }
            //classFunction.prototype.constructor = instanceDefinition.constructor;
            //classFunction.constructor = instanceDefinition.constructor;
            //classFunction.toJSON = function () { return classFunction.memberDefinitions.filter( function(md) { return md; };
            return classFunction;
        },
        classFunctionBuilder: function (name, base, classDefinition, instanceDefinition) {
            var body = this.bodyBuilder(base, classDefinition, instanceDefinition);
            return new Function('base', 'classDefinition', 'instanceDefinition', 'name', 'return function ' + name + ' (){ ' +
                body + ' \n}; ')(base, classDefinition, instanceDefinition, name);
        },
        bodyBuilder: function (bases, classDefinition, instanceDefinition) {
            var mixin = '';
            var body = '';
            var propagation = '';

            for (var i = 0, l = bases.length; i < l; i++) {
                var base = bases[i];
                var index = i;
                if (index == 0) { //ctor func
                    if (base && base.type && base.type !== $data.Base && base.type.fullName) {
                        body += '    var baseArguments = $data.typeSystem.createCtorParams(arguments, base[' + index + '].params, this); \n';
                        body += '    ' + base.type.fullName + '.apply(this, baseArguments); \n';
                    }
                } else {
                    if (base && base.type && base.propagateTo) {
                        //propagation
                        propagation += '    ' + (!propagation ? 'var ' : '' + '') + 'propagationArguments = $data.typeSystem.createCtorParams(arguments, base[' + index + '].params, this); \n';
                        propagation += '    this["' + base.propagateTo + '"] =  Object.create(' + base.type.fullName + '.prototype); \n' +
                                       '    ' + base.type.fullName + '.apply(this["' + base.propagateTo + '"], propagationArguments); \n';
                    }
                    else if (base && base.type && base.type.memberDefinitions && base.type.memberDefinitions.$constructor && !base.propagateTo) {
                        //mixin
                        mixin += '    ' + base.type.fullName + '.memberDefinitions.$constructor.method.apply(this); \n';
                    }
                }
            }
            if (instanceDefinition && instanceDefinition.constructor != Object)
                body += "    instanceDefinition.constructor.apply(this, arguments); \n";

            return '\n    //mixins \n' + mixin + '\n    //construction \n' + body + '\n    //propagations \n' + propagation;
        },

        buildType: function (classFunction, baseClasses, instanceDefinition, classDefinition) {
            var baseClass = baseClasses[0].type;
            classFunction.inheritsFrom = baseClass;

            if (baseClass) {
                classFunction.prototype = Object.create(baseClass.prototype);
                classFunction.memberDefinitions = Object.create(baseClass.memberDefinitions || new MemberDefinitionCollection());
                classFunction.memberDefinitions.clearCache();

                var staticDefs = baseClass.staticDefinitions;
                if (staticDefs) {
                    staticDefs = staticDefs.asArray();
                    if (staticDefs) {
                        for (var i = 0; i < staticDefs.length; i++) {
                            this.buildMember(classFunction, staticDefs[i], undefined, 'staticDefinitions');
                        }
                    }
                }
                classFunction.baseTypes = baseClass.baseTypes ? [].concat(baseClass.baseTypes) : [];
                for (var i = 0; i < baseClasses.length; i++) {
                    classFunction.baseTypes.push(baseClasses[i].type);
                }
                //classFunction.baseTypes = (baseClass.baseTypes || []).concat(baseClasses.map(function (base) { return base.type; }));
                if (!classFunction.isAssignableTo) {
                    Object.defineProperty(classFunction, "isAssignableTo", {
                        value: function (type) {
                            return this === type || this.baseTypes.indexOf(type) >= 0;
                        },
                        writable: false,
                        enumerable: false,
                        configurable: false
                    });
                }
            }

            if (classDefinition) {
                this.buildStaticMembers(classFunction, classDefinition);

                if (classDefinition.constructor)
                    classFunction.classConstructor = classDefinition.constructor;
            }

            if (instanceDefinition) {
                this.buildInstanceMembers(classFunction, instanceDefinition);
            }

            var mixins = [].concat(baseClasses);
            mixins.shift();
            if (Object.keys(mixins).length > 0)
                this.buildInstanceMixins(classFunction, mixins);

            classFunction.__class = true;

            classFunction.prototype.constructor = classFunction;

            Object.defineProperty(classFunction.prototype, "getType", {
                value: function () {
                    return classFunction;
                },
                writable: false,
                enumerable: false,
                configurable: false
            });
        },

        addMethod: function (holder, name, method, propagation) {
            if (!propagation || (typeof intellisense !== 'undefined')) {
                holder[name] = method;
            } else {
                holder[name] = function () {
                    return method.apply(this[propagation], arguments);
                };
            }
        },

        addProperty: function (holder, name, propertyDescriptor, propagation) {

            //holder[name] = {};

            if (propagation) {
                propertyDescriptor.configurable = true;
                if (propertyDescriptor.get) {
                    var origGet = propertyDescriptor.get;
                    propertyDescriptor.get = function () {
                        if (!this[propagation])
                            Guard.raise(new Exception("not inicialized"));
                        return origGet.apply(this[propagation], arguments);
                    };
                }
                if (propertyDescriptor.set) {
                    var origSet = propertyDescriptor.set;
                    propertyDescriptor.set = function () {
                        if (!this[propagation])
                            Guard.raise(new Exception("not inicialized"));
                        origSet.apply(this[propagation], arguments);
                    };
                }
            }

            Object.defineProperty(holder, name, propertyDescriptor);
        },

        addField: function (holder, name, field) {
            Guard.raise("not implemented");
        },

        buildMethod: function (classFunction, memberDefinition, propagation) {
            ///<param name="classFunction" type="Function">The object that will receive member</param>
            ///<param name="memberDefinition" type="MemberDefinition">the newly added member</param>
            var holder = memberDefinition.classMember ? classFunction : classFunction.prototype;
            this.addMethod(holder, memberDefinition.name, memberDefinition.method, propagation);
        },

        buildProperty: function (classFunction, memberDefinition, propagation) {
            ///<param name="classFunction" type="Function">The object that will receive member</param>
            ///<param name="memberDefinition" type="MemberDefinition">the newly added member</param>
            var holder = memberDefinition.classMember ? classFunction : classFunction.prototype;
            var pd = memberDefinition.createPropertyDescriptor(classFunction);
            this.addProperty(holder, memberDefinition.name, pd, propagation);

            //if lazyload TODO
            if (!memberDefinition.classMember && classFunction.__setPropertyfunctions == true && memberDefinition.withoutGetSetMethod !== true &&
                !('get_' + memberDefinition.name in holder || 'set_' + memberDefinition.name in holder)) {
                var pdGetMethod = memberDefinition.createGetMethod();
                this.addProperty(holder, 'get_' + memberDefinition.name, pdGetMethod, propagation);

                var pdSetMethod = memberDefinition.createSetMethod();
                this.addProperty(holder, 'set_' + memberDefinition.name, pdSetMethod, propagation);
            }
        },


        buildMember: function (classFunction, memberDefinition, propagation, memberCollectionName) {
            ///<param name="memberDefinition" type="MemberDefinition" />
            memberCollectionName = memberCollectionName || 'memberDefinitions';
            classFunction[memberCollectionName] = classFunction[memberCollectionName] || new MemberDefinitionCollection();
            classFunction[memberCollectionName].setMember(memberDefinition);

            switch (memberDefinition.kind) {
                case MemberTypes.method:
                    this.buildMethod(classFunction, memberDefinition, propagation);
                    break;
                case MemberTypes.navProperty:
                case MemberTypes.complexProperty:
                case MemberTypes.property:
                    this.buildProperty(classFunction, memberDefinition, propagation);
                    break;
                default: Guard.raise("Unknown member type: " + memberDefinition.kind + "," + memberDefinition.name);
            }
        },

        buildStaticMembers: function (classFunction, memberListDefinition) {
            ///<param name="classFunction" type="Object">The class constructor that will be extended</param>
            ///<param name="memberListDefinition" type="Object"></param>
            var t = this;
            for (var item in memberListDefinition) {
                if (memberListDefinition.hasOwnProperty(item)) {
                    var memberDefinition = MemberDefinition.translateDefinition(memberListDefinition[item], item, classFunction);
                    memberDefinition.classMember = true;
                    t.buildMember(classFunction, memberDefinition, undefined, 'staticDefinitions');
                }
            }
        },

        buildInstanceMembers: function (classFunction, memberListDefinition) {
            ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
            ///<param name="memberListDefinition" type="Object"></param>
            ///pinning t outside of the closure seems actually faster then passing in the this  and referencing
            var t = this;
            for (var item in memberListDefinition) {
                if (memberListDefinition.hasOwnProperty(item)) {
                    var memberDefinition = MemberDefinition.translateDefinition(memberListDefinition[item], item, classFunction);
                    t.buildMember(classFunction, memberDefinition, undefined, 'memberDefinitions');
                }
            }
        },

        copyMembers: function (sourceType, targetType) {
            ///<param name="sourceType" type="Function" />
            ///<param name="targetType" type="Function" />
            function il(msg) {
                if (typeof intellisense === 'undefined') {
                    return;
                }
                intellisense.logMessage(msg);
            }

            Object.keys(sourceType.prototype).forEach(function (item, i, src) {
                if (item !== 'constructor' && item !== 'toString') {
                    il("copying item:" + item);
                    targetType.prototype[item] = sourceType[item];
                }
            });
        },

        buildInstanceMixins: function (classFunction, mixinList) {
            ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
            ///<param name="mixinList" type="Array"></param>

            classFunction.mixins = classFunction.mixins || [];
            classFunction.propagations = classFunction.propagations || [];

            for (var i = 0; i < mixinList.length; i++) {
                var item = mixinList[i];
                //if (classFunction.memberDefinitions.getMember(item.type.name)) {
                if (item.propagateTo) {
                    this.buildInstancePropagation(classFunction, item);
                    classFunction.propagations.push(item);
                    classFunction.propagations[item.type.name] = true;
                } else {
                    this.buildInstanceMixin(classFunction, item);
                    classFunction.mixins.push(item);
                    classFunction.mixins[item.type.name] = true;
                }
            };
        },
        buildInstanceMixin: function (classFunction, typeObj) {
            ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
            ///<param name="typeObj" type="Object"></param>

            var memberDefs = typeObj.type.memberDefinitions.asArray();
            for (var i = 0, l = memberDefs.length; i < l; i++) {
                var itemName = memberDefs[i].name;
                if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
                    this.buildMember(classFunction, memberDefs[i]);
                }
            }

            if (typeObj.type.staticDefinitions) {
                var staticDefs = typeObj.type.staticDefinitions.asArray();
                for (var i = 0, l = staticDefs.length; i < l; i++) {
                    var itemName = staticDefs[i].name;
                    if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
                        this.buildMember(classFunction, staticDefs[i], undefined, 'staticDefinitions');
                    }
                }
            }
        },
        buildInstancePropagation: function (classFunction, typeObj) {
            ///<param name="classFunction" type="Function">The class constructor whose prototype will be extended</param>
            ///<param name="typeObj" type="Object"></param>

            var memberDefs = typeObj.type.memberDefinitions.asArray();
            for (var i = 0, l = memberDefs.length; i < l; i++) {
                var itemName = memberDefs[i].name;
                if (itemName !== 'constructor' && !classFunction.memberDefinitions.getMember(itemName)) {
                    this.buildMember(classFunction, memberDefs[i], typeObj.propagateTo);
                }
            }
        }

    };

    $data.Class = Class = new ClassEngineBase();

    //(function (global) {
    global = window;
    function ContainerCtor(parentContainer) {
        var parent = parentContainer;
        if (parent) {
            parent.addChildContainer(this);
        }

        var classNames = {};
        var consolidatedClassNames = [];
        var classTypes = [];

        this.classNames = classNames;
        this.consolidatedClassNames = consolidatedClassNames;
        this.classTypes = classTypes;

        var mappedTo = [];
        this.mappedTo = mappedTo;

        var self = this;

        this["holder"] = null;

        var IoC = function (type, parameters) {
            var t = self.resolveType(type);
            var inst = Object.create(t.prototype);
            t.apply(inst, parameters);
            return inst;
        };

        var pendingResolutions = {};
        this.pendingResolutions = pendingResolutions;

        function addPendingResolution(name, onResolved) {
            pendingResolutions[name] = pendingResolutions[name] || [];
            pendingResolutions[name].push(onResolved);
        }

        this.addChildContainer = function (container) {
            //children.push(container);
        }

        this.createInstance = function (type, parameters) { return IoC(type, parameters); };

        this.mapType = function (aliasTypeOrName, realTypeOrName) {
            Guard.requireValue("aliasType", aliasTypeOrName);
            Guard.requireValue("realType", realTypeOrName);
            var aliasT = this.getType(aliasTypeOrName);
            var realT = this.getType(realTypeOrName);
            var aliasPos = classTypes.indexOf(aliasT);
            var realPos = classTypes.indexOf(realT);
            mappedTo[aliasPos] = realPos;
        },

        //this.resolve = function (type, parameters) {
        //    var classFunction = this.resolveType(type, parameters);
        //    return new classFunction(parameters);
        //};



        this.isPrimitiveType = function (type) {
            var t = this.resolveType(type);

            switch (true) {
                case t === Number:
                case t === String:
                case t === Date:
                case t === Boolean:
                case t === Array:
                case t === Object:

                case t === $data.Number:
                case t === $data.Integer:
                case t === $data.Date:
                case t === $data.String:
                case t === $data.Boolean:
                case t === $data.Array:
                case t === $data.Object:
                case t === $data.Guid:

                case t === $data.Byte:
                case t === $data.SByte:
                case t === $data.Decimal:
                case t === $data.Float:
                case t === $data.Int16:
                case t === $data.Int32:
                case t === $data.Int64:
                case t === $data.DateTimeOffset:
                case t === $data.Time:

                case t === $data.SimpleBase:
                case t === $data.Geospatial:
                case t === $data.GeographyBase:
                case t === $data.GeographyPoint:
                case t === $data.GeographyLineString:
                case t === $data.GeographyPolygon:
                case t === $data.GeographyMultiPoint:
                case t === $data.GeographyMultiLineString:
                case t === $data.GeographyMultiPolygon:
                case t === $data.GeographyCollection:
                case t === $data.GeometryBase:
                case t === $data.GeometryPoint:
                case t === $data.GeometryLineString:
                case t === $data.GeometryPolygon:
                case t === $data.GeometryMultiPoint:
                case t === $data.GeometryMultiLineString:
                case t === $data.GeometryMultiPolygon:
                case t === $data.GeometryCollection:

                    return true;
                default:
                    return false;
            }

            //return t === Number || t === String || t === Date || t === String || t === Boolean || t === Array || t === Object ||
            //    t === $data.Number || t === $data.Integer || t === $data.Date || t === $data.String || t === $data.Boolean || t === $data.Array || t === $data.Object ||
            //    t === $data.GeographyPoint || t === $data.Guid;
        };


        this.resolveName = function (type) {
            var t = this.resolveType(type);
            var tPos = classTypes.indexOf(t);
            return consolidatedClassNames[tPos];
        };

        this.resolveType = function (typeOrName, onResolved) {
            //if ("string" === typeof typeOrName) {
            //    console.log("@@@@String type!!!", typeOrName)
            //}
            var t = typeOrName;
            t = this.getType(t, onResolved ? true : false, onResolved);
            var posT = classTypes.indexOf(t);
            return typeof mappedTo[posT] === 'undefined' ? t : classTypes[mappedTo[posT]];
        };



        this.getType = function (typeOrName, doNotThrow, onResolved) {
            Guard.requireValue("typeOrName", typeOrName);
            if (typeof typeOrName === 'function') {
                return typeOrName;
            };

            if (!(typeOrName in classNames)) {
                if (parent) {
                    var tp = parent.getType(typeOrName, true);
                    if (tp) return tp;
                }
                if (onResolved) {
                    addPendingResolution(typeOrName, onResolved);
                    return;
                }
                else if (doNotThrow) {
                    return undefined;
                } else {
                    Guard.raise(new Exception("Unable to resolve type:" + typeOrName));
                }
            };
            var result = classTypes[classNames[typeOrName]];
            if (onResolved) {
                onResolved(result);
            }
            return result;
        };

        this.getName = function (typeOrName) {
            var t = this.getType(typeOrName);
            var tPos = classTypes.indexOf(t);
            if (tPos == -1)
                Guard.raise("unknown type to request name for: " + typeOrName);
            return consolidatedClassNames[tPos];
        };

        this.getTypes = function () {
            var keys = Object.keys(classNames);
            var ret = [];
            for (var i = 0; i < keys.length; i++) {
                var className = keys[i];
                ret.push({ name: className, type: classTypes[classNames[className]], toString: function () { return this.name; } });
            }
            return ret;
        };

        //this.getTypeName( in type);
        //this.resolveType()
        //this.inferTypeFromValue = function (value) {

        this.getTypeName = function (value) {
            //TODO refactor
            switch (typeof value) {
                case 'object':
                    if (value == null) return '$data.Object';
                    if (value instanceof Array) return '$data.Array';
                    if (value.getType) return value.getType().fullName;
                    if (value instanceof Date) return '$data.Date';
                    if (value instanceof $data.Guid) return '$data.Guid';
                    if (value instanceof $data.DateTimeOffset) return '$data.DateTimeOffset';
                    if (value instanceof $data.GeographyPoint) return '$data.GeographyPoint';
                    if (value instanceof $data.GeographyLineString) return '$data.GeographyLineString';
                    if (value instanceof $data.GeographyPolygon) return '$data.GeographyPolygon';
                    if (value instanceof $data.GeographyMultiPoint) return '$data.GeographyMultiPoint';
                    if (value instanceof $data.GeographyMultiLineString) return '$data.GeographyMultiLineString';
                    if (value instanceof $data.GeographyMultiPolygon) return '$data.GeographyMultiPolygon';
                    if (value instanceof $data.GeographyCollection) return '$data.GeographyCollection';
                    if (value instanceof $data.GeographyBase) return '$data.GeographyBase';
                    if (value instanceof $data.GeometryPoint) return '$data.GeometryPoint';
                    if (value instanceof $data.GeometryLineString) return '$data.GeometryLineString';
                    if (value instanceof $data.GeometryPolygon) return '$data.GeometryPolygon';
                    if (value instanceof $data.GeometryMultiPoint) return '$data.GeometryMultiPoint';
                    if (value instanceof $data.GeometryMultiLineString) return '$data.GeometryMultiLineString';
                    if (value instanceof $data.GeometryMultiPolygon) return '$data.GeometryMultiPolygon';
                    if (value instanceof $data.GeometryCollection) return '$data.GeometryCollection';
                    if (value instanceof $data.GeometryBase) return '$data.GeometryBase';
                    if (value instanceof $data.Geospatial) return '$data.Geospatial';
                    if (value instanceof $data.SimpleBase) return '$data.SimpleBase';
                    if (typeof value.toHexString === 'function') return '$data.ObjectID';
                    //if(value instanceof "number") return
                default:
                    return typeof value;
            }
        };

        this.isTypeRegistered = function (typeOrName) {
            if (typeof typeOrName === 'function') {
                return classTypes.indexOf(typeOrName) > -1;
            } else {
                return typeOrName in classNames;
            }
        };

        this.unregisterType = function (type) {
            Guard.raise("Unimplemented");
        };



        this.getDefault = function (typeOrName) {
            var t = this.resolveType(typeOrName);
            switch (t) {
                case $data.Number: return 0.0;
                case $data.Float: return 0.0;
                case $data.Decimal: return '0.0';
                case $data.Integer: return 0;
                case $data.Int16: return 0;
                case $data.Int32: return 0;
                case $data.Int64: return '0';
                case $data.Byte: return 0;
                case $data.SByte: return 0;
                case $data.String: return null;
                case $data.Boolean: return false;
                default: return null;
            }
        };

        //name array ['', '', '']
        this.getIndex = function (typeOrName) {
            var t = this.resolveType(typeOrName);
            return classTypes.indexOf(t);
        }

        this.resolveByIndex = function (index) {
            return classTypes[index];
        }

        this.registerType = function (nameOrNamesArray, type, factoryFunc) {
            ///<signature>
            ///<summary>Registers a type and optionally a lifetimeManager with a name
            ///that can be used to later resolve the type or create new instances</summary>
            ///<param name="nameOrNamesArray" type="Array">The names of the type</param>
            ///<param name="type" type="Function">The type to register</param>
            ///<param name="instanceManager" type="Function"></param>
            ///</signature>
            ///<signature>
            ///<summary>Registers a new type that </summary>
            ///<param name="aliasType" type="Function">The name of the type</param>
            ///<param name="actualType" type="Function">The type to register</param>
            ///</signature>


            ///TODO remove
            /*if (typeof typeNameOrAlias === 'string') {
                if (classNames.indexOf(typeNameOrAlias) > -1) {
                    Guard.raise("Type already registered. Remove first");
                }
            }*/

            if (!nameOrNamesArray) {
                return;
            }

            //todo add ('number', 'number')
            if (typeof type === "string") {
                type = self.resolveType(type);
            }

            var namesArray = [];
            if (typeof nameOrNamesArray === 'string') {
                var tmp = [];
                tmp.push(nameOrNamesArray);
                namesArray = tmp;
            } else {
                namesArray = nameOrNamesArray;
            }

            for (var i = 0; i < namesArray.length; i++) {
                var parts = namesArray[i].split('.');
                var item = {};
                item.shortName = parts[parts.length - 1];
                item.fullName = namesArray[i];
                namesArray[i] = item;
            }

            //if (type.


            var creatorFnc = function () { return IoC(type, arguments); };

            if (typeof intellisense !== 'undefined') {
                intellisense.annotate(creatorFnc, type);
            }

            for (var i = 0, l = namesArray.length; i < l; i++) {
                var item = namesArray[i];
                if (!(("create" + item.shortName) in self)) {
                    if (typeof factoryFunc === 'function') {
                        self["create" + item.shortName] = factoryFunc;
                    } else {
                        self["create" + item.shortName] = creatorFnc;
                    }
                }

                var typePos = classTypes.indexOf(type);
                if (typePos == -1) {
                    //new type
                    typePos = classTypes.push(type) - 1;
                    var fn = item.fullName;
                    consolidatedClassNames[typePos] = item.fullName;
                };

                classNames[item.fullName] = typePos;

                var pending = pendingResolutions[item.fullName] || [];
                if (pending.length > 0) {
                    pending.forEach(function (t) {
                        t(type);
                    });
                    pendingResolutions[item.fullName] = [];
                }
            }
            if (parent) {
                parent.registerType.apply(parent, arguments);
            }
            if (!type.name) {
                type.name = namesArray[0].shortName;
            }
        };


        var _converters = {
            from: {},
            to: {}
        };
        this.converters = _converters;

        this.convertTo = function (value, tType, eType /*if Array*/, options) {
            Guard.requireValue("typeOrName", tType);

            if(Object.isNullOrUndefined(value))
                return value;

            var sourceTypeName = Container.getTypeName(value);
            var sourceType = Container.resolveType(sourceTypeName);
            var sourceTypeName = Container.resolveName(sourceType);
            var targetType = Container.resolveType(tType);
            var targetTypeName = Container.resolveName(targetType);

            var result;
            try {
                if (typeof targetType['from' + sourceTypeName] === 'function') {
                    // target from
                    result = targetType['from' + sourceTypeName].apply(targetType, arguments);

                } else if (typeof sourceType['to' + targetTypeName] === 'function') {
                    // source to
                    result = sourceType['to' + targetTypeName].apply(sourceType, arguments);

                } else if (_converters.to[targetTypeName] && _converters.to[targetTypeName][sourceTypeName]) {
                    // target from source
                    result = _converters.to[targetTypeName][sourceTypeName].apply(_converters, arguments);

                } else if (_converters.from[sourceTypeName] && _converters.from[sourceTypeName][targetTypeName]) {
                    // source to target
                    result = _converters.from[sourceTypeName][targetTypeName].apply(_converters, arguments);

                } else if (targetTypeName === sourceTypeName || value instanceof targetType) {
                    result = value;

                } else if (_converters.to[targetTypeName] && _converters.to[targetTypeName]['default']) {
                    // target from anything
                    result = _converters.to[targetTypeName]['default'].apply(_converters, arguments);

                } else {
                    throw "converter not found";
                }
            } catch (e) {
                Guard.raise(new Exception("Value '" + sourceTypeName + "' not convertable to '" + targetTypeName + "'", 'TypeError', value));
            }

            if (targetType === $data.Array && eType && Array.isArray(result)) {
                for (var i = 0; i < result.length; i++) {
                    result[i] = this.convertTo.call(this, result[i], eType, undefined, options);
                }
            }

            return result;
        };
        this.registerConverter = function (target, sourceOrToConverters, toConverterOrFromConverters, fromConverter) {
            //registerConverter($data.Guid, { $data.String: fn, int: fn }, { string: fn, int:fn })
            //registerConverter($data.Guid, $data.String, fn, fn);

            var targetName = Container.resolveName(target);
            if (Container.isTypeRegistered(sourceOrToConverters)) {
                //isSource
                _converters.to[targetName] = _converters.to[targetName] || {};
                _converters.from[targetName] = _converters.from[targetName] || {};

                var sourceName = Container.resolveName(sourceOrToConverters);

                if (toConverterOrFromConverters)
                    _converters.to[targetName][sourceName] = toConverterOrFromConverters;
                if (fromConverter)
                    _converters.from[targetName][sourceName] = fromConverter;

            } else {
                // converterGroup

                //fromConverters
                if (_converters.to[targetName]) {
                    _converters.to[targetName] = $data.typeSystem.extend(_converters.to[targetName], sourceOrToConverters);
                } else {
                    _converters.to[targetName] = sourceOrToConverters;
                }

                //toConverters
                if (_converters.from[targetName]) {
                    _converters.from[targetName] = $data.typeSystem.extend(_converters.from[targetName], toConverterOrFromConverters);
                } else {
                    _converters.from[targetName] = toConverterOrFromConverters;
                }
            }
        };
    }
    $data.ContainerClass = ContainerCtor;

    var c;
        
    global["Container"] = $data.Container = c = global["C$"] = new ContainerCtor();

    $data.createContainer = function () {
        return new ContainerCtor($data.Container);
    }

    //})(window);

    global["$C"] = function () { Class.define.apply(Class, arguments); };


    var storeProperty = function (memberDefinition, value) {
        var backingFieldName = "_" + memberDefinition.name;
        if (!this[backingFieldName]) {
            Object.defineProperty(this, backingFieldName, memberDefinition.createStorePropertyDescriptor(value));
        }
        else {
            this[backingFieldName] = value;
        }
    };
    var retrieveProperty = function (memberDefinition) {
        var backingFieldName = "_" + memberDefinition.name;
        return this[backingFieldName];
    };


    $data.Class.define('$data.Base', function Base() { }, null, {
        storeProperty: storeProperty,
        retrieveProperty: retrieveProperty,
        setProperty: function (memberDefinition, value, callback) {
            this[memberDefinition.name] = value;
            callback();
        },
        getProperty: function (memberDefinition, callback) {
            callback.apply(this, [this[memberDefinition.name]]);
        }
    }, {
        create: function () { return Container.createInstance(this, arguments); },
        extend: function (name, container, instanceDefinition, classDefinition) {
            if (container && !(container instanceof ContainerCtor)) {
                classDefinition = instanceDefinition;
                instanceDefinition = container;
                container = undefined;
            }
            return $data.Class.define(name, this, container, instanceDefinition, classDefinition);
        },
        getMemberDefinition: function (name) {
            return this.memberDefinitions.getMember(name);
        },
        addProperty: function (name, getterOrType, setterOrGetter, setter) {
            var _getter = getterOrType;
            var _setter = setterOrGetter;
            var _type;
            if (typeof _getter === 'string') {
                _type = getterOrType;
                _getter = setterOrGetter;
                _setter = setter;
            }

            var propDef = {
                notMapped: true,
                storeOnObject: true,
                get: typeof _getter === 'function' ? _getter : function () { },
                set: typeof _setter === 'function' ? _setter : function () { },
                type: _type
            };

            var memberDefinition = MemberDefinition.translateDefinition(propDef, name, this);
            $data.Class.buildMember(this, memberDefinition);

            this.memberDefinitions.clearCache();

            return this;
        },
        addMember: function (name, definition, isClassMember) {
            var memberDefinition = MemberDefinition.translateDefinition(definition, name, this);

            if (isClassMember) {
                memberDefinition.classMember = true;
                $data.Class.buildMember(this, memberDefinition, undefined, 'staticDefinitions');
                this.staticDefinitions.clearCache();
            } else {
                $data.Class.buildMember(this, memberDefinition);
                this.memberDefinitions.clearCache();
            }
            return this;
        },
        describeField: function (name, definition) {
            var memDef = this.memberDefinitions.getMember(name);
            if (!memDef) {
                this.addMember(name, definition);
            } else {
                Guard.raise(new Exception("Field '" + name + "' already defined!", "Invalid operation"));
            }
            return this;
        },
        storeProperty: storeProperty,
        retrieveProperty: retrieveProperty,
        'from$data.Object': function (value) {
            return value;
        }
    });


    //override after typeSystem initialized


    $data.Class.ConstructorParameter = ConstructorParameter = $data.Class.define('ConstructorParameter', null, null, {
        constructor: function (paramIndex) {
            ///<param name="paramIndex" type="integer" />
            this.paramIndex = paramIndex;
        },
        paramIndex: {}
    });
    /*$data.Class.MixinParameter = MixinParameter = $data.Class.define('MixinParameter', null, null, {
        constructor: function (typeName) {
            ///<param name="paramIndex" type="integer">
            this.typeName = typeName;
        },
        typeName: {}
    });*/

    //var e = new Entity();


    /*$data.Interface = Class.define("Interface", null, null, {
        constructor: function() { Guard.raise("Can not create an interface"); }
    },
    {
        define: function (name, definition) {
            var result = Class.define(name, $data.Interface, null, null, definition);
            delete result.__class;
            result.__interface = true;
            return result;
        }
    });
    
    
    
    $data.Observable = Observable = Class.define("Observable", null, null, {
        propertyChanged: { dataType: $data.Event }
    }, { 
        createFromInstance: function(instance) {
            var propNames = instance.getClass().memberDefinitions.f
        }
    });*/



})($data, window);

$data.defaultErrorCallback = function () {
    //console.log('DEFAULT ERROR CALLBACK:');
    /*if (console.dir)
        console.dir(arguments);
    else
        console.log(arguments);*/
    if (arguments.length > 0 && arguments[arguments.length - 1] && typeof arguments[arguments.length - 1].reject === 'function') {
        (console.error || console.log).call(console, arguments[0]);
        arguments[arguments.length - 1].reject.apply(arguments[arguments.length - 1], arguments);
    } else {
        if (arguments[0] instanceof Error) {
            Guard.raise(arguments[0]);
        } else {
            Guard.raise(new Exception("DEFAULT ERROR CALLBACK!", "DefaultError", arguments));
        }
    }
};
$data.defaultSuccessCallback = function () { /*console.log('DEFAULT SUCCES CALLBACK');*/ };
$data.defaultNotifyCallback = function () { /*console.log('DEFAULT NOTIFY CALLBACK');*/ };

$data.typeSystem = {
    __namespace: true,
    /*inherit: function (ctor, baseType) {
        var proto = new baseType();
        ctor.prototype = $.extend(proto, ctor.prototype);
        //console.dir(proto);
        ctor.prototype.base = new baseType();
        //console.dir(ctor.prototype.base);
        ctor.prototype.constructor = ctor;
        return ctor;
    },*/
    //mix: function (type, mixin) {
    //    type.prototype = $.extend(type.prototype || {}, mixin.prototype || {});
    //    type.mixins = type.mixins || [];
    //    type.mixins.push(mixin);
    //    return type;
    //},
    extend: function (target) {
        /// <summary>
        /// Extends an object with properties of additional parameters.
        /// </summary>
        /// <signature>
        /// <param name="target" type="Object">Object that will be extended.</param>
        /// <param name="object" type="Object">Object to extend target with.</param>
        /// <param name="objectN" optional="true" parameterArray="true" type="Object">Object to extend target with.</param>
        /// </signature>        
        /// <returns></returns>
        if (typeof target !== 'object' && typeof target !== 'function')
            Guard.raise('Target must be object or function');

        for (var i = 1; i < arguments.length; i++) {
            var obj = arguments[i];
            if (obj === null || typeof obj === 'undefined')
                continue;
            for (key in obj) {
                target[key] = obj[key];
            }
        }
        return target;
    },
    createCallbackSetting: function (callBack, defaultSetting) {
        var setting = {
            success: $data.defaultSuccessCallback,
            error: $data.defaultErrorCallback,
            notify: $data.defaultNotifyCallback
        };

        if (defaultSetting != undefined && defaultSetting != null) {
            setting = defaultSetting;
        }

        var result;
        if (callBack == null || callBack == undefined) {
            result = setting;

        } else if (typeof callBack == 'function') {
            result = this.extend(setting, { success: callBack });

        } else {
            result = this.extend(setting, callBack);
        }

        function wrapCode(fn) { var t = this; function r() { fn.apply(t, arguments); fn = function () { } } return r; }

        if (typeof result.error === 'function')
            result.error = wrapCode(result.error);

        return result;
    },
    createCtorParams: function (source, indexes, thisObj) {
        ///<param name="source" type="Array" />Paramerter array
        ///<param name="indexes" type="Array" />
        ///<param name="thisObj" type="Object" />
        if (indexes) {
            var paramArray = [];
            for (var i = 0, l = indexes.length; i < l; i++) {
                var item = i;
                if (indexes[item] instanceof ConstructorParameter)
                    paramArray.push(source[indexes[item].paramIndex]);
                else if (typeof indexes[item] === "function")
                    paramArray.push(indexes[item].apply(thisObj));
                else
                    paramArray.push(indexes[item]);
            }
            return paramArray;
        }
        return source;
    },
    writePropertyValues: function (obj) {
        if (obj && obj.getType && obj.getType().memberDefinitions) {
            this.writeProperties(obj, obj.getType().memberDefinitions.asArray().filter(
                function (md) { return (md.kind == "property" || md.kind == "navProperty" || md.kind == "complexProperty") && !md.prototypeProperty; }
                ));
        }
    },
    writeProperties: function (obj, members) {
        var defines = {};
        for (var i = 0, l = members.length; i < l; i++) {
            var memDef = members[i];
            defines[memDef.name] = memDef.createPropertyDescriptor(null, memDef.value);
        }

        Object.defineProperties(obj, defines);

    },
    writeProperty: function (obj, member, value) {
        var memDef = typeof member === 'string' ? obj.getType().memberDefinitions.getMember(member) : member;
        if (memDef) {
            var propDef = memDef.createPropertyDescriptor(null, value);
            //////OPTIMIZATION
            Object.defineProperty(obj, memDef.name, propDef);
        }
    }
};

$data.debug = function () {
    (console.debug || console.log).apply(console, arguments);
};

$data.debugWith = function () {
    var cArgs = arguments;
    return function (r) {
        (console.debug || console.log).apply(console, cArgs);
        if ((typeof Error !== 'undefined' && r instanceof Error) ||
            (typeof Exception !== 'undefined' && r instanceof Exception)) {
            (console.error || console.log).apply(console, arguments);
        } else {
            (console.debug || console.log).apply(console, arguments);
        }
    }
};

$data.fdebug = { 
    success: $data.debugWith('success'),
    error: $data.debugWith('error')
};
$data.Number = typeof Number !== 'undefined' ? Number : function JayNumber() { };
$data.Date = typeof Date !== 'undefined' ? Date : function JayDate() { };
$data.String = typeof String !== 'undefined' ? String : function JayString() { };
$data.Boolean = typeof Boolean !== 'undefined' ? Boolean : function JayBoolean() { };
$data.Array = typeof Array !== 'undefined' ? Array : function JayArray() { };
$data.Object = typeof Object !== 'undefined' ? Object : function JayObject() { };
$data.Function = Function;

$data.Byte = function JayByte() { };
$data.SByte = function JaySByte() { };
$data.Decimal = function JayDecimal() { };
$data.Float = $data.Single = function JayFloat() { };
$data.Integer = function JayInteger() { };
$data.Int16 = function JayInt16(v) { };
$data.Int32 = function JayInt32() { };
$data.Int64 = function JayInt64(v) { };
$data.ObjectID = typeof $data.mongoDBDriver !== 'undefined' && typeof $data.mongoDBDriver.ObjectID !== 'undefined' ? $data.mongoDBDriver.ObjectID : function JayObjectID() { };
$data.Time = function JayTime() { };
$data.DateTimeOffset = function JayDateTimeOffset(val) {
    this.value = val;
};
$data.DateTimeOffset.prototype.toJSON = function () {
    return this.value instanceof Date ? this.value.toISOString() : this.value;
};

$data.Container.registerType(["$data.Number", "number", "JayNumber", "double"], $data.Number);
$data.Container.registerType(["$data.Integer", "int", "integer", "JayInteger"], $data.Integer);
$data.Container.registerType(["$data.Int32", "int32", "JayInt32"], $data.Int32);
$data.Container.registerType(["$data.Byte", "byte", "JayByte"], $data.Byte);
$data.Container.registerType(["$data.SByte", "sbyte", "JaySByte"], $data.SByte);
$data.Container.registerType(["$data.Decimal", "decimal", "JayDecimal"], $data.Decimal);
$data.Container.registerType(["$data.Float", "$data.Single", "float", "single", "JayFloat"], $data.Float);
$data.Container.registerType(["$data.Int16", "int16", "word", "JayInt16"], $data.Int16);
$data.Container.registerType(["$data.Int64", "int64", "long", "JayInt64"], $data.Int64);
$data.Container.registerType(["$data.String", "string", "text", "character", "JayString"], $data.String);
$data.Container.registerType(["$data.Array", "array", "Array", "[]", "JayArray"], $data.Array, function () {
    return $data.Array.apply(undefined, arguments);
});
$data.Container.registerType(["$data.Date", "datetime", "date", "JayDate"], $data.Date);
$data.Container.registerType(["$data.Time", "time", "JayTime"], $data.Time);
$data.Container.registerType(["$data.DateTimeOffset", "offset", "datetimeoffset", "JayDateTimeOffset"], $data.DateTimeOffset);
$data.Container.registerType(["$data.Boolean", "bool", "boolean", "JayBoolean"], $data.Boolean);
$data.Container.registerType(["$data.Object", "Object", "object", "{}", "JayObject"], $data.Object);
$data.Container.registerType(["$data.Function", "Function", "function"], $data.Function);
$data.Container.registerType(['$data.ObjectID', 'ObjectID', 'objectId', 'objectid', 'ID', 'Id', 'id', 'JayObjectID'], $data.ObjectID);
$data.Class.define('$data.TraceBase', null, null, {
    log: function () { },
    warn: function () { },
    error: function () { }
});

$data.Trace = new $data.TraceBase();
$data.Class.define('$data.Logger', $data.TraceBase, null, {
    log: function () {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.log.apply(console, arguments);
    },
    warn: function () {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.warn.apply(console, arguments);
    },
    error: function () {
        Array.prototype.unshift.call(arguments, this.getDateFormat());
        console.error.apply(console, arguments);
    },

    getDateFormat: function () {
        var date = new Date();
        return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds();
    }
});
$data.Number = typeof Number !== 'undefined' ? Number : function JayNumber() { };
$data.Date = typeof Date !== 'undefined' ? Date : function JayDate() { };
$data.String = typeof String !== 'undefined' ? String : function JayString() { };
$data.Boolean = typeof Boolean !== 'undefined' ? Boolean : function JayBoolean() { };
$data.Array = typeof Array !== 'undefined' ? Array : function JayArray() { };
$data.Object = typeof Object !== 'undefined' ? Object : function JayObject() { };
$data.Function = Function;

$data.Byte = function JayByte() { };
$data.SByte = function JaySByte() { };
$data.Decimal = function JayDecimal() { };
$data.Float = $data.Single = function JayFloat() { };
$data.Integer = function JayInteger() { };
$data.Int16 = function JayInt16(v) { };
$data.Int32 = function JayInt32() { };
$data.Int64 = function JayInt64(v) { };
$data.ObjectID = typeof $data.mongoDBDriver !== 'undefined' && typeof $data.mongoDBDriver.ObjectID !== 'undefined' ? $data.mongoDBDriver.ObjectID : function JayObjectID() { };
$data.Time = function JayTime() { };
$data.DateTimeOffset = function JayDateTimeOffset(val) {
    this.value = val;
};
$data.DateTimeOffset.prototype.toJSON = function () {
    return this.value instanceof Date ? this.value.toISOString() : this.value;
};

$data.Container.registerType(["$data.Number", "number", "JayNumber", "double"], $data.Number);
$data.Container.registerType(["$data.Integer", "int", "integer", "JayInteger"], $data.Integer);
$data.Container.registerType(["$data.Int32", "int32", "JayInt32"], $data.Int32);
$data.Container.registerType(["$data.Byte", "byte", "JayByte"], $data.Byte);
$data.Container.registerType(["$data.SByte", "sbyte", "JaySByte"], $data.SByte);
$data.Container.registerType(["$data.Decimal", "decimal", "JayDecimal"], $data.Decimal);
$data.Container.registerType(["$data.Float", "$data.Single", "float", "single", "JayFloat"], $data.Float);
$data.Container.registerType(["$data.Int16", "int16", "word", "JayInt16"], $data.Int16);
$data.Container.registerType(["$data.Int64", "int64", "long", "JayInt64"], $data.Int64);
$data.Container.registerType(["$data.String", "string", "text", "character", "JayString"], $data.String);
$data.Container.registerType(["$data.Array", "array", "Array", "[]", "JayArray"], $data.Array, function () {
    return $data.Array.apply(undefined, arguments);
});
$data.Container.registerType(["$data.Date", "datetime", "date", "JayDate"], $data.Date);
$data.Container.registerType(["$data.Time", "time", "JayTime"], $data.Time);
$data.Container.registerType(["$data.DateTimeOffset", "offset", "datetimeoffset", "JayDateTimeOffset"], $data.DateTimeOffset);
$data.Container.registerType(["$data.Boolean", "bool", "boolean", "JayBoolean"], $data.Boolean);
$data.Container.registerType(["$data.Object", "Object", "object", "{}", "JayObject"], $data.Object);
$data.Container.registerType(["$data.Function", "Function", "function"], $data.Function);
$data.Container.registerType(['$data.ObjectID', 'ObjectID', 'objectId', 'objectid', 'ID', 'Id', 'id', 'JayObjectID'], $data.ObjectID);
/* $data.SimpleBase */
$data.SimpleBase = function SimpleBase(data) {
    if (typeof data === 'object' && data) {
        if (Array.isArray(this.constructor.validMembers)) {
            for (var i = 0; i < this.constructor.validMembers.length; i++) {
                var name = this.constructor.validMembers[i];

                if (data[name] !== undefined) {
                    this[name] = data[name];
                }
            }

        } else {
            delete data.type;
            $data.typeSystem.extend(this, data);
        }
    }
}
$data.SimpleBase.registerType = function (name, type, base) {
    base = base || $data.SimpleBase;

    type.type = name;
    type.prototype = Object.create(base.prototype);
    type.prototype.constructor = type;
}
$data.Container.registerType(['$data.SimpleBase', 'SimpleBase'], $data.SimpleBase);$data.Geospatial = function Geospatial() {
    this.type = this.constructor.type;
    if (Array.isArray(this.constructor.validMembers)) {
        for (var i = 0; i < this.constructor.validMembers.length; i++) {
            var name = this.constructor.validMembers[i];
            this[name] = undefined;
        }
    }

    $data.SimpleBase.apply(this, arguments);
    this.type = this.constructor.type || 'Unknown';
};
$data.SimpleBase.registerType('Geospatial', $data.Geospatial);
$data.Container.registerType(['$data.Geospatial', 'Geospatial'], $data.Geospatial);

$data.point = function (arg) {
    if (arg && arg.crs) {
        if (arg.crs.properties && arg.crs.properties.name === $data.GeometryBase.defaultCrs.properties.name) {
            return new $data.GeometryPoint(arg);
        } else {
            return new $data.GeographyPoint(arg);
        }
    } else if(arg) {
        if ('x' in arg && 'y' in arg) {
            return new $data.GeometryPoint(arg.x, arg.y);
        } else if ('longitude' in arg && 'latitude' in arg) {
            return new $data.GeographyPoint(arg.longitude, arg.latitude);
        } else if ('lng' in arg && 'lat' in arg) {
            return new $data.GeographyPoint(arg.lng, arg.lat);
        }
    }
};
/* $data.GeographyBase */
$data.GeographyBase = function GeographyBase() {
    $data.Geospatial.apply(this, arguments);

    this.crs = $data.GeographyBase.defaultCrs;
    $data.GeographyBase.validateGeoJSON(this);
};

$data.GeographyBase.defaultCrs = {
    properties: {
        name: 'EPSG:4326'
    },
    type: 'name'
};

$data.GeographyBase.parseFromString = function (strData) {
    var lparenIdx = strData.indexOf('(');
    if(lparenIdx >= 0){
        var name = strData.substring(0, lparenIdx).toLowerCase();
        var type = $data.GeographyBase.registered[name];

        if (type && type.parseFromString && type != $data.GeographyBase) {
            return type.parseFromString(strData);
        } else {
            Guard.raise(new Exception('parseFromString', 'Not Implemented', strData));
        }
    }
};
$data.GeographyBase.stringifyToUrl = function (geoData) {
    if (geoData instanceof $data.GeographyBase && geoData.constructor && geoData.constructor.stringifyToUrl) {
        return geoData.constructor.stringifyToUrl(geoData);
    } else if (geoData instanceof $data.GeographyBase && geoData.constructor && Array.isArray(geoData.constructor.validMembers) && geoData.constructor.validMembers[0] === 'coordinates') {
        var data = "geography'" + geoData.type.toUpperCase() + '(';
        function buildArray(d, context) {
            if (Array.isArray(d[0])) {
                
                for (var i = 0; i < d.length; i++) {
                    if (i > 0) data += ',';
                    if (Array.isArray(d[i][0]))
                        data += '(';

                    buildArray(d[i]);

                    if (Array.isArray(d[i][0]))
                        data += ')';
                }
                
            } else {
                data += d.join(' ');
            }
        }
        buildArray(geoData.coordinates, data);
        
        data += ")'";
        return data;
    } else {
        Guard.raise(new Exception('stringifyToUrl on instance type', 'Not Implemented', geoData));
    }
};
$data.GeographyBase.registerType = function (name, type, base) {
    $data.SimpleBase.registerType(name, type, base || $data.GeographyBase);

    $data.GeographyBase.registered = $data.GeographyBase.registered || {};
    $data.GeographyBase.registered[name.toLowerCase()] = type;
};
$data.GeographyBase.validateGeoJSON = function (geoData) {
    var type = geoData.type;
    if (type) {
        var geoType = $data.GeographyBase.registered[type.toLowerCase()];
        if (typeof geoType.validateGeoJSON === 'function') {
            var isValid = geoType.validateGeoJSON(geoData);
            if (isValid) {
                return isValid;
            } else {
                Guard.raise(new Exception("Invalid '" + type + "' format!", 'Format Exception', geoData));
            }
        }
    }
    console.log('GeoJSON validation missing', geoData);
    return;
};
$data.SimpleBase.registerType('GeographyBase', $data.GeographyBase, $data.Geospatial);
$data.Container.registerType(['$data.GeographyBase'], $data.GeographyBase);

/* $data.GeographyPoint */
$data.GeographyPoint = function GeographyPoint(lon, lat) {
    if (lon && typeof lon === 'object' && Array.isArray(lon)) {
        $data.GeographyBase.call(this, { coordinates: lon });
    } else if (lon && typeof lon === 'object' && ('longitude' in lon || 'latitude' in lon)) {
        $data.GeographyBase.call(this, { coordinates: [lon.longitude, lon.latitude] });
    } else if (lon && typeof lon === 'object' && ('lng' in lon || 'lat' in lon)) {
        $data.GeographyBase.call(this, { coordinates: [lon.lng, lon.lat] });
    } else if (lon && typeof lon === 'object') {
        $data.GeographyBase.call(this, lon);
    } else {
        $data.GeographyBase.call(this, { coordinates: [lon || 0, lat || 0] });
    }
};
$data.GeographyPoint.validateGeoJSON = function (geoData) {
    return geoData && 
        Array.isArray(geoData.coordinates) && 
        geoData.coordinates.length == 2 && 
        typeof geoData.coordinates[0] === 'number' &&
        typeof geoData.coordinates[1] === 'number';
};
$data.GeographyPoint.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var values = data.split(' ');

    return new $data.GeographyPoint(parseFloat(values[0]), parseFloat(values[1]));
};
$data.GeographyPoint.validMembers = ['coordinates'];
$data.GeographyBase.registerType('Point', $data.GeographyPoint);
Object.defineProperty($data.GeographyPoint.prototype, 'longitude', { get: function () { return this.coordinates[0]; }, set: function (v) { this.coordinates[0] = v; } });
Object.defineProperty($data.GeographyPoint.prototype, 'latitude', { get: function () { return this.coordinates[1]; }, set: function (v) { this.coordinates[1] = v; } });
$data.Container.registerType(['$data.GeographyPoint', 'GeographyPoint', '$data.Geography', 'Geography', 'geography', 'geo'], $data.GeographyPoint);
$data.Geography = $data.GeographyPoint;

/* $data.GeographyLineString */
$data.GeographyLineString = function GeographyLineString(data) {
    if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { coordinates: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid &&
            Array.isArray(point) &&
            point.length == 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number';
    }
    
    return isValid;
};
$data.GeographyLineString.validMembers = ['coordinates'];
$data.GeographyBase.registerType('LineString', $data.GeographyLineString);
$data.Container.registerType(['$data.GeographyLineString', 'GeographyLineString'], $data.GeographyLineString);

/* $data.GeographyPolygon */
$data.GeographyPolygon = function GeographyPolygon(data) {
    if (typeof data === 'object' && (('topLeft' in data && 'bottomRight' in data) || ('topRight' in data && 'bottomLeft' in data))) {
        var tl, tr, bl, br;

        if ('topLeft' in data && 'bottomRight' in data) {
            tl = data.topLeft instanceof $data.GeographyPoint ? data.topLeft : new $data.GeographyPoint(data.topLeft);
            br = data.bottomRight instanceof $data.GeographyPoint ? data.bottomRight : new $data.GeographyPoint(data.bottomRight);
            tr = new $data.GeographyPoint([br.coordinates[0], tl.coordinates[1]]);
            bl = new $data.GeographyPoint([tl.coordinates[0], br.coordinates[1]]);
        } else {
            tr = data.topRight instanceof $data.GeographyPoint ? data.topRight : new $data.GeographyPoint(data.topRight);
            bl = data.bottomLeft instanceof $data.GeographyPoint ? data.bottomLeft : new $data.GeographyPoint(data.bottomLeft);
            tl = new $data.GeographyPoint([bl.coordinates[0], tr.coordinates[1]]);
            br = new $data.GeographyPoint([tr.coordinates[0], bl.coordinates[1]]);
        }

        var coordinates = [];
        coordinates.push([].concat(tl.coordinates));
        coordinates.push([].concat(tr.coordinates));
        coordinates.push([].concat(br.coordinates));
        coordinates.push([].concat(bl.coordinates));
        coordinates.push([].concat(tl.coordinates));

        $data.GeographyBase.call(this, { coordinates: [coordinates] });

    }else if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { coordinates: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);
            
        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid &&
                Array.isArray(point) &&
                point.length == 2 &&
                typeof point[0] === 'number' &&
                typeof point[1] === 'number';
        }
    }

    return isValid;
};
$data.GeographyPolygon.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var rings = data.substring(data.indexOf('(') + 1, data.lastIndexOf(')')).split('),(');

    var data = [];
    for (var i = 0; i < rings.length; i++) {
        var polyPoints = [];
        var pairs = rings[i].split(',');
        for (var j = 0; j < pairs.length; j++) {
            var values = pairs[j].split(' ');

            polyPoints.push([parseFloat(values[0]), parseFloat(values[1])]);
        }
        data.push(polyPoints);
    }

    return new $data.GeographyPolygon(data);
};
$data.GeographyPolygon.validMembers = ['coordinates'];
$data.GeographyBase.registerType('Polygon', $data.GeographyPolygon);
$data.Container.registerType(['$data.GeographyPolygon', 'GeographyPolygon'], $data.GeographyPolygon);

/* $data.GeographyMultiPoint */
$data.GeographyMultiPoint = function GeographyMultiPoint(data) {
    if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { coordinates: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyMultiPoint.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid &&
            Array.isArray(point) &&
            point.length == 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number';
    }

    return isValid;
};
$data.GeographyMultiPoint.validMembers = ['coordinates'];
$data.GeographyBase.registerType('MultiPoint', $data.GeographyMultiPoint);
$data.Container.registerType(['$data.GeographyMultiPoint', 'GeographyMultiPoint'], $data.GeographyMultiPoint);

/* $data.GeographyMultiLineString */
$data.GeographyMultiLineString = function GeographyMultiLineString(data) {
    if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { coordinates: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyMultiLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid &&
                Array.isArray(point) &&
                point.length == 2 &&
                typeof point[0] === 'number' &&
                typeof point[1] === 'number';
        }
    }

    return isValid;
};
$data.GeographyMultiLineString.validMembers = ['coordinates'];
$data.GeographyBase.registerType('MultiLineString', $data.GeographyMultiLineString);
$data.Container.registerType(['$data.GeographyMultiLineString', 'GeographyMultiLineString'], $data.GeographyMultiLineString);

/* $data.GeographyMultiPolygon */
$data.GeographyMultiPolygon = function GeographyMultiPolygon(data) {
    if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { coordinates: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyMultiPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var k = 0; isValid && k < geoData.coordinates.length; k++) {
        var polygons = geoData.coordinates[k];
        var isValid = isValid && Array.isArray(polygons);

        for (var i = 0; isValid && i < polygons.length; i++) {
            var polygon = polygons[i];
            var isValid = isValid && Array.isArray(polygon);

            for (var j = 0; isValid && j < polygon.length; j++) {
                var point = polygon[j];

                isValid = isValid &&
                    Array.isArray(point) &&
                    point.length == 2 &&
                    typeof point[0] === 'number' &&
                    typeof point[1] === 'number';
            }
        }
    }

    return isValid;
};
$data.GeographyMultiPolygon.validMembers = ['coordinates'];
$data.GeographyBase.registerType('MultiPolygon', $data.GeographyMultiPolygon);
$data.Container.registerType(['$data.GeographyMultiPolygon', 'GeographyMultiPolygon'], $data.GeographyMultiPolygon);

/* $data.GeographyCollection */
$data.GeographyCollection = function GeographyCollection(data) {
    if (Array.isArray(data)) {
        $data.GeographyBase.call(this, { geometries: data });
    } else {
        $data.GeographyBase.call(this, data);
    }
};
$data.GeographyCollection.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.geometries);

    for (var i = 0; isValid && i < geoData.geometries.length; i++) {
        var geometry = geoData.geometries[i];
        try {
            isValid = isValid && $data.GeographyBase.validateGeoJSON(geometry);
        } catch (e) {
            isValid = false;
        }
    }

    return isValid;
};
$data.GeographyCollection.validMembers = ['geometries'];
$data.GeographyBase.registerType('GeometryCollection', $data.GeographyCollection);
$data.Container.registerType(['$data.GeographyCollection', 'GeographyCollection'], $data.GeographyCollection);


/* converters */
$data.Container.registerConverter($data.GeographyPoint, $data.Object, function (value) {
    return value ? new $data.GeographyPoint(value) : value;
});
$data.Container.registerConverter($data.GeographyLineString, $data.Object, function (value) {
    return value ? new $data.GeographyLineString(value) : value;
});
$data.Container.registerConverter($data.GeographyPolygon, $data.Object, function (value) {
    return value ? new $data.GeographyPolygon(value) : value;
});
$data.Container.registerConverter($data.GeographyMultiPoint, $data.Object, function (value) {
    return value ? new $data.GeographyMultiPoint(value) : value;
});
$data.Container.registerConverter($data.GeographyMultiLineString, $data.Object, function (value) {
    return value ? new $data.GeographyMultiLineString(value) : value;
});
$data.Container.registerConverter($data.GeographyMultiPolygon, $data.Object, function (value) {
    return value ? new $data.GeographyMultiPolygon(value) : value;
});
$data.Container.registerConverter($data.GeographyCollection, $data.Object, function (value) {
    return value ? new $data.GeographyCollection(value) : value;
});
/* $data.Geometry */
$data.GeometryBase = function GeometryBase() {
    $data.Geospatial.apply(this, arguments);

    this.crs = $data.GeometryBase.defaultCrs;
    $data.GeometryBase.validateGeoJSON(this);
};

$data.GeometryBase.defaultCrs = {
    properties: {
        name: 'EPSG:0'
    },
    type: 'name'
};

$data.GeometryBase.parseFromString = function (strData) {
    var lparenIdx = strData.indexOf('(');
    if (lparenIdx >= 0) {
        var name = strData.substring(0, lparenIdx).toLowerCase();
        var type = $data.GeometryBase.registered[name];

        if (type && type.parseFromString && type != $data.GeometryBase) {
            return type.parseFromString(strData);
        } else {
            Guard.raise(new Exception('parseFromString', 'Not Implemented', strData));
        }
    }
};
$data.GeometryBase.stringifyToUrl = function (geoData) {
    if (geoData instanceof $data.GeometryBase && geoData.constructor && geoData.constructor.stringifyToUrl) {
        return geoData.constructor.stringifyToUrl(geoData);
    } else if (geoData instanceof $data.GeometryBase && geoData.constructor && Array.isArray(geoData.constructor.validMembers) && geoData.constructor.validMembers[0] === 'coordinates') {
        var data = "geometry'" + geoData.type.toUpperCase() + '(';
        function buildArray(d, context) {
            if (Array.isArray(d[0])) {

                for (var i = 0; i < d.length; i++) {
                    if (i > 0) data += ',';
                    if (Array.isArray(d[i][0]))
                        data += '(';

                    buildArray(d[i]);

                    if (Array.isArray(d[i][0]))
                        data += ')';
                }

            } else {
                data += d.join(' ');
            }
        }
        buildArray(geoData.coordinates, data);

        data += ")'";
        return data;
    } else {
        Guard.raise(new Exception('stringifyToUrl on instance type', 'Not Implemented', geoData));
    }
};
$data.GeometryBase.registerType = function (name, type, base) {
    $data.SimpleBase.registerType(name, type, base || $data.GeometryBase);

    $data.GeometryBase.registered = $data.GeometryBase.registered || {};
    $data.GeometryBase.registered[name.toLowerCase()] = type;
};
$data.GeometryBase.validateGeoJSON = function (geoData) {
    var type = geoData.type;
    if (type) {
        var geoType = $data.GeometryBase.registered[type.toLowerCase()];
        if (typeof geoType.validateGeoJSON === 'function') {
            var isValid = geoType.validateGeoJSON(geoData);
            if (isValid) {
                return isValid;
            } else {
                Guard.raise(new Exception("Invalid '" + type + "' format!", 'Format Exception', geoData));
            }
        }
    }
    console.log('GeoJSON validation missing', geoData);
    return;
};
$data.SimpleBase.registerType('GeometryBase', $data.GeometryBase, $data.Geospatial);
$data.Container.registerType(['$data.GeometryBase'], $data.GeometryBase);

/* $data.GeometryPoint */
$data.GeometryPoint = function GeometryPoint(x, y) {
    var param = x;
    if (param && typeof param === 'object' && Array.isArray(param)) {
        $data.GeometryBase.call(this, { coordinates: param });
    } else if (param && typeof param === 'object' && ('x' in param || 'y' in param)) {
        $data.GeometryBase.call(this, { coordinates: [param.x, param.y] });
    } else if (param && typeof param === 'object') {
        $data.GeometryBase.call(this, param);
    } else {
        $data.GeometryBase.call(this, { coordinates: [x || 0, y || 0] });
    }
};
$data.GeometryPoint.validateGeoJSON = function (geoData) {
    return geoData &&
        Array.isArray(geoData.coordinates) &&
        geoData.coordinates.length == 2 &&
        typeof geoData.coordinates[0] === 'number' &&
        typeof geoData.coordinates[1] === 'number';
};
$data.GeometryPoint.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var values = data.split(' ');

    return new $data.GeometryPoint(parseFloat(values[0]), parseFloat(values[1]));
};
$data.GeometryPoint.validMembers = ['coordinates'];
$data.GeometryBase.registerType('Point', $data.GeometryPoint);
Object.defineProperty($data.GeometryPoint.prototype, 'x', { get: function () { return this.coordinates[0]; }, set: function (v) { this.coordinates[0] = v; } });
Object.defineProperty($data.GeometryPoint.prototype, 'y', { get: function () { return this.coordinates[1]; }, set: function (v) { this.coordinates[1] = v; } });
$data.Container.registerType(['$data.GeometryPoint', 'GeometryPoint'], $data.GeometryPoint);

/* $data.GeometryLineString */
$data.GeometryLineString = function GeometryLineString(data) {
    if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { coordinates: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid &&
            Array.isArray(point) &&
            point.length == 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number';
    }

    return isValid;
};
$data.GeometryLineString.validMembers = ['coordinates'];
$data.GeometryBase.registerType('LineString', $data.GeometryLineString);
$data.Container.registerType(['$data.GeometryLineString', 'GeometryLineString'], $data.GeometryLineString);

/* $data.GeometryPolygon */
$data.GeometryPolygon = function GeometryPolygon(data) {
    if (typeof data === 'object' && (('topLeft' in data && 'bottomRight' in data) || ('topRight' in data && 'bottomLeft' in data))) {
        var tl, tr, bl, br;

        if ('topLeft' in data && 'bottomRight' in data) {
            tl = data.topLeft instanceof $data.GeometryPoint ? data.topLeft : new $data.GeometryPoint(data.topLeft);
            br = data.bottomRight instanceof $data.GeometryPoint ? data.bottomRight : new $data.GeometryPoint(data.bottomRight);
            tr = new $data.GeometryPoint([br.coordinates[0], tl.coordinates[1]]);
            bl = new $data.GeometryPoint([tl.coordinates[0], br.coordinates[1]]);
        } else {
            tr = data.topRight instanceof $data.GeometryPoint ? data.topRight : new $data.GeometryPoint(data.topRight);
            bl = data.bottomLeft instanceof $data.GeometryPoint ? data.bottomLeft : new $data.GeometryPoint(data.bottomLeft);
            tl = new $data.GeometryPoint([bl.coordinates[0], tr.coordinates[1]]);
            br = new $data.GeometryPoint([tr.coordinates[0], bl.coordinates[1]]);
        }

        var coordinates = [];
        coordinates.push([].concat(tl.coordinates));
        coordinates.push([].concat(tr.coordinates));
        coordinates.push([].concat(br.coordinates));
        coordinates.push([].concat(bl.coordinates));
        coordinates.push([].concat(tl.coordinates));

        $data.GeometryBase.call(this, { coordinates: [coordinates] });

    }else if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { coordinates: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid &&
                Array.isArray(point) &&
                point.length == 2 &&
                typeof point[0] === 'number' &&
                typeof point[1] === 'number';
        }
    }

    return isValid;
};
$data.GeometryPolygon.parseFromString = function (strData) {
    var data = strData.substring(strData.indexOf('(') + 1, strData.lastIndexOf(')'));
    var rings = data.substring(data.indexOf('(') + 1, data.lastIndexOf(')')).split('),(');

    var data = [];
    for (var i = 0; i < rings.length; i++) {
        var polyPoints = [];
        var pairs = rings[i].split(',');
        for (var j = 0; j < pairs.length; j++) {
            var values = pairs[j].split(' ');

            polyPoints.push([parseFloat(values[0]), parseFloat(values[1])]);
        }
        data.push(polyPoints);
    }

    return new $data.GeometryPolygon(data);
};
$data.GeometryPolygon.validMembers = ['coordinates'];
$data.GeometryBase.registerType('Polygon', $data.GeometryPolygon);
$data.Container.registerType(['$data.GeometryPolygon', 'GeometryPolygon'], $data.GeometryPolygon);

/* $data.GeometryMultiPoint */
$data.GeometryMultiPoint = function GeometryMultiPoint(data) {
    if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { coordinates: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryMultiPoint.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var point = geoData.coordinates[i];
        isValid = isValid &&
            Array.isArray(point) &&
            point.length == 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number';
    }

    return isValid;
};
$data.GeometryMultiPoint.validMembers = ['coordinates'];
$data.GeometryBase.registerType('MultiPoint', $data.GeometryMultiPoint);
$data.Container.registerType(['$data.GeometryMultiPoint', 'GeometryMultiPoint'], $data.GeometryMultiPoint);

/* $data.GeometryMultiLineString */
$data.GeometryMultiLineString = function GeometryMultiLineString(data) {
    if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { coordinates: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryMultiLineString.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var i = 0; isValid && i < geoData.coordinates.length; i++) {
        var polygon = geoData.coordinates[i];
        var isValid = isValid && Array.isArray(polygon);

        for (var j = 0; isValid && j < polygon.length; j++) {
            var point = polygon[j];

            isValid = isValid &&
                Array.isArray(point) &&
                point.length == 2 &&
                typeof point[0] === 'number' &&
                typeof point[1] === 'number';
        }
    }

    return isValid;
};
$data.GeometryMultiLineString.validMembers = ['coordinates'];
$data.GeometryBase.registerType('MultiLineString', $data.GeometryMultiLineString);
$data.Container.registerType(['$data.GeometryMultiLineString', 'GeometryMultiLineString'], $data.GeometryMultiLineString);

/* $data.GeometryMultiPolygon */
$data.GeometryMultiPolygon = function GeometryMultiPolygon(data) {
    if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { coordinates: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryMultiPolygon.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.coordinates);

    for (var k = 0; isValid && k < geoData.coordinates.length; k++) {
        var polygons = geoData.coordinates[k];
        var isValid = isValid && Array.isArray(polygons);

        for (var i = 0; isValid && i < polygons.length; i++) {
            var polygon = polygons[i];
            var isValid = isValid && Array.isArray(polygon);

            for (var j = 0; isValid && j < polygon.length; j++) {
                var point = polygon[j];

                isValid = isValid &&
                    Array.isArray(point) &&
                    point.length == 2 &&
                    typeof point[0] === 'number' &&
                    typeof point[1] === 'number';
            }
        }
    }

    return isValid;
};
$data.GeometryMultiPolygon.validMembers = ['coordinates'];
$data.GeometryBase.registerType('MultiPolygon', $data.GeometryMultiPolygon);
$data.Container.registerType(['$data.GeometryMultiPolygon', 'GeometryMultiPolygon'], $data.GeometryMultiPolygon);

/* $data.GeometryCollection */
$data.GeometryCollection = function GeometryCollection(data) {
    if (Array.isArray(data)) {
        $data.GeometryBase.call(this, { geometries: data });
    } else {
        $data.GeometryBase.call(this, data);
    }
};
$data.GeometryCollection.validateGeoJSON = function (geoData) {
    var isValid = geoData &&
        Array.isArray(geoData.geometries);

    for (var i = 0; isValid && i < geoData.geometries.length; i++) {
        var geometry = geoData.geometries[i];
        try {
            isValid = isValid && $data.GeometryBase.validateGeoJSON(geometry);
        } catch (e) {
            isValid = false;
        }
    }

    return isValid;
};
$data.GeometryCollection.validMembers = ['geometries'];
$data.GeometryBase.registerType('GeometryCollection', $data.GeometryCollection);
$data.Container.registerType(['$data.GeometryCollection', 'GeometryCollection'], $data.GeometryCollection);

/* converters */
$data.Container.registerConverter($data.GeometryPoint, $data.Object, function (value) {
    return value ? new $data.GeometryPoint(value) : value;
});
$data.Container.registerConverter($data.GeometryLineString, $data.Object, function (value) {
    return value ? new $data.GeometryLineString(value) : value;
});
$data.Container.registerConverter($data.GeometryPolygon, $data.Object, function (value) {
    return value ? new $data.GeometryPolygon(value) : value;
});
$data.Container.registerConverter($data.GeometryMultiPoint, $data.Object, function (value) {
    return value ? new $data.GeometryMultiPoint(value) : value;
});
$data.Container.registerConverter($data.GeometryMultiLineString, $data.Object, function (value) {
    return value ? new $data.GeometryMultiLineString(value) : value;
});
$data.Container.registerConverter($data.GeometryMultiPolygon, $data.Object, function (value) {
    return value ? new $data.GeometryMultiPolygon(value) : value;
});
$data.Container.registerConverter($data.GeometryCollection, $data.Object, function (value) {
    return value ? new $data.GeometryCollection(value) : value;
});$data.Guid = function Guid(value) {
    ///<param name="value" type="string" />

    if (value === undefined || (typeof value === 'string' && /^[a-zA-z0-9]{8}-[a-zA-z0-9]{4}-[a-zA-z0-9]{4}-[a-zA-z0-9]{4}-[a-zA-z0-9]{12}$/.test(value))) {
        this.value = value || '00000000-0000-0000-0000-000000000000';
    } else {
        throw Guard.raise(new Exception('TypeError: ', 'value not convertable to $data.Guid', value));
    }
};
$data.Container.registerType(['$data.Guid', 'Guid', 'guid'], $data.Guid);
$data.Container.registerConverter('$data.Guid', {
    '$data.String': function (value) {
        return value ? $data.parseGuid(value).toString() : value;
    },
    '$data.Guid': function (value) {
        return value ? value.toString() : value;
    }
}, {
    '$data.String': function (value) {
        return value ? value.toString() : value;
    }
});


$data.Guid.prototype.toJSON = function () {
    return this.value;
};

$data.Guid.prototype.valueOf = function () {
    return this.value;
};

$data.Guid.prototype.toString = function () {
    return this.value;
};

$data.Guid.NewGuid = function () {
    return $data.createGuid();
};

$data.parseGuid = function (guid) {
    return new $data.Guid(guid);
};

(function () {
    /*!
    Math.uuid.js (v1.4)
    http://www.broofa.com
    mailto:robert@broofa.com
    
    Copyright (c) 2010 Robert Kieffer
    Dual licensed under the MIT and GPL licenses.
    */

    var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

    $data.createGuid = function (guidString) {
        if (guidString) {
            return new $data.Guid(guidString);
        };

        var len;
        var chars = CHARS, uuid = [], i;
        var radix = chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return $data.parseGuid(uuid.join(''));
    };
})();$data.Blob = function Blob(){};

$data.Blob.createFromHexString = function(value){
    if (value != value.match(new RegExp('[0-9a-fA-F]+'))[0]){
        Guard.raise(new Exception('TypeError: ', 'value not convertable to $data.Blob', value));
    }else{
        //if (value.length & 1) value = '0' + value;
        var arr = new (typeof Buffer != 'undefined' ? Buffer : Uint8Array)(value.length >> 1);
        for (var i = 0, j = 1, k = 0; i < value.length; i += 2, j += 2, k++) {
            arr[k] = parseInt('0x' + value[i] + value[j], 16);
        }

        return arr;
    }
};

$data.Blob.toString = function(value){
    if (!value || !value.length) return null;
    var s = '';
    for (var i = 0; i < value.length; i++){
        s += String.fromCharCode(value[i]);
    }
    
    return s;
};

$data.Blob.toBase64 = function(value){
    if (!value || !value.length) return null;
    return btoa($data.Blob.toString(value));
};

$data.Blob.toArray = function(src){
    if (!src || !src.length) return null;
    var arr = new Array(src.length);
    for (var i = 0; i < src.length; i++){
        arr[i] = src[i];
    }
    
    return arr;
};

/*$data.Blob.toJSON = function(value){
    return JSON.stringify($data.Blob.toArray(value));
};*/

$data.Blob.toHexString = function(value){
    if (!value || !value.length) return null;
    var s = '';
    for (var i = 0; i < value.length; i++){
        s += ('00' + value[i].toString(16)).slice(-2);
    }
    
    return s.toUpperCase();
};

$data.Blob.toDataURL = function(value){
    if (!value || !value.length) return null;
    return 'data:application/octet-stream;base64,' + btoa($data.Blob.toString(value));
};

$data.Container.registerType(["$data.Blob", "blob", "JayBlob"], $data.Blob);
$data.Container.registerConverter('$data.Blob',{
    '$data.String': function (value){
        if (value && value.length){
            var blob = new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)(value.length);
            for (var i = 0; i < value.length; i++){
                blob[i] = value.charCodeAt(i);
            }
            
            return blob;
        }else return null;
    },
    '$data.Array': function(value){
        return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)(value);
    },
    '$data.Number': function(value){
        return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)($data.packIEEE754(value, 11, 52).reverse());
    },
    '$data.Boolean': function(value){
        return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)([value | 0]);
    },
    'default': function(value){
        if (typeof Blob !== 'undefined' && value instanceof Blob){
            var req = new XMLHttpRequest();
            req.open('GET', URL.createObjectURL(value), false);
            req.responseType = 'arraybuffer';
            req.send(null);
            return $data.Container.convertTo(req.response, $data.Blob);
        } else if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
            return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)(new Uint8Array(value));
        }else if (value instanceof Uint8Array){
            if (typeof Buffer !== 'undefined') return new Buffer(value);
            else return value;
        }else if (typeof Buffer !== 'undefined' ? value instanceof Buffer : false){
            return value;
        }else if (value.buffer){
            return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)(value);
        }else if (typeof value == 'object' && value instanceof Object){
            var arr = [];
            for (var i in value){
                arr[i] = value[i];
            }
            if (!arr.length) throw 0;
            return new (typeof Buffer !== 'undefined' ? Buffer : Uint8Array)(arr);
        }
        throw 0;
    }
}, {
    '$data.String': function(value){
        return $data.Blob.toString(value);
    },
    '$data.Array': function(value){
        return $data.Blob.toArray(value);
    }
});
(function ($data) {

    function Edm_Boolean() { };
    $data.Container.registerType('Edm.Boolean', Edm_Boolean);
    $data.Container.mapType(Edm_Boolean, $data.Boolean);

    function Edm_Binary() { };
    $data.Container.registerType('Edm.Binary', Edm_Binary);
    $data.Container.mapType(Edm_Binary, $data.Blob);

    function Edm_DateTime() { };
    $data.Container.registerType('Edm.DateTime', Edm_DateTime);
    $data.Container.mapType(Edm_DateTime, $data.Date);

    function Edm_DateTimeOffset() { };
    $data.Container.registerType('Edm.DateTimeOffset', Edm_DateTimeOffset);
    $data.Container.mapType(Edm_DateTimeOffset, $data.DateTimeOffset);

    function Edm_Time() { };
    $data.Container.registerType('Edm.Time', Edm_Time);
    $data.Container.mapType(Edm_Time, $data.Time);

    function Edm_Decimal() { };
    $data.Container.registerType('Edm.Decimal', Edm_Decimal);
    $data.Container.mapType(Edm_Decimal, $data.Decimal);
    
    function Edm_Float() { };
    $data.Container.registerType('Edm.Float', Edm_Float);
    $data.Container.mapType(Edm_Float, $data.Float);

    function Edm_Single() { };
    $data.Container.registerType('Edm.Single', Edm_Single);
    $data.Container.mapType(Edm_Single, $data.Float);

    function Edm_Double() { };
    $data.Container.registerType('Edm.Double', Edm_Double);
    $data.Container.mapType(Edm_Double, $data.Number);

    function Edm_Guid() { };
    $data.Container.registerType('Edm.Guid', Edm_Guid);
    $data.Container.mapType(Edm_Guid, $data.Guid);

    function Edm_Int16() { };
    $data.Container.registerType('Edm.Int16', Edm_Int16);
    $data.Container.mapType(Edm_Int16, $data.Int16);

    function Edm_Int32() { };
    $data.Container.registerType('Edm.Int32', Edm_Int32);
    $data.Container.mapType(Edm_Int32, $data.Integer);

    function Edm_Int64() { };
    $data.Container.registerType('Edm.Int64', Edm_Int64);
    $data.Container.mapType(Edm_Int64, $data.Int64);

    function Edm_Byte() { };
    $data.Container.registerType('Edm.Byte', Edm_Byte);
    $data.Container.mapType(Edm_Byte, $data.Byte);
    
    function Edm_SByte() { };
    $data.Container.registerType('Edm.SByte', Edm_SByte);
    $data.Container.mapType(Edm_SByte, $data.SByte);

    function Edm_String() { };
    $data.Container.registerType('Edm.String', Edm_String);
    $data.Container.mapType(Edm_String, $data.String);

    function Edm_GeographyPoint() { };
    $data.Container.registerType('Edm.GeographyPoint', Edm_GeographyPoint);
    $data.Container.mapType(Edm_GeographyPoint, $data.GeographyPoint);

    function Edm_GeographyLineString() { };
    $data.Container.registerType('Edm.GeographyLineString', Edm_GeographyLineString);
    $data.Container.mapType(Edm_GeographyLineString, $data.GeographyLineString);

    function Edm_GeographyPolygon() { };
    $data.Container.registerType('Edm.GeographyPolygon', Edm_GeographyPolygon);
    $data.Container.mapType(Edm_GeographyPolygon, $data.GeographyPolygon);

    function Edm_GeographyMultiPoint() { };
    $data.Container.registerType('Edm.GeographyMultiPoint', Edm_GeographyMultiPoint);
    $data.Container.mapType(Edm_GeographyMultiPoint, $data.GeographyMultiPoint);

    function Edm_GeographyMultiLineString() { };
    $data.Container.registerType('Edm.GeographyMultiLineString', Edm_GeographyMultiLineString);
    $data.Container.mapType(Edm_GeographyMultiLineString, $data.GeographyMultiLineString);

    function Edm_GeographyMultiPolygon() { };
    $data.Container.registerType('Edm.GeographyMultiPolygon', Edm_GeographyMultiPolygon);
    $data.Container.mapType(Edm_GeographyMultiPolygon, $data.GeographyMultiPolygon);

    function Edm_GeographyCollection() { };
    $data.Container.registerType('Edm.GeographyCollection', Edm_GeographyCollection);
    $data.Container.mapType(Edm_GeographyCollection, $data.GeographyCollection);

    function Edm_GeometryPoint() { };
    $data.Container.registerType('Edm.GeometryPoint', Edm_GeometryPoint);
    $data.Container.mapType(Edm_GeometryPoint, $data.GeometryPoint);

    function Edm_GeometryLineString() { };
    $data.Container.registerType('Edm.GeometryLineString', Edm_GeometryLineString);
    $data.Container.mapType(Edm_GeometryLineString, $data.GeometryLineString);

    function Edm_GeometryPolygon() { };
    $data.Container.registerType('Edm.GeometryPolygon', Edm_GeometryPolygon);
    $data.Container.mapType(Edm_GeometryPolygon, $data.GeometryPolygon);

    function Edm_GeometryMultiPoint() { };
    $data.Container.registerType('Edm.GeometryMultiPoint', Edm_GeometryMultiPoint);
    $data.Container.mapType(Edm_GeometryMultiPoint, $data.GeometryMultiPoint);

    function Edm_GeometryMultiLineString() { };
    $data.Container.registerType('Edm.GeometryMultiLineString', Edm_GeometryMultiLineString);
    $data.Container.mapType(Edm_GeometryMultiLineString, $data.GeometryMultiLineString);

    function Edm_GeometryMultiPolygon() { };
    $data.Container.registerType('Edm.GeometryMultiPolygon', Edm_GeometryMultiPolygon);
    $data.Container.mapType(Edm_GeometryMultiPolygon, $data.GeometryMultiPolygon);

    function Edm_GeometryCollection() { };
    $data.Container.registerType('Edm.GeometryCollection', Edm_GeometryCollection);
    $data.Container.mapType(Edm_GeometryCollection, $data.GeometryCollection);

    $data.oDataEdmMapping = {
        '$data.Byte': 'Edm.Byte',
        '$data.SByte': 'Edm.SByte',
        '$data.Decimal': 'Edm.Decimal',
        '$data.Float': 'Edm.Float',
        '$data.Int16': 'Edm.Int16',
        '$data.Int64': 'Edm.Int64',
        '$data.DateTimeOffset': 'Edm.DateTimeOffset',
        '$data.Time': 'Edm.Time',
        '$data.Boolean': 'Edm.Boolean',
        '$data.Blob': 'Edm.Binary',
        '$data.Date': 'Edm.DateTime',
        '$data.Number': 'Edm.Double',
        '$data.Integer': 'Edm.Int32',
        '$data.Int32': 'Edm.Int32',
        '$data.String': 'Edm.String',
        '$data.ObjectID': 'Edm.String',
        '$data.GeographyPoint': 'Edm.GeographyPoint',
        '$data.GeographyLineString': 'Edm.GeographyLineString',
        '$data.GeographyPolygon': 'Edm.GeographyPolygon',
        '$data.GeographyMultiPoint': 'Edm.GeographyMultiPoint',
        '$data.GeographyMultiLineString': 'Edm.GeographyMultiLineString',
        '$data.GeographyMultiPolygon': 'Edm.GeographyMultiPolygon',
        '$data.GeographyCollection': 'Edm.GeographyCollection',
        '$data.GeometryPoint': 'Edm.GeometryPoint',
        '$data.GeometryLineString': 'Edm.GeometryLineString',
        '$data.GeometryPolygon': 'Edm.GeometryPolygon',
        '$data.GeometryMultiPoint': 'Edm.GeometryMultiPoint',
        '$data.GeometryMultiLineString': 'Edm.GeometryMultiLineString',
        '$data.GeometryMultiPolygon': 'Edm.GeometryMultiPolygon',
        '$data.GeometryCollection': 'Edm.GeometryCollection',
        '$data.Guid': 'Edm.Guid'
    };

})($data);
$data.Container.registerConverter('$data.Boolean', {
    '$data.String': function(value){
        if (value.toLowerCase() == 'true') return true;
        if (value.toLowerCase() == 'false') return false;
        
        return !!value;
    },
    'default': function(value){
        return !!value;
    }
});

$data.Container.registerConverter('$data.Integer', {
    'default': function (value) {
        if (value === Number.POSITIVE_INFINITY ||
            value === Number.NEGATIVE_INFINITY ||
            value === Number.MAX_VALUE ||
            value === Number.MIN_VALUE) {
            return value;
        }

        var r = parseInt(+value, 10);
        if (isNaN(r)) throw 0;
        return r;
    }
});

$data.Container.registerConverter('$data.Int32', {
    'default': function (value) {
        return value | 0;
    }
});

$data.Container.registerConverter('$data.Number', {
    'default': function(value){
        var r = +value;
        if (isNaN(r)) throw 0;
        return r;
    }
});

$data.Container.registerConverter('$data.Byte', {
    'default': function(value){
        return (value | 0) & 0xff;
    }
});

$data.Container.registerConverter('$data.Date', {
    'default': function(value){
        var d = new Date(value);
        if (isNaN(d)) throw 0;
        return d;
    }
});

$data.Container.registerConverter('$data.DateTimeOffset', {
    '$data.Date': function(value){
        return value;
    },
    'default': function(value){
        var d = new Date(value);
        if (isNaN(d)) throw 0;
        return d;
    }
});
(function () {
    function parseFromString(value) {
        var regex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]|[0-9])(:([0-5][0-9]|[0-9])(\.(\d+))?)?$/;

        var matches = regex.exec(value)
        if (!matches) throw 0;
        var time = '';
        time += ('00' + matches[1]).slice(-2);
        time += ':' + ('00' + matches[2]).slice(-2);
        if (matches[4]) {
            time += ':' + ('00' + matches[4]).slice(-2);
        } else {
            time += ':00';
        }
        if (matches[6])
            time += '.' + (matches[6] + '000').slice(0, 3);

        return time;
    }

    $data.Container.registerConverter('$data.Time', {
        '$data.String': parseFromString,
        '$data.Number': function tt(value) {
            var metrics = [1000, 60, 60];
            var result = [0, 0, 0, value | 0];

            for (var i = 0; i < metrics.length; i++) {
                result[metrics.length - (i + 1)] = (result[metrics.length - i] / metrics[i]) | 0;
                result[metrics.length - i] -= result[metrics.length - (i + 1)] * metrics[i];
            }

            var time = '';
            for (var i = 0; i < result.length; i++) {
                if (i < result.length - 1) {
                    time += ('00' + result[i]).slice(-2);
                    if (i < result.length - 2) time += ':';
                } else {
                    time += '.' + ('000' + result[i]).slice(-3);
                }
            }

            return parseFromString(time);
        },
        '$data.Date': function (value) {
            var val = value.getHours() + ':' + value.getMinutes() + ':' + value.getSeconds();
            var ms = value.getMilliseconds()
            if (ms) {
                val += '.' + ms;
            }

            return parseFromString(val);
        }
    });
})();

$data.Container.registerConverter('$data.Decimal', {
    '$data.Boolean': function(value){
        return value ? '1' : '0';
    },
    '$data.Number': function(value){
        return value.toString();
    },
    '$data.String': function(value){
        if (!/^\-?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) throw 0;
        return value;
    },
    '$data.Date': function(value){
        var r = value.valueOf();
        if (isNaN(r)) throw 0;
        return r.toString();
    }
});

$data.packIEEE754 = function(v, ebits, fbits){
    var bias = (1 << (ebits - 1)) - 1, s, e, f, ln, i, bits, str, bytes;

    // Compute sign, exponent, fraction
    if (v !== v){
        // NaN
        // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
        e = (1 << bias) - 1; f = Math.pow(2, fbits - 1); s = 0;
    }else if (v === Infinity || v === -Infinity){
        e = (1 << bias) - 1; f = 0; s = (v < 0) ? 1 : 0;
    }else if (v === 0){
        e = 0; f = 0; s = (1 / v === -Infinity) ? 1 : 0;
    }else{
        s = v < 0;
        v = Math.abs(v);

        if (v >= Math.pow(2, 1 - bias)){
            // Normalized
            ln = Math.min(Math.floor(Math.log(v) / Math.LN2), bias);
            e = ln + bias;
            f = Math.round(v * Math.pow(2, fbits - ln) - Math.pow(2, fbits));
        }else{
            // Denormalized
            e = 0;
            f = Math.round(v / Math.pow(2, 1 - bias - fbits));
        }
    }

    // Pack sign, exponent, fraction
    bits = [];
    for (i = fbits; i; i -= 1) { bits.push(f % 2 ? 1 : 0); f = Math.floor(f / 2); }
    for (i = ebits; i; i -= 1) { bits.push(e % 2 ? 1 : 0); e = Math.floor(e / 2); }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');

    // Bits to bytes
    bytes = [];
    while (str.length){
        bytes.push(parseInt(str.substring(0, 8), 2));
        str = str.substring(8);
    }
    
    return bytes;
};

$data.unpackIEEE754 = function(bytes, ebits, fbits){
    // Bytes to bits
    var bits = [], i, j, b, str, bias, s, e, f;

    for (i = bytes.length; i; i -= 1){
        b = bytes[i - 1];
        for (j = 8; j; j -= 1){
            bits.push(b % 2 ? 1 : 0); b = b >> 1;
        }
    }
    bits.reverse();
    str = bits.join('');

    // Unpack sign, exponent, fraction
    bias = (1 << (ebits - 1)) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);

    // Produce number
    if (e === (1 << ebits) - 1){
        return f !== 0 ? NaN : s * Infinity;
    }else if (e > 0){
        // Normalized
        return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
    }else if (f !== 0){
        // Denormalized
        return s * Math.pow(2, -(bias - 1)) * (f / Math.pow(2, fbits));
    }else{
        return s < 0 ? -0 : 0;
    }
};

$data.IEEE754 = function(v, e, f){
    return $data.unpackIEEE754($data.packIEEE754(v, e, f), e, f);
};

$data.Container.registerConverter('$data.Float', {
    'default': function(value){
        var r = +value;
        if (isNaN(r)) throw 0;
        return $data.IEEE754(r, 8, 23);
    }
});

$data.Container.registerConverter('$data.Int16', {
    'default': function(value){
        var r = (value | 0) & 0xffff;
        if (r >= 0x8000) return r - 0x10000;
        return r;
    }
});

$data.Container.registerConverter('$data.Int64', {
    '$data.Boolean': function(value){
        return value ? '1' : '0';
    },
    '$data.Number': function(value){
        var r = value.toString();
        if (r.indexOf('.') > 0) return r.split('.')[0];
        if (r.indexOf('.') == 0) throw 0;
        return r;
    },
    '$data.String': function(value){
        if (!/^\-?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value)) throw 0;
        if (value.indexOf('.') > 0) return value.split('.')[0];
        if (value.indexOf('.') == 0) throw 0;
        return value;
    },
    '$data.Date': function(value){
        var r = value.valueOf();
        if (isNaN(r)) throw 0;
        return r.toString();
    }
});

$data.Container.registerConverter('$data.SByte', {
    'default': function(value){
        var r = (value | 0) & 0xff;
        if (r >= 0x80) return r - 0x100;
        return r;
    }
});

$data.Container.registerConverter('$data.String', {
    '$data.Date': function(value){
        return value.toISOString();
    },
    '$data.ObjectID': function(value){
        return btoa(value.toString());
    },
    'default': function(value){
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }
});

$data.Container.registerConverter('$data.Object', {
    '$data.String': function(value){
        return JSON.parse(value);
    },
    '$data.Function': function(){
        throw 0;
    }
});

$data.Container.registerConverter('$data.Array', {
    '$data.String': function(value){
        var r = JSON.parse(value);
        if (!Array.isArray(r)) throw 0;
        return r;
    }
});

$data.Container.registerConverter('$data.ObjectID', {
    '$data.ObjectID': function(value){
        try{
            return btoa(value.toString());
        }catch(e){
            return value;
        }
    },
    '$data.String': function(id){
        return id;
    }
});

$data.Container.proxyConverter = function(v){ return v; };
$data.Container.defaultConverter = function(type){ return function(v){ return $data.Container.convertTo(v, type); }; };
$data.StringFunctions = {
    startsWith: function () {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else
            return false;
            
        if (typeof self !== 'string') return false;
        return self.indexOf(str) === 0;
    },
    endsWith: function () {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else
            return false;

        if (typeof self !== 'string') return false;
        return self.slice(-str.length) === str;
    },
    contains: function () {
        var self, str;
        if (arguments.length == 2) {
            self = arguments[0];
            str = arguments[1];
        } else if (arguments.length == 1 && typeof this === 'string') {
            self = this;
            str = arguments[0];
        } else if (this instanceof String) {
            self = this.valueOf();
            str = arguments[0];
        } else
            return false;

        if (typeof self !== 'string') return false;
        return self.indexOf(str) >= 0;
    }
};
//TODO: Finish refactoring ExpressionNode.js

$data.Class.define("$data.Expressions.ExpressionType", null, null, {}, {
    Constant: "constant", // { type:LITERAL, executable:true, valueType:, value: }
    Variable: "variable", // { type:VARIABLE, executable:true, name: }
    MemberAccess: "memberAccess",    // { type:MEMBERACCESS, executable:true, expression:, member: }
    Call: "call",

    /* binary operators */
    Equal: "equal",
    NotEqual: "notEqual",
    EqualTyped: "equalTyped",
    NotEqualTyped: "notEqualTyped",
    GreaterThen: "greaterThan",
    LessThen: "lessThan",
    GreaterThenOrEqual: "greaterThanOrEqual",
    LessThenOrEqual: "lessThenOrEqual",
    Or: "or",
    OrBitwise: "orBitwise",
    And: "and",
    AndBitwise: "andBitwise",


    In: "in",

    Add: "add",
    Divide: "divide",
    Multiply: "multiply",
    Subtract: "subtract",
    Modulo: "modulo",
    ArrayIndex: "arrayIndex",

    /* unary operators */
    New: "new",
    Positive: "positive",
    Negative: "negative",
    Increment: "increment",
    Decrement: "decrement",
    Not: "not",


    This: "this",
    LambdaParameterReference: "lambdaParameterReference",
    LambdaParameter: "lambdaParameter",
    Parameter: "parameter",

    ArrayLiteral: "arrayLiteral",
    ObjectLiteral: "objectLiteral",
    ObjectField: "objectField",
    Function: "Function",
    Unknown: "UNKNOWN",

    EntitySet: "EntitySet",
    ServiceOperation: "ServiceOperation",
    EntityField: "EntityField",
    EntityContext: "EntityContext",
    Entity: "Entity",
    Filter: "Filter",
    First: "First",
    Count: "Count",
    InlineCount: "InlineCount",
    Single: "Single",
    Find: "Find",
    Some: "Some",
    Every: "Every",
    ToArray: "ToArray",
    BatchDelete: "BatchDelete",
    ForEach: "ForEach",
    Projection: "Projection",
    EntityMember: "EntityMember",
    EntityFieldOperation: "EntityFieldOperation",
    FrameOperation: "FrameOperation",
    EntityFunctionOperation: "EntityFunctionOperation",
    ContextFunctionOperation: "ContextFunctionOperation",
    EntityBinary: "EntityBinary",
    Code: "Code",
    ParametricQuery: "ParametricQuery",
    MemberInfo: "MemberInfo",
    QueryParameter: "QueryParameter",
    ComplexEntityField: "ComplexEntityField",

    Take: "Take",
    Skip: "Skip",
    OrderBy: "OrderBy",
    OrderByDescending: "OrderByDescending",
    Include: "Include",

    IndexedPhysicalAnd:"IndexedDBPhysicalAndFilterExpression",
    IndexedLogicalAnd:"IndexedDBLogicalAndFilterExpression",
    IndexedLogicalOr: "IndexedDBLogicalOrFilterExpression",
    IndexedLogicalIn: "IndexedDBLogicalInFilterExpression"
});

$data.BinaryOperator = function () {
    ///<field name="operator" type="string" />
    ///<field name="expressionType" type="$data.ExpressionType" />
    ///<field name="type" type="string" />
}

$data.binaryOperators = [
    { operator: "==", expressionType: $data.Expressions.ExpressionType.Equal, type: "boolean", implementation: function (a, b) { return a == b; } },
    { operator: "===", expressionType: $data.Expressions.ExpressionType.EqualTyped, type: "boolean", implementation: function (a, b) { return a === b; } },
    { operator: "!=", expressionType: $data.Expressions.ExpressionType.NotEqual, type: "boolean", implementation: function (a, b) { return a != b; } },
    { operator: "!==", expressionType: $data.Expressions.ExpressionType.NotEqualTyped, type: "boolean", implementation: function (a, b) { return a !== b; } },
    { operator: ">", expressionType: $data.Expressions.ExpressionType.GreaterThen, type: "boolean", implementation: function (a, b) { return a > b; } },
    { operator: ">=", expressionType: $data.Expressions.ExpressionType.GreaterThenOrEqual, type: "boolean", implementation: function (a, b) { return a >= b; } },
    { operator: "<=", expressionType: $data.Expressions.ExpressionType.LessThenOrEqual, type: "boolean", implementation: function (a, b) { return a <= b; } },
    { operator: "<", expressionType: $data.Expressions.ExpressionType.LessThen, type: "boolean", implementation: function (a, b) { return a < b; } },
    { operator: "&&", expressionType: $data.Expressions.ExpressionType.And, type: "boolean", implementation: function (a, b) { return a && b; } },
    { operator: "||", expressionType: $data.Expressions.ExpressionType.Or, type: "boolean", implementation: function (a, b) { return a || b; } },
    { operator: "&", expressionType: $data.Expressions.ExpressionType.AndBitwise, type: "number", implementation: function (a, b) { return a & b; } },
    { operator: "|", expressionType: $data.Expressions.ExpressionType.OrBitwise, type: "number", implementation: function (a, b) { return a | b; } },
    { operator: "+", expressionType: $data.Expressions.ExpressionType.Add, type: "number", implementation: function (a, b) { return a + b; } },
    { operator: "-", expressionType: $data.Expressions.ExpressionType.Subtract, type: "number", implementation: function (a, b) { return a - b; } },
    { operator: "/", expressionType: $data.Expressions.ExpressionType.Divide, type: "number", implementation: function (a, b) { return a / b; } },
    { operator: "%", expressionType: $data.Expressions.ExpressionType.Modulo, type: "number", implementation: function (a, b) { return a % b; } },
    { operator: "*", expressionType: $data.Expressions.ExpressionType.Multiply, type: "number", implementation: function (a, b) { return a * b; } },
    { operator: "[", expressionType: $data.Expressions.ExpressionType.ArrayIndex, type: "number", implementation: function (a, b) { return a[b]; } },
    { operator: "in", expressionType: $data.Expressions.ExpressionType.In, type: 'boolean', implementation: function (a, b) { return a in b; } }
];


$data.binaryOperators.resolve = function (operator) {
    var result = $data.binaryOperators.filter(function (item) { return item.operator == operator; });
    if (result.length > 0)
        return operator;
    //Guard.raise("Unknown operator: " + operator);
};

$data.binaryOperators.contains = function (operator) {
    return $data.binaryOperators.some(function (item) { return item.operator == operator; });
};

$data.binaryOperators.getOperator = function (operator) {
    ///<returns type="BinaryOperator" />
    var result = $data.binaryOperators.filter(function (item) { return item.operator == operator; });
    if (result.length < 1)
        Guard.raise("Unknown operator: " + operator);
    return result[0];
};


$data.unaryOperators = [
    { operator: "+", arity: "prefix", expressionType: $data.Expressions.ExpressionType.Positive, type: "number", implementation: function (operand) { return +operand; } },
    { operator: "-", arity: "prefix", expressionType: $data.Expressions.ExpressionType.Negative, type: "number", implementation: function (operand) { return -operand; } },
    { operator: "++", arity: "prefix", expressionType: $data.Expressions.ExpressionType.Increment, type: "number", implementation: function (operand) { return ++operand; } },
    { operator: "--", arity: "prefix", expressionType: $data.Expressions.ExpressionType.Decrement, type: "number", implementation: function (operand) { return --operand; } },
    { operator: "++", arity: "suffix", expressionType: $data.Expressions.ExpressionType.Increment, type: "number", implementation: function (operand) { return operand++; } },
    { operator: "!", arity: "prefix", expressionType: $data.Expressions.ExpressionType.Not, type: "boolean", implementation: function (operand) { return !operand; } },
    { operator: "--", arity: "suffix", expressionType: $data.Expressions.ExpressionType.Decrement, type: "number", implementation: function (operand) { return operand--; } }

    //{ operator: "new", expressionType : $data.Expressions.ExpressionType.New, type: "object", implementation: function(operand) { return new operand; }
];

$data.unaryOperators.resolve = function (operator) {
    var result = $data.unaryOperators.filter(function (item) { return item.operator == operator; });
    if (result.length > 0)
        return operator;
    //Guard.raise("Unknown operator: " + operator);
};

$data.unaryOperators.contains = function (operator) {
    return $data.unaryOperators.some(function (item) { return item.operator == operator; });
};

$data.unaryOperators.getOperator = function (operator, arity) {
    ///<returns type="BinaryOperator" />
    var result = $data.unaryOperators.filter(function (item) { return item.operator == operator && (!arity || item.arity == arity); });
    if (result.length < 1)
        Guard.raise("Unknown operator: " + operator);
    return result[0];
};


$data.timeIt = function (fn, iterations) {
    iterations = iterations || 1;

    console.time("!");
    for (var i = 0; i < iterations; i++) {
        fn();
    }
    console.timeEnd("!");
}

$data.Expressions.OperatorTypes = {
    UNARY: "UNARY",                  // { type:UNARY, executable:true, operator:, operand: }
    INCDEC: "INCDEC",                // { type:INCDEC, executable:true, operator:, operand:, suffix: }
    DECISION: "DECISION",            // { type:DECISION, executable:true, expression:, left:, right: }
    METHODCALL: "METHODCALL",        // { type:METHODCALL, executable:true, object:, method:, args: }
    NEW: "NEW",                      // { type:NEW, executable:true, values: [] };
    JSONASSIGN: "JSONASSIGN",        // { type:JSONASSIGN, executable:true, left:, right: }
    ARRAYACCESS: "ARRAYACCESS",      // { type:ARRAYACCESS, executable:true, array:, index: }
    UNKNOWN: "UNKNOWN"
};

$data.executable = true;

function jsonify(obj) { return JSON.stringify(obj, null, "\t"); }

$C('$data.Expressions.ExpressionNode', null, null, {
    constructor: function () {
        ///<summary>Provides a base class for all Expressions.</summary>
        ///<field name="nodeType" type="string">Represents the expression type of the node&#10;
        ///For the list of expression node types refer to $data.Expressions.ExpressionType
        ///</field>
        ///<field name="type" type="Function">The result type of the expression</field>
        ///<field name="executable" type="boolean">True if the expression can be evaluated to yield a result</field>
        ///this.nodeType = $data.Expressions.ExpressionType.Unknown;
        ///this.type = type;
        ///this.nodeType = $data.Expressions.ExpressionType.Unknown;
        ///this.executable = (executable === undefined || executable === null) ? true : executable;
        ///TODO
        this.expressionType = this.constructor;
    },

    getJSON: function () { return jsonify(this); },

    //TOBLOG maybe
    /*expressionType: {
        value: undefined,
        ////OPTIMIZE
        set: function (value) {
            var _expressionType;
            Object.defineProperty(this, "expressionType", {
                set: function (value) {
                    if (typeof value === 'string') {
                        value = Container.resolveType(value);
                    }
                    _expressionType = value;
                },
                get: function (value) {
                    //IE ommits listing JSON.stringify in call chain

                        if (arguments.callee.caller == jsonify || arguments.callee.caller == JSON.stringify) {
                        return Container.resolveName(_expressionType);
                    }
                    return _expressionType;
                },
                enumerable: true
            });

            this.expressionType = value;
        },
        get: function () { return undefined; },
        enumerable: true
    },*/
    expressionType: {
        set: function (value) {
            if (typeof value === 'string') {
                value = Container.resolveType(value);
            }
            this._expressionType = value;
        },
        get: function (value) {
            //IE ommits listing JSON.stringify in call chain

            if (arguments.callee.caller == jsonify || arguments.callee.caller == JSON.stringify) {
                return Container.resolveName(this._expressionType);
            }
            return this._expressionType;
        },
        enumerable: true
    },
    ///toString: function () { },
    nodeType: { value: $data.Expressions.ExpressionType.Unknown, writable: false },

    type: {},

    isTerminated: { value: false },

    toString: function () {
        return this.value;
    }
}, null);


$C('$data.Expressions.UnaryExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (operand, operator, nodeType, resolution) {
        /// <summary>
        /// Represents an operation with only one operand and an operator
        /// </summary>
        /// <param name="operand"></param>
        /// <param name="operator"></param>
        /// <param name="nodeType"></param>
        /// <param name="resolution"></param>
        this.operand = operand;
        this.operator = operator;
        this.nodeType = nodeType;
        this.resolution = resolution;
    },

    operator: { value: undefined, writable: true },
    operand: { value: undefined, writable: true },
    nodeType: { value: undefined, writable: true }
});
$C('$data.Expressions.ArrayLiteralExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (items) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        ///<field name="items" type="Array" elementType="$data.Expression.ExpressionNode" />
        this.items = items || [];
    },
    nodeType: { value: $data.Expressions.ExpressionType.ArrayLiteral, writable: true },

    items: { value: undefined, dataType: Array, elementType: $data.Expressions.ExpressionNode },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        ///<var nam
        var result = "[" + this.items.map(function (item) { return item.toString(); }).join(",") + "]";
        return result;
    }
}, null);

$C('$data.Expressions.CallExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (expression, member, args) {
        ///<summary>Represents a call to an object or global method</summary>
        ///<field name="object" type="$data.Expressions.ExpressionNode">The expression for object that has the method</field>
        ///<field name="member" type="$data.MemberDefinition">The member descriptor</field>
        this.expression = expression;
        this.member = member;
        this.args = args;
    },

    nodeType: {
        value: $data.Expressions.ExpressionType.Call
    },

    expression: {
        value: undefined,
        dataType: $data.Expressions.ExpressionNode,
        writable: true
    },

    member: {
        value: undefined,
        dataType: $data.MemberDefinition,
        writable: true
    },

    type: {
        value: undefined,
        writable: true
    },

    implementation: {
        get: function () {
            return function(thisObj, method, args) {
                if (typeof method !== 'function') {
                    method = thisObj[method];
                }
                Guard.requireType("method", method, Function);
                return method.apply(thisObj, args);
            };
        },
        set: function (value) { Guard.raise("Property can not be set"); }
    },

    toString: function (debug) {
        return this.object.toString() + "." + this.member.toString() + "(" + ")";
    }

});
$C('$data.Expressions.CodeParser', null, null, {

    constructor: function (scopeContext) {
        ///<signature>
        ///<param name="scopeContext" type="$data.Expressions.EntityContext" />
        ///</signature>
        ///<signature>
        ///</signature>
        this.scopeContext = scopeContext;
        this.lambdaParams = [];
    },

    log: function(logInfo) {
        if (this.scopeContext)
            this.scopeContext.log(logInfo);
    },

    parseExpression: function (code, resolver) {
        ///<signature>
        ///<summary>Parses the provided code and returns a parser result with parser information</summary>
        ///<param name="code" type="string">The JavaScript code to parse &#10;ex: "function (a,b,c) { return a + b /c }"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>
        if (typeof code === 'object') { code = ''; }
        var result = {
            success: true,
            errorMessage: '',
            errorDetails: ''
        };
        ///<var name="AST" type="Date" />
        
        //console.log(code.toString());
        if ($data.Acorn){
            //console.log('using acorn.js');
            return { success: true, expression: this.ParserBuild($data.Acorn.parse('(' + code.toString() + ')').body[0]), errors: [] };
        }else if ($data.Esprima){
            //console.log('using esprima.js');
            return { success: true, expression: this.ParserBuild($data.Esprima.parse('(' + code.toString() + ')').body[0]), errors: [] };
        }else{
            //console.log('using JayLint');
            var AST = $data.ASTParser.parseCode(code);
            this.log({ event: "AST", data: AST });
            if (!AST.success) {
                return {
                    success: false,
                    error: "ASTParser error",
                    errorMessage: (AST.errors) ? JSON.stringify(AST.errors) : "could not get code"
                };
            }
            var b = this.Build2(AST.tree.first[0]);
            result = { success: true, expression: b, errors: AST.errors };
            return result;
        }
    },

    createExpression: function (code, resolver) {
        ///<signature>
        ///<summary>Parses the provided code and returns a JavaScript code expression tree</summary>
        ///<param name="code" type="string">The JavaScript code to parse &#10;ex: "a + b /c"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>
        ///<signature>
        ///<summary>Parses the provided code and returns a JavaScript code expression tree</summary>
        ///<param name="code" type="Function">The JavaScript function to parse &#10;ex: "function (a,b,c) { return a + b /c }"</param>
        ///<param name="resolver" type="string">The ParameterResolver class that resolves vaiable and parameteres references</param>
        ///<returns type="$data.Expressions.ExpressionParserResult" />
        ///</signature>

        var result = this.parseExpression(code, resolver);
        if (!result.success) {
            Guard.raise("ExpressionParserError: " + result.errorMessage);
        }
        return result.expression;
    },
    
    ParserBuild: function(node){
        //console.log(node);
        return this['Parser' + node.type](node);
    },
    
    ParserExpressionStatement: function(node){
        return this.ParserBuild(node.expression);
    },
    
    ParserBlockStatement: function(node){
        return this.ParserBuild(node.body[0]);
    },
    
    ParserReturnStatement: function(node){
        return this.ParserBuild(node.argument);
    },
    
    ParserMemberExpression: function(node){
        return new $data.Expressions.PropertyExpression(
            this.ParserBuild(node.object),
            new $data.Expressions.ConstantExpression(node.property.name || node.property.value, typeof (node.property.name || node.property.value))
        );
    },
    
    ParserIdentifier: function(node){
        return this.ParserParameter(node,
            this.lambdaParams.indexOf(node.name) > -1
                ? $data.Expressions.ExpressionType.LambdaParameterReference
                : $data.Expressions.ExpressionType.Parameter
            );
    },
    
    ParserObjectExpression: function(node){
        var props = new Array(node.properties.length);
        for (var i = 0; i < node.properties.length; i++){
            props[i] = this.ParserProperty(node.properties[i]);
        }
        
        return new $data.Expressions.ObjectLiteralExpression(props);
    },
    
    ParserArrayExpression: function(node){
        var items = new Array(node.elements.length);
        for (var i = 0; i < node.elements.length; i++){
            items[i] = this.ParserBuild(node.elements[i]);
        }
        
        return new $data.Expressions.ArrayLiteralExpression(items);
    },
    
    ParserProperty: function(node){
        return new $data.Expressions.ObjectFieldExpression(node.key.name, this.ParserBuild(node.value));
    },
    
    ParserFunctionExpression: function(node){
        var params = new Array(node.params.length);
        for (var i = 0; i < node.params.length; i++){
            this.lambdaParams.push(node.params[i].name);
            params[i] = this.ParserParameter(node.params[i], $data.Expressions.ExpressionType.LambdaParameter);
            params[i].owningFunction = result;
        }
        var result = new $data.Expressions.FunctionExpression(node.id ? node.id.name : node.id, params, this.ParserBuild(node.body));

        return result;
    },
    
    ParserParameter: function(node, nodeType){
        var result = new $data.Expressions.ParameterExpression(node.name, null, nodeType);
        if (nodeType == $data.Expressions.ExpressionType.LambdaParameterReference){
            result.paramIndex = this.lambdaParams.indexOf(node.name);
        }
        
        return result;
    },
    
    ParserLogicalExpression: function(node){
        return this.ParserBinaryExpression(node);
    },
    
    ParserOperators: {
        value: {
            "==": { expressionType: $data.Expressions.ExpressionType.Equal, type: "boolean", implementation: function (a, b) { return a == b; } },
            "===": { expressionType: $data.Expressions.ExpressionType.EqualTyped, type: "boolean", implementation: function (a, b) { return a === b; } },
            "!=": { expressionType: $data.Expressions.ExpressionType.NotEqual, type: "boolean", implementation: function (a, b) { return a != b; } },
            "!==": { expressionType: $data.Expressions.ExpressionType.NotEqualTyped, type: "boolean", implementation: function (a, b) { return a !== b; } },
            ">": { expressionType: $data.Expressions.ExpressionType.GreaterThen, type: "boolean", implementation: function (a, b) { return a > b; } },
            ">=": { expressionType: $data.Expressions.ExpressionType.GreaterThenOrEqual, type: "boolean", implementation: function (a, b) { return a >= b; } },
            "<=": { expressionType: $data.Expressions.ExpressionType.LessThenOrEqual, type: "boolean", implementation: function (a, b) { return a <= b; } },
            "<": { expressionType: $data.Expressions.ExpressionType.LessThen, type: "boolean", implementation: function (a, b) { return a < b; } },
            "&&": { expressionType: $data.Expressions.ExpressionType.And, type: "boolean", implementation: function (a, b) { return a && b; } },
            "||": { expressionType: $data.Expressions.ExpressionType.Or, type: "boolean", implementation: function (a, b) { return a || b; } },
            "&": { expressionType: $data.Expressions.ExpressionType.AndBitwise, type: "number", implementation: function (a, b) { return a & b; } },
            "|": { expressionType: $data.Expressions.ExpressionType.OrBitwise, type: "number", implementation: function (a, b) { return a | b; } },
            "+": { expressionType: $data.Expressions.ExpressionType.Add, type: "number", implementation: function (a, b) { return a + b; } },
            "-": { expressionType: $data.Expressions.ExpressionType.Subtract, type: "number", implementation: function (a, b) { return a - b; } },
            "/": { expressionType: $data.Expressions.ExpressionType.Divide, type: "number", implementation: function (a, b) { return a / b; } },
            "%": { expressionType: $data.Expressions.ExpressionType.Modulo, type: "number", implementation: function (a, b) { return a % b; } },
            "*": { expressionType: $data.Expressions.ExpressionType.Multiply, type: "number", implementation: function (a, b) { return a * b; } },
            "[": { expressionType: $data.Expressions.ExpressionType.ArrayIndex, type: "number", implementation: function (a, b) { return a[b]; } },
            "in": { expressionType: $data.Expressions.ExpressionType.In, type: 'boolean', implementation: function (a, b) { return a in b; } }
        }
    },
    
    ParserUnaryOperators: {
        value: {
            "+": { arity: "prefix", expressionType: $data.Expressions.ExpressionType.Positive, type: "number", implementation: function (operand) { return +operand; } },
            "-": { arity: "prefix", expressionType: $data.Expressions.ExpressionType.Negative, type: "number", implementation: function (operand) { return -operand; } },
            "++true": { arity: "prefix", expressionType: $data.Expressions.ExpressionType.Increment, type: "number", implementation: function (operand) { return ++operand; } },
            "--true": { arity: "prefix", expressionType: $data.Expressions.ExpressionType.Decrement, type: "number", implementation: function (operand) { return --operand; } },
            "++false": { arity: "suffix", expressionType: $data.Expressions.ExpressionType.Increment, type: "number", implementation: function (operand) { return operand++; } },
            "!": { arity: "prefix", expressionType: $data.Expressions.ExpressionType.Not, type: "boolean", implementation: function (operand) { return !operand; } },
            "--false": { arity: "suffix", expressionType: $data.Expressions.ExpressionType.Decrement, type: "number", implementation: function (operand) { return operand--; } }
        }
    },
    
    ParserUnaryExpression: function(node){
        return new $data.Expressions.UnaryExpression(this.ParserBuild(node.argument), this.ParserUnaryOperators[node.operator], this.ParserUnaryOperators[node.operator].expressionType);
    },
    
    ParserUpdateExpression: function(node){
        return new $data.Expressions.UnaryExpression(this.ParserBuild(node.argument), this.ParserUnaryOperators[node.operator + node.prefix], this.ParserUnaryOperators[node.operator + node.prefix].nodeType);
    },
    
    ParserBinaryExpression: function(node){
        return new $data.Expressions.SimpleBinaryExpression(
            this.ParserBuild(node.left),
            this.ParserBuild(node.right),
            this.ParserOperators[node.operator].expressionType,
            node.operator,
            this.ParserOperators[node.operator].type
        );
    },
    
    ParserThisExpression: function(node){
        return new $data.Expressions.ThisExpression();
    },
    
    ParserLiteral: function(node){
        return new $data.Expressions.ConstantExpression(node.value, typeof node.value);
    },
    
    ParserCallExpression: function(node){
        var method = this.ParserBuild(node.callee);
        var args = new Array(node.arguments.length);
        for (var i = 0; i < node.arguments.length; i++){
            args[i] = this.ParserBuild(node.arguments[i]);
        }
        
        var member;
        var expression;
        switch (true){
            case method instanceof $data.Expressions.PropertyExpression:
                expression = method.expression;
                member = method.member;
                break;
            case method instanceof $data.Expressions.ParameterExpression:
                expression = new $data.Expressions.ConstantExpression(null, typeof null);
                member = method;
                break;
        }

        return new $data.Expressions.CallExpression(expression, member, args);
    }/*,

    Build2: function (node) {
        ///<param name="node" type="Lint" />
        ///<returns type="$data.Expressions.ExpressionNode" />
        var n;
        switch (node.arity) {
            case "number":
            case "string":
                n = this.BuildConstant(node);
                break;
            case "prefix":
                switch (node.value) {
                    case "{": 
                        n = this.BuildObjectLiteral(node);
                        break;
                    case "[":
                        n = this.BuildArrayLiteral(node);
                        break;
                    case $data.unaryOperators.resolve(node.value):
                        n = this.BuildUnary(node);
                        break;
                    //TODO: default case
                }
                break;
            case "suffix":
                switch (node.value) {
                    case $data.unaryOperators.resolve(node.value):
                        n = this.BuildUnary(node);
                        break;
                    default:
                        Guard.raise("Unknown suffix: " + node.value);
                }
                break;
            case "infix":
                switch (node.value) {
                    case "[":
                        n = this.BuildArray(node);
                        break;
                    case $data.binaryOperators.resolve(node.value):
                        n = this.BuildSimpleBinary(node);
                        break;
                    case "function":
                        Guard.raise("Unexpected function arity");
                    case "(":
                        n = this.BuildCall(node);
                        break;
                    case ".":
                        n = this.BuildProperty(node);
                        break;
                    default:
                        debugger;
                        //TODO: remove debugger, throw exception or break
                }
                break;
            case "statement":
                switch (node.value) {
                    case "function":
                        n = this.BuildFunction(node);
                        //TODO: consider adding break
                }
                break;
            default:
                switch (node.value) {
                    case "function":
                        n = this.BuildFunction(node);
                        break;
                    case "true":
                    case "false":
                    case "null":
                        n = this.BuildConstant(node);
                        break;
                    case "this":
                        n = this.BuildThis(node);
                        break;
                    default:
                        n = this.BuildParameter(node);
                        break;
                }
        }
        return n;
    },

    BuildThis: function (node) {
        var result = Container.createThisExpression();
        return result;
    },

    BuildConstant: function (node) {
        ///<param name="node" type="ConstantASTNode" />
        var value = node.value;
        var type = node.type;
        if (node.reserved === true) {
            switch (node.value) {
                case "true": value = true; type = typeof true; break;
                case "false": value = false; type = typeof false; break;
                case "null": value = null; type = typeof null; break;
                //TODO: missing default case
            }
        }
        var result = new $data.Expressions.ConstantExpression(value, type);
        return result;
    },

    BuildFunctionParameter: function (node) {

    },
    
    BuildArray: function (node) {
        switch (node.second.type) {
            case "string":
                return this.BuildProperty(node);
            case "number":
            default:
                return this.BuildSimpleBinary(node);
        }
    },

    BuildParameter: function (node) {
        ///<param name="node" type="ParameterASTNode" />
        ///<returns type="$data.Expressions.ParameterExpression" />
        var paramName = node.value;
        //TODO
        //var paramType = this.resolver.resolveParameterType(node);
        var nodeType = node.funct ? $data.Expressions.ExpressionType.LambdaParameter :
                                    this.lambdaParams.indexOf(node.value) > -1 ?
                                                $data.Expressions.ExpressionType.LambdaParameterReference : $data.Expressions.ExpressionType.Parameter;
        var result = new $data.Expressions.ParameterExpression(node.value, null, nodeType);

        if (nodeType == $data.Expressions.ExpressionType.LambdaParameterReference) {
            result.paramIndex = this.lambdaParams.indexOf(node.value);
        }

        return result;
    },

    BuildArrayLiteral: function(node) {
        var self = this;
        var items = node.first.map(function (item) { return self.Build2(item); });
        var result = new $data.Expressions.ArrayLiteralExpression(items);
        return result;
    },

    BuildObjectLiteral: function (node) {
        var self = this;
        var fields = node.first.map(function (item) {
            var eItem = self.Build2(item.first);
            var result = new $data.Expressions.ObjectFieldExpression(item.value, eItem);
            return result;
        });
        var result = new $data.Expressions.ObjectLiteralExpression(fields);
        return result;
    },

    BuildFunction: function (node) {
        ///<param name="node" type="FunctionASTNode"/>
        ///<returns type="$data.Expressions.FunctionExpression" />
        var self = this;
        var paramStack = [];
        var params = node.first && node.first.map(function (paramNode) {
            //paramStack.push(paramNode.value);
            this.lambdaParams.push(paramNode.value);
            return self.BuildParameter(paramNode);
        }, this);
        params = params || [];

        //skipping return for convenience
        //Possible we should raise an error as predicates and selectors can
        //not be code blocks just expressions

        var hasReturn = node.block.length == 0 ? false :
            node.block[0].value === "return" ? true : false;
        var body = (node.block.length > 0) ? this.Build2(hasReturn ? node.block[0].first : node.block[0]) : null;

        paramStack.forEach(function () { this.lambdaParams.pop(); }, this);

        var result = new $data.Expressions.FunctionExpression(node.value, params, body);
        params.forEach(function (param) {
            param.owningFunction = result;
        });

        //TODO place on prototyope
        result.name = node.name;
        return result;
    },

    BuildCall: function (node) {
        var self = this;
        var method = self.Build2(node.first);
        var args = node.second.map(function (exp) { return self.Build2(exp); });
        var member;
        var expression;
        switch(true){
            case method instanceof $data.Expressions.PropertyExpression:
                expression = method.expression;
                member = method.member;
                break;
            case method instanceof $data.Expressions.ParameterExpression:
                expression = Container.createConstantExpression(null, typeof null);  
                member = method;
                break;
            //TODO: missing default case
        }

        var result = Container.createCallExpression(expression, member, args);
        return result;
    },

    BuildProperty: function (node) {
        ///<summary>Builds a PropertyExpression from the AST node</summary>
        ///<param name="node" type="MemberAccessASTNode" />
        ///<returns type="$data.Expressions.PropertyExpression" />
        var expression = this.Build2(node.first);
        //TODO
        //var type = expression.type;
        //var member = type.getMemberDefinition()
        //TODO how to not if?????
        var member;
        if (node.second.identifier) {
            member = new $data.Expressions.ConstantExpression(node.second.value, "string");
        } else {
            member = this.Build2(node.second);
        }
        var result = new $data.Expressions.PropertyExpression(expression, member);
        return result;
    },


    BuildUnary: function(node) {
        var operator = $data.unaryOperators.getOperator(node.value, node.arity);
        var nodeType = operator.expressionType;
        var operand = this.Build2(node.first);
        var result = new $data.Expressions.UnaryExpression(operand, operator, nodeType);
        return result;
    },

    BuildSimpleBinary: function (node) {
        ///<param name="node" type="LintInflixNode" />

        var operator = $data.binaryOperators.getOperator(node.value);
        var nodeType = operator.expressionType;

        var left = this.Build2(node.first || node.left);
        var right = this.Build2(node.second || node.right);
        var result = new $data.Expressions.SimpleBinaryExpression(left, right, nodeType, node.value, operator.type);
        return result;
    }   

    //Build: function (node, expNode) {
    //    var n;
    //    switch (node.arity) {
    //        case "ternary":
    //            if (node.value == "?")
    //                n = this.BuildDecision(node, expNode);
    //            else
    //                Guard.raise("Value of ternary node isn't implemented: " + node.value);
    //            break;
    //        case null:
    //        default:
    //            Guard.raise("Arity isn't implemented: " + node.arity);
    //    }
    //    return n;
    //},*/

});

$C('$data.Expressions.ConstantExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (value, type, name) {
        this.value = value;
        //TODO
        //this.type = Container.getTypeName(value);

        this.type = type;
        this.name = name;
        if (!Object.isNullOrUndefined(this.value)) {
            this.type = Container.resolveType(this.type)
            if (Container.resolveType(Container.getTypeName(this.value)) !== this.type)
                this.value = Container.convertTo(value, this.type);
        }
    },
    nodeType: { value: $data.Expressions.ExpressionType.Constant, enumerable: true },
    type: { value: Object, writable: true },
    value: { value: undefined, writable: true },
    toString: function (debug) {
        //return "[constant: " + this.value.toString() + "]";
        return this.value.toString();
    }
});


$C('$data.Expressions.FunctionExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (name, parameters, body) {
        ///<signature>
        ///<summary>Represents a function declaration.</summary>
        ///<param name="name" type="String">Function name</param>
        ///<param name="parameters" type="Array" elementType="$data.Expressions.ParameterExpression">The list of function parameters</param>
        ///<param name="body" type="$data.Expressions.ExpressionNode" />
        ///</signature>
        ///<field name="parameters" type="Array" elementType="$data.Expressions.ParameterExpression">The list of function parameters</field>
        ///<field name="body" type="$data.Expressions.ExpressionNode">The function body</field>

        this.parameters = parameters || [];
        this.name = name;
        this.body = body;
    },

    toString: function (debug) {
        var paramStrings = this.parameters.map(function (p) {
            return p.toString();
        });
        paramStrings = paramStrings.join(",");
        var bodyString = (this.body ? this.body.toString(debug) : '');
        return "function " + this.name + "(" + paramStrings + ") { " + bodyString + "}";
    },
    nodeType: { value: $data.Expressions.ExpressionType.Function, writable: true },
    parameters: { value: undefined, dataType: Array, elementType: $data.Expressions.ParameterExpression },
    body: { value: undefined, dataType: $data.Expressions.ExpressionNode },
    type: {}
}, null);
$C('$data.Expressions.ObjectFieldExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (fieldName, expression) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        this.fieldName = fieldName;
        this.expression = expression;
    },
    nodeType: { value: $data.Expressions.ExpressionType.ObjectField, writable: true },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);

$C('$data.Expressions.ObjectLiteralExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (members) {
        ///<summary>Represent an object initializer literal expression &#10;Ex: { prop: value}</summary>
        ///<param name="member" type="Array" elementType="$data.Expressions.ObjectFieldExpression" />
        this.members = members;
    },
    nodeType: { value: $data.Expressions.ExpressionType.ObjectLiteral, writable: true },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    },

    implementation: {
        get: function () {
            return function(namesAndValues) {
                var result = { };
                namesAndValues.forEach(function(item) {
                    result[item.name] = item.value;
                });
                return result;
            };
        },
        set: function () {
        }
    }

}, null);
$C('$data.Expressions.PagingExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, expression, nType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        this.source = source;
        this.amount = expression;
        this.nodeType = nType;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Unknown, writable: true },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);
$C('$data.Expressions.ParameterExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (name, type, nodeType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        //this.writePropertyValue("name", name);
        //this.writePropertyValue("type", type);
        this.nodeType = nodeType || $data.Expressions.ExpressionType.Parameter;
        this.name = name;
        this.type = type || "unknown";
        var _owningFunction;
    },

    owningFunction: { value: undefined, enumerable: false },
    nodeType: { value: $data.Expressions.ExpressionType.Parameter, writable: true },
    name: { value: undefined, dataType: String, writable: true },
    type: { value: undefined, dataType: "object", writable: true},
    toString: function (debug) {
        var result;
        result = debug ? this.type + " " : "";
        result = result + this.name;
        return result;
    }
}, null);
$C('$data.Expressions.PropertyExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (expression, member) {
        ///<summary>Represents accessing a property or field of an object</summary>
        ///<param name="expression" type="$data.Expressions.ExpressionNode">The expression for the property owner object</param>
        ///<param name="member" type="$data.Expressions.ConstantExpression">The member descriptor</param>
        ///<field name="expression" type="$data.Expressions.ExpressionNode">The expression for the property owner object</field>
        ///<field name="member" type="$data.Expression.ConstantExpression">The member descriptor</field>

        this.expression = expression;
        this.member = member;

        this.type = member.dataType;
    },

    nodeType: {
        value: $data.Expressions.ExpressionType.MemberAccess
    },

    expression: {
        value: undefined,
        dataType: $data.Expressions.ExpressionNode,
        writable: true
    },

    implementation: {
        get: function () {
            return function (holder, memberName) {
                if (holder[memberName] === undefined)
                    Guard.raise(new Exception("Parameter '" + memberName + "' not found in context", 'Property not found!'));
                return holder[memberName];
            };
        },
        set: function () {
        }
    },

    member: {
        value: undefined,
        dataType: $data.MemberDefinition,
        writable: true
    },

    type: {
        value: undefined,
        writable: true
    },

    toString: function (debug) {
        return this.expression.toString() + "." + this.member.toString();
    }

});

$C('$data.Expressions.SimpleBinaryExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (left, right, nodeType, operator, type, resolution) {
        ///<summary>Represents a bin operation with left and right operands and an operator///</summary>
        ///<param name="left" type="$data.Expression.ExpressionNode">The left element of the binary operation</param>
        ///<param name="right" type="$data.Expression.ExpressionNode">The right element of the binary operation</param>
        ///<field name="implementation" type="function" />
        this.left = left;
        this.right = right;
        this.nodeType = nodeType;
        this.operator = operator;
        this.type = type;
        this.resolution = resolution;
    },

    implementation: {
        get: function () {
            return $data.binaryOperators.getOperator(this.operator).implementation;
        },
        set: function () { }

    },
    //nodeType: { value: $data.Expressions.ExpressionType },
    type: { value: "number", writable: true }
});
$C('$data.Expressions.ThisExpression', $data.Expressions.ExpressionNode, null, {
    nodeType: { value: $data.Expressions.ExpressionType.This }
});
$C('$data.Expressions.ExpressionVisitor', null, null,
    {
        constructor: function () {
            this._deep = 0;
        },

        Visit: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNode"/>
            
            //this._deep = this._deep + 1;
            if (!eNode) {
                return eNode;
            }

            var result = null;
            
                switch (eNode.expressionType) {
                    case $data.Expressions.ParameterExpression:
                        result = this.VisitParameter(eNode, context);
                        break;
                    case $data.Expressions.ConstantExpression:
                        result = this.VisitConstant(eNode, context);
                        break;
                    case $data.Expressions.FunctionExpression:
                        result = this.VisitFunction(eNode, context);
                        break;
                    case $data.Expressions.CallExpression:
                        result = this.VisitCall(eNode, context);
                        break;
                    case $data.Expressions.SimpleBinaryExpression:
                        result = this.VisitBinary(eNode, context);
                        break;
                    case $data.Expressions.PropertyExpression:
                        result = this.VisitProperty(eNode, context);
                        break;
                        //result = th
                    case $data.Expressions.ThisExpression:
                        result = this.VisitThis(eNode, context);
                        break;
                    case $data.Expressions.ObjectLiteralExpression:
                        result = this.VisitObjectLiteral(eNode, context);
                        break;
                    case $data.Expressions.ObjectFieldExpression:
                        result = this.VisitObjectField(eNode, context);
                        break;
                    case $data.Expressions.ArrayLiteralExpression:
                        result = this.VisitArrayLiteral(eNode, context);
                        break;
                    case $data.Expressions.UnaryExpression:
                        result = this.VisitUnary(eNode, context);
                        break;
                    case $data.Expressions.EntityContextExpression:
                        result = this.VisitEntityContext(eNode, context);
                        break;
                    default:
                        debugger;
                        break;
                    //case VARIABLE:

                    //    result = this.VisitVariable(eNode, context);
                    //    break;
                    //case MEMBERACCESS:
                    //    result = this.VisitMember(eNode, context);
                    //    break;
                    //case BINARY:
                    //    result = this.VisitBinary(eNode, context);
                    //    break;
                    //case UNARY:
                    //    result = this.VisitUnary(eNode, context);
                    //    break;
                    //case INCDEC:
                    //    result = this.VisitIncDec(eNode, context);
                    //    break;
                    //case EQUALITY: result = this.VisitEquality(eNode, context); break;
                    //case DECISION: result = this.VisitDecision(eNode, context); break;
                    //case METHODCALL: result = this.VisitMethodCall(eNode, context); break;
                    //case NEW: result = this.VisitNew(eNode, context); break;
                    //case JSONASSIGN: result = this.VisitJsonAssign(eNode, context); break;
                    //case ARRAYACCESS: result = this.VisitArrayAccess(eNode, context); break;
                    //default:
                    //    Guard.raise("Type isn't implemented: " + eNode.type);
                }
            
            this._deep = this._deep - 1;
            return result;
        },

        VisitArrayLiteral: function(eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ArrayLiteralExpression" />
            var self = this;
            var items = eNode.items.map(function (item) {
                return self.Visit(item, context);
            });
            var result = Container.createArrayLiteralExpression(items);
            return result;
        },

        VisitObjectLiteral: function(eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ObjectLiteralExpression" />
            var self = this;
            var members = eNode.members.map(function (member) {
                return self.Visit(member, context);
            });
            var result = Container.createObjectLiteralExpression(members);
            return result;
        },

        VisitObjectField: function(eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ObjectLiteralExpression" />
            var expression = this.Visit(eNode.expression, context);
            var result = Container.createObjectFieldExpression(eNode.fieldName, expression);
            return result;
        },

        VisitThis: function (eNode, context) {
            return eNode;
        },
        VisitCall: function (eNode, context) {
            ///<param name="eNode" type="$data.Expressions.CallExpression" />
            var self = this;
            var args = eNode.args.map(function (arg) { return this.Visit(arg, context); }, this);
            var expression = this.Visit(eNode.expression, context);
            var member = this.Visit(eNode.member, context);
            return new $data.Expressions.CallExpression(expression, member, args);
        },

        VisitParameter: function(eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
            ///<returns type="$data.Expressions.ParameterExpression" />
            //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
            return eNode;
        },

        VisitConstant: function (eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
            ///<returns type="$data.Expressions.ParameterExpression" />
            //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
            return eNode;
        },

        VisitFunction: function(eNode, context) {
            ///<param name="eNode" type="$data.Expressions.FunctionExpression" />
            var self = this;

            var params = eNode.parameters.map(function (p, i) {
                return self.Visit(p, context);
            });

            var body = self.Visit(eNode.body, context);
            var result = new $data.Expressions.FunctionExpression(eNode.name, params, body);
            return result;
        },

        VisitBinary: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.SimpleBinaryExpression"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            return new $data.Expressions.SimpleBinaryExpression(left, right, eNode.nodeType, eNode.operator, eNode.type);
        },

        VisitProperty: function (eNode, context) {
            ///<param name="eNode" type="$data.Expressions.PropertyExpression" />
            var expression = this.Visit(eNode.expression, context);
            var member = this.Visit(eNode.member, context);
            return new $data.Expressions.PropertyExpression(expression, member);
            //var member = 
        },

        VisitUnary: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.UnaryExpression"/>
            ///<param name="context" type="Object"/>
            ///<returns type="$data.Expressions.UnaryExpression"/>
            var operand = this.Visit(eNode.operand, context);
            if (operand === eNode.operand) 
                return eNode;
            return new $data.Expressions.UnaryExpression(operand, eNode.operator, eNode.nodeType);
        },

        VisitEntityContext: function (eNode, context) {
            ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
            ///<returns type="$data.Expressions.EntityContextExpression" />
            //var result  = new $data.Expressions.ParameterExpression(eNode.name, eNode.type, eNode.nodeType);
            return eNode;
        },

        VisitDecision: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>

            var expression = this.Visit(eNode.expression, context);
            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            if (expression === eNode.expression && left === eNode.left && right === eNode.right)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
        },

        VisitNew: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>

            var values = this.VisitArray(eNode.values, context);
            if (values === eNode.values)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
        },
        VisitArrayAccess: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>

            var array = this.Visit(eNode.array, context);
            var index = this.Visit(eNode.index, context);
            if (array === eNode.array && index === eNode.index)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
        },
        VisitArray: function (eNodes, context) {
            var args = [];
            var ok = true;
            for (var i = 0; i < eNodes.length; i++) {
                args[i] = this.Visit(eNodes[i], context);
                ok = ok && args[i] === eNodes[i];
            }
            return ok ? eNodes : args;
        },
        GetMemberChain: function (memberAccess, context) {
            // { type:MEMBERACCESS, executable:true, expression:, member: }
            if (memberAccess.expression.type == MEMBERACCESS) {
                var a = this.GetMemberChain(memberAccess.expression, context);
                a.push(memberAccess.member);
                return a;
            }
            return [memberAccess.expression, memberAccess.member];
        }
    }, {});$C("$data.Expressions.ParameterProcessor", $data.Expressions.ExpressionVisitor, null, {
    constructor: function () {
        ///<summary>Provides a base class for several ParameterProcessors like GlobalParameterProcessor or LambdaParameterProcessor</summary>
    },

    Visit: function (node, context) {
        if ((node instanceof $data.Expressions.ParameterExpression ||
            node instanceof $data.Expressions.ThisExpression)
            && this.canResolve(node)) {
            var result = this.resolve(node, context);
            if (result !== node)
                result["resolvedBy"] = this.constructor.name;
            return result;
        } else {
            return node;
        }
    },

    canResolve: function (paramExpression) {
        ///<returns type="boolean" />
        Guard.raise("Pure method");
    },
    resolve: function (paramExpression) {
        ///<returns type="XXX" />
        Guard.raise("Pure method");
    }
});
$C("$data.Expressions.GlobalContextProcessor", $data.Expressions.ParameterProcessor, null, {
    constructor: function (global) {
        ///<param name="global" type="object" />
        this.global = global;
    },

    canResolve: function (paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        return paramExpression.nodeType == $data.Expressions.ExpressionType.Parameter && this.global && typeof this.global === 'object' &&
               paramExpression.name in this.global;
    },

    resolve: function (paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ExpressionNode" />
        var resultValue = this.global[paramExpression.name];
        var expression = Container.createConstantExpression(resultValue, typeof resultValue, paramExpression.name);
        return expression;
    }

});



$C("$data.Expressions.ConstantValueResolver", $data.Expressions.ParameterProcessor, null, {
    constructor: function (paramsObject, global, scopeContext) {
        ///<param name="global" type="object" />
        this.globalResolver = Container.createGlobalContextProcessor(global);
        this.paramResolver = Container.createGlobalContextProcessor(paramsObject);
        this.paramsObject = paramsObject;
        this.scopeContext = scopeContext;
    },

    canResolve: function (paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        return (paramExpression.name === '$context') || (paramExpression.nodeType == $data.Expressions.ExpressionType.This && this.paramsObject)
                    ? true : (this.paramResolver.canResolve(paramExpression) || this.globalResolver.canResolve(paramExpression));
    },

    resolve: function (paramExpression) {
        ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ExpressionNode" />
        if (paramExpression.name === '$context') {
            return Container.createEntityContextExpression(this.scopeContext);
        }
        if (paramExpression.nodeType == $data.Expressions.ExpressionType.This) {
            return Container.createConstantExpression(this.paramsObject, typeof this.paramsObject, 'this');
        }
        return this.paramResolver.canResolve(paramExpression) ? this.paramResolver.resolve(paramExpression) : this.globalResolver.resolve(paramExpression);
    }

});$C("$data.Expressions.LocalContextProcessor", $data.Expressions.GlobalContextProcessor, null, {
    constructor: function (evalMethod) {
        ///<param name="global" type="object" />
        this.canResolve = function (paramExpression) {
            ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
            return paramExpression.nodeType == $data.Expressions.ExpressionType.Parameter &&
                (evalMethod("typeof " + paramExpression.name) !== 'undefined');
        };
        this.resolve = function(paramExpression) {
            ///<param name="paramExpression" type="$data.Expressions.ParameterExpression" />
            ///<returns type="$data.Expressions.ExpressionNode" />
            var resultValue = evalMethod(paramExpression.name);
            var expression = Container.createConstantExpression(resultValue, typeof resultValue);
            return expression;
        };

    }
    });
$C("$data.Expressions.LambdaParameterProcessor", $data.Expressions.ParameterProcessor, null, {
    constructor: function (lambdaParameterTypeInfos) {
        ///<param name="global" />
        ///<param name="evalMethod" />
        var paramIndices = {};
        var $idx = "name";

        this.canResolve = function (paramExpression, context) {
            if (paramExpression.nodeType == $data.Expressions.ExpressionType.LambdaParameter) {
                var fnParams = paramExpression.owningFunction.parameters;

                if (fnParams.length == 1 && paramExpression.name == fnParams[0].name) {
                    paramIndices[paramExpression.name] = lambdaParameterTypeInfos[0];
                    return true;
                }

                for (var j = 0; j < fnParams.length; j++) {
                    if (fnParams[j].name == paramExpression.name) {
                        paramIndices[paramExpression.name] = lambdaParameterTypeInfos[j];
                        return true;
                    }
                }
                return false;
            }
            return false;
        };

        this.resolve = function(paramExpression, context) {
            var lambdaParamType = paramIndices[paramExpression.name];
            var result = Container.createParameterExpression(paramExpression.name,
                lambdaParamType,
                $data.Expressions.ExpressionType.LambdaParameter);
            result.owningFunction = paramExpression.owningFunction;
            return result;
        };
    }

});
$C('$data.Expressions.ParameterResolverVisitor', $data.Expressions.ExpressionVisitor, null, {

    constructor: function (expression, resolver) {
    	/// <summary>
    	/// ParameterResolverVisitor traverses the JavaScript Code Expression tree and converts
        /// outer but otherwise execution local variable references into ConstantExpressions-t.
        /// for example: context.Persons.filter(function(p) { return p.Name == document.location.href })
        /// is transformed into a constant that has the current href as its value
    	/// </summary>
    	/// <param name="expression"></param>
    	/// <param name="resolver"></param>
        this.lambdaParamCache = {};
    },

    Visit: function (expression, resolver) {
        ///<param name="expression" type="$data.Expressions.ExpressionNode" />
        ///<param name="resolver" type="$data.Expressions.Resolver" />
        //TODO base call is just ugly
        return $data.Expressions.ExpressionVisitor.prototype.Visit.call(this, expression, resolver);

    },


    VisitArrayLiteral: function(eNode, context) {
        var self = this;
        var items = eNode.items.map(function (item) { return self.Visit(item, context); });
        var allLocal = items.every(function (item) {
            return item instanceof $data.Expressions.ConstantExpression;
        });

        if (allLocal) {
            items = items.map(function (item) { return item.value });
            return Container.createConstantExpression(items, "array");
        } else {
            return Container.createArrayLiteralExpression(items);
        }
    },

    VisitObjectLiteral: function(eNode, context) {
        var self = this;
        var members = eNode.members.map(function (item) { return self.Visit(item, context); });
        var allLocal = members.every(function (member) {
            return member.expression instanceof $data.Expressions.ConstantExpression;
        });

        if (allLocal) {
            var params = members.map(function (member) { return { name: member.fieldName, value: member.expression.value }; });
            var value = eNode.implementation(params);
            return Container.createConstantExpression(value, typeof value);
        } else {
            return Container.createObjectLiteralExpression(members);
        }
    },

    VisitThis: function(eNode, resolver) {
        return resolver.Visit(eNode, resolver);
    },

    VisitParameter: function(eNode, resolver) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<param name="resovler" type="$data.Expressions.ParameterResolver" />
        ///<returns type="$data.Expressions.ParameterExpression" />

        var node;
        ///TODO let the resolver handle lambdaReferences if it wants to deal with it
        switch(eNode.nodeType){
            case $data.Expressions.ExpressionType.Parameter:
            case $data.Expressions.ExpressionType.LambdaParameter:
                node = resolver.Visit(eNode, resolver);
                if (node.nodeType == $data.Expressions.ExpressionType.LambdaParameter) {
                    this.lambdaParamCache[node.name] = node;
                }
                return node;
            case $data.Expressions.ExpressionType.LambdaParameterReference:
                var lambdaParam = this.lambdaParamCache[eNode.name];
                if (lambdaParam) {
                    node = Container.createParameterExpression(eNode.name,
                            lambdaParam.type,
                            $data.Expressions.ExpressionType.LambdaParameterReference);
                    node.paramIndex = eNode.paramIndex;
                    //node.typeName = lambdaParam.type.name || lambdaParam.type;
                    return node;
                }
                break;
            default:
                return eNode;

        }
            

        return eNode;
    },

    VisitConstant: function (eNode, context) {
        ///<param name="eNode" type="$data.Expressions.ParameterExpression" />
        ///<returns type="$data.Expressions.ParameterExpression" />
        return eNode;
    },

    VisitFunction: function(eNode, context) {
        ///<param name="eNode" type="$data.Expressions.FunctionExpression" />

        var self = this;
        var params = eNode.parameters.map(function (p, i) {
            var result = self.Visit(p, context);
            return result;
        });
        var body = self.Visit(eNode.body, context);
        var result = new $data.Expressions.FunctionExpression(eNode.name, params, body);

        return result;
    },

    VisitBinary: function (eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        ///<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        var expr = $data.Expressions;

        if (left instanceof expr.ConstantExpression && right instanceof expr.ConstantExpression) 
        {
                var result = eNode.implementation(left.value, right.value);
                return Container.createConstantExpression(result, typeof result);
        }
        return new Container.createSimpleBinaryExpression(left, right, eNode.nodeType, eNode.operator, eNode.type);
    },

    VisitUnary: function (eNode, context) {
        ///<summary></summary>
        ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
        ///<param name="context" type="Object"/>
        ///<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

        var operand = this.Visit(eNode.operand, context);
        //var imp = $data.unaryOperators.getOperator(
        var expr = $data.Expressions;
        if (operand  instanceof expr.ConstantExpression)
        {
                var result = eNode.operator.implementation(operand.value);
                return Container.createConstantExpression(result, typeof result);
        }
        return new Container.createUnaryExpression(operand, eNode.operator, eNode.nodeType);
    },

    VisitProperty: function (eNode, context) {
        ///<param name="eNode" type="$data.Expressions.PropertyExpression" />
        var expression = this.Visit(eNode.expression, context);
        var member = this.Visit(eNode.member, context);
        var result;
        if (expression instanceof $data.Expressions.ConstantExpression &&
            member instanceof $data.Expressions.ConstantExpression) {
            ///TODO implement checking for the member, throw on error
            result = eNode.implementation(expression.value, member.value);

            //Method call processed before
            //if (typeof result === 'function') {
            //    return new $data.Expressions.ConstantExpression(
            //        function () { return result.apply(expression.value, arguments); });
            //}
            return Container.createConstantExpression(result, typeof result, expression.name + '$' + member.value);
        }
        if (expression === eNode.expression && member === eNode.member)
            return eNode;
  
        result = Container.createPropertyExpression(expression, member);
        return result;
    },

    VisitCall: function (eNode, context) {
        ///<param name="eNode" type="$data.Expressions.CallExpression" />
        function isExecutable(args, body, obj) {
            return body instanceof $data.Expressions.ConstantExpression &&
                //global methods will not have a this.
                (!obj || obj instanceof $data.Expressions.ConstantExpression) &&
                args.every(function(item) {
                    return item instanceof $data.Expressions.ConstantExpression;
                });
        }
        var call = $data.Expressions.ExpressionVisitor.prototype.VisitCall.apply(this, arguments);
        var obj = call.expression;
        var body  = call.member;
        var args = call.args;

        function convertToValue(arg) {
            if (arg instanceof $data.Expressions.ConstantExpression)
                return arg.value;
            return arg;
        };

        if (isExecutable(args, body, obj)) {
            var fn = body.value;
            if (typeof fn === 'string' && obj.value) {
                fn = obj.value[fn];
            }
            if (typeof fn !== 'function') {
                //TODO dig that name out from somewhere
                Guard.raise("Constant expression is not a method...");
            }
            var value = eNode.implementation(obj.value, fn, args.map(convertToValue));
            return new $data.Expressions.ConstantExpression(value, typeof value);
        }
        return call;
    }
}, {});
$C("$data.Expressions.AggregatedVisitor", $data.Expressions.ExpressionVisitor, null, {
    constructor: function (visitors) {
        ///<param name="resolver" type="Array" elementType="$data.Expression.ParameterResolver" />

        this.Visit = function (node, context) {
            for (var i = 0; i < visitors.length; i++) {
                var n = visitors[i].Visit(node, context);
                if (n !== node)
                    return n;
            }
            return node;
        };
    }

});
//"use strict"; // suspicious code

$C('$data.Expressions.LogicalSchemaBinderVisitor',
    $data.Expressions.ExpressionVisitor, null,
    {
        constructor: function (expression, binder) {
            
        },

        VisitProperty: function (expression, context) {
            ///<param name="expression" type="$data.Expressions.ExpressionNode" />
            var exp = this.Visit(expression.expression, context);
            var mem = this.Visit(expression.member, context);

            var type = exp.type;
            var memberType = context.memberResolver.resolve(type, mem.value);
            mem.type = memberType;
            return Container.createPropertyExpression(exp, mem);
        }

    }, {});$data.Class.define('$data.Expressions.ExpTreeVisitor',
    null, null,
    {
        constructor: function () {
            this._deep = 0;
        },
        Visit: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.ExpressionNode"/>
            this._deep = this._deep + 1;
            var result = null;
            switch (eNode.type) {
                case LITERAL: result = this.VisitLiteral(eNode, context); break;
                case VARIABLE: result = this.VisitVariable(eNode, context); break;
                case MEMBERACCESS: result = this.VisitMember(eNode, context); break;
                case BINARY: result = this.VisitBinary(eNode, context); break;
                case UNARY: result = this.VisitUnary(eNode, context); break;
                case INCDEC: result = this.VisitIncDec(eNode, context); break;
                case EQUALITY: result = this.VisitEquality(eNode, context); break;
                case DECISION: result = this.VisitDecision(eNode, context); break;
                case METHODCALL: result = this.VisitMethodCall(eNode, context); break;
                case NEW: result = this.VisitNew(eNode, context); break;
                case JSONASSIGN: result = this.VisitJsonAssign(eNode, context); break;
                case ARRAYACCESS: result = this.VisitArrayAccess(eNode, context); break;
                default:
                    Guard.raise("Type isn't implemented: " + eNode.type);
            }
            this._deep = this._deep - 1;
            return result;
        },
        VisitLiteral: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.LiteralExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.LiteralExpressionNode"/>
            
            return eNode;
        },
        VisitVariable: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.VariableExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.VariableExpressionNode"/>

            return eNode;
        },
        VisitMember: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode"/>

            var expression = this.Visit(eNode.expression, context);
            var member = this.Visit(eNode.member, context);
            if (expression === eNode.expression && member === eNode.member)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(eNode.executable, expression, member);
        },
        VisitBinary: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.BinaryExpressionNode"/>

            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            if (left === eNode.left && right === eNode.right)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(eNode.executable, eNode.operator, left, right);
        },
        VisitUnary: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.UnaryExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.UnaryExpressionNode"/>

            var operand = this.Visit(eNode.operand, context);
            if (operand === eNode.operand)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(eNode.executable, eNode.operator, operand);
        },
        VisitIncDec: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.IncDecExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.IncDecExpressionNode"/>

            var operand = this.Visit(eNode.operand, context);
            if (operand === eNode.operand)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(eNode.executable, eNode.operator, operand, eNode.suffix);
        },
        VisitEquality: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.EqualityExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.EqualityExpressionNode"/>

            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            if (left === eNode.left && right === eNode.right)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(eNode.executable, eNode.operator, left, right);
        },
        VisitDecision: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.DecisionExpressionNode"/>

            var expression = this.Visit(eNode.expression, context);
            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            if (expression === eNode.expression && left === eNode.left && right === eNode.right)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
        },
        VisitMethodCall: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode"/>

            var object = eNode.object ? this.Visit(eNode.object, context) : null;
            var args = this.VisitArray(eNode.args, context);
            if (object === eNode.object && args === eNode.args)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(eNode.executable, object, eNode.method, args);
        },
        VisitNew: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.NewExpressionNode"/>

            var values = this.VisitArray(eNode.values, context);
            if (values === eNode.values)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
        },
        VisitJsonAssign: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode"/>

            var left = this.Visit(eNode.left, context);
            var right = this.Visit(eNode.right, context);
            if (left === eNode.left && right === eNode.right)
                return eNode;
            left.JSONASSIGN = true;
            right.JSONASSIGN = true;
            return $data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true, left, right);
        },
        VisitArrayAccess: function (eNode, context) {
            ///<summary></summary>
            ///<param name="eNode" type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>
            ///<param name="context" type="Object"/>
            //<return type="$data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode"/>

            var array = this.Visit(eNode.array, context);
            var index = this.Visit(eNode.index, context);
            if (array === eNode.array && index === eNode.index)
                return eNode;
            return $data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
        },
        VisitArray: function (eNodes, context) {
            var args = [];
            var ok = true;
            for (var i = 0; i < eNodes.length; i++) {
                args[i] = this.Visit(eNodes[i], context);
                ok = ok && args[i] === eNodes[i];
            }
            return ok ? eNodes : args;
        },
        GetMemberChain: function (memberAccess, context) {
            // { type:MEMBERACCESS, executable:true, expression:, member: }
            if (memberAccess.expression.type == MEMBERACCESS) {
                var a = this.GetMemberChain(memberAccess.expression, context);
                a.push(memberAccess.member);
                return a;
            }
            return [memberAccess.expression, memberAccess.member];
        }
    }, {});$data.Class.define('$data.Expressions.SetExecutableVisitor', $data.Expressions.ExpTreeVisitor, null,
{
    Visit: function (eNode, context) {
        switch (eNode.type) {
            case LITERAL: return this.VisitLiteral(eNode, context);
            case VARIABLE: return this.VisitVariable(eNode, context);
            case MEMBERACCESS: return this.VisitMember(eNode, context);
            case BINARY: return this.VisitBinary(eNode, context);
            case UNARY: return this.VisitUnary(eNode, context);
            case INCDEC: return this.VisitIncDec(eNode, context);
            case EQUALITY: return this.VisitEquality(eNode, context);
            case DECISION: return this.VisitDecision(eNode, context);
            case METHODCALL: return this.VisitMethodCall(eNode, context);
            case NEW: return this.VisitNew(eNode, context);
            case JSONASSIGN: return this.VisitJsonAssign(eNode, context);
            case ARRAYACCESS: return this.VisitArrayAccess(eNode, context);
            default:
                Guard.raise("Type isn't implemented: " + eNode.type);
        }
    },

    VisitBinary: function (eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right && (left.executable && right.executable == eNode.executable))
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(left.executable && right.executable, eNode.operator, left, right);
    },
    VisitUnary: function (eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand)
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(operand.executable, eNode.operator, operand);
    },
    VisitIncDec: function (eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand === eNode.operand)
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(operand.executable, eNode.operator, operand, eNode.suffix);
    },
    VisitEquality: function (eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right && (left.executable && right.executable == eNode.executable))
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(left.executable && right.executable, eNode.operator, left, right);
    },
    VisitDecision: function (eNode, context) {
        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression === eNode.expression && left === eNode.left && right === eNode.right && (left.executable && right.executable && expression.executable == eNode.executable))
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(left.executable && right.executable && expression.executable, expression, left, right);
    },
    VisitMethodCall: function (eNode, context) {
        var object = eNode.object ? this.Visit(eNode.object, context) : null;
        var args = this.VisitArray(eNode.args, context);
        if (object === eNode.object && args === eNode.args && ((object == null ? true : object.executable) == eNode.executable))
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(object == null ? true : object.executable, object, eNode.method, args);
    },
    VisitNew: function (eNode, context) {
        // { type:NEW, executable:true, values: [] };
        var values = this.VisitArray(eNode.values, context);
        if (values === eNode.values)
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, values);
    },
    VisitJsonAssign: function (eNode, context) {
        // { type:JSONASSIGN, executable:true, left: variable, right: right }
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left === eNode.left && right === eNode.right)
            return eNode;
        left.JSONASSIGN = true;
        right.JSONASSIGN = true;
        return $data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true, left, right);
    },
    VisitArrayAccess: function (eNode, context) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var array = this.Visit(eNode.array, context);
        var index = this.Visit(eNode.index, context);
        if (array === eNode.array && index === eNode.index)
            return eNode;
        return $data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true, array, index);
    },
    VisitArray: function (eNodes, context) {
        var args = [];
        var ok = true;
        for (var i = 0; i < eNodes.length; i++) {
            args[i] = this.Visit(eNodes[i], context);
            ok = ok && args[i] === eNodes[i];
        }
        return ok ? eNodes : args;
    },

    VisitLiteral: function (eNode, context) {
        return { type: eNode.type, executable: true, value: eNode.value, valueType: eNode.valueType };
    },
    VisitVariable: function (eNode, context) {
        if (typeof context.paramContext[eNode.name] == undefined) // isn't param  //TODO: check ParamContext
            Guard.raise("Variable is not defined in the paramContext: " + eNode.name);
        //this._setExecutable(eNode, true);
        return $data.Expressions.ExpressionNodeTypes.VariableExpressionNode.create(true, "Math", "GLOBALOBJECT");
    },
    VisitMember: function (eNode, context) {
        var chain = this.GetMemberChain(eNode);
        var firstMember = chain[0].name;
        var isLambdaParam = context.lambdaParams.indexOf(firstMember) >= 0;
        var isLocalParam = firstMember == context.paramsName; //TODO: check ParamContext // old: typeof context.paramContext[firstMember] != "undefined";
        if (!isLocalParam && !isLambdaParam)
            Guard.raise("Variable is not defined in the paramContext or the lambda parameters: " + firstMember);

        return $data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(isLocalParam, eNode.expression, eNode.member);
    }
}, null);$data.Class.define('$data.Expressions.ExecutorVisitor', $data.Expressions.ExpTreeVisitor, null,
{
    //--
    VisitVariable: function (eNode, context) {
        if (!eNode.executable)
            return eNode;
        var value = (eNode.name == context.paramsName) ? context.paramContext : window[eNode.name];
        if (typeof value == 'undefined')
			Guard.raise(
				new Exception("Unknown variable in '" + context.operation + "' operation. The variable isn't referenced in the parameter context and it's not a global variable: '" + eNode.name + "'.",
                "InvalidOperation", { operationName: context.operation, missingParameterName: eNode.name })
				);
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitMember: function (eNode, context) {
        if (!eNode.executable)
            return eNode;
        var chain = this.GetMemberChain(eNode);
        var value;
        for (var i = 0; i < chain.length; i++) {
            if (i == 0)
                value = context.paramContext;
            else
                value = value[chain[i].name];
        }
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);


    },
    VisitUnary: function (eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand !== eNode.operand)
            eNode = $data.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(eNode.executable, eNode.operator, operand);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var operandValue = ((operand.valueType == "string") ? ("'" + operand.value + "'") : operand.value);
        src = "value = " + eNode.operator + " " + operandValue;
        eval(src);

        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitIncDec: function (eNode, context) {
        var operand = this.Visit(eNode.operand, context);
        if (operand !== eNode.operand)
            eNode = $data.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(eNode.executable, eNode.operator, operand, eNode.suffix);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var value;
        if (eNode.suffix)
            value = eNode.operator == "++" ? operand.value++ : operand.value--;
        else
            value = eNode.operator == "++" ? ++operand.value : --operand.value;
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitBinary: function (eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left !== eNode.left || right !== eNode.right)
            eNode = $data.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(eNode.executable, eNode.operator, left, right);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var leftValue = ((left.valueType == "string") ? ("'" + left.value + "'") : left.value);
        var rightValue = ((right.valueType == "string") ? ("'" + right.value + "'") : right.value);
        src = "value = " + leftValue + " " + eNode.operator + " " + rightValue;
        eval(src);

        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitEquality: function (eNode, context) {
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (left !== eNode.left || right !== eNode.right)
            eNode = $data.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(eNode.executable, eNode.operator, left, right);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var value;
        var src;
        var leftValue = ((left.valueType == "string") ? ("'" + left.value + "'") : left.value);
        var rightValue = ((right.valueType == "string") ? ("'" + right.value + "'") : right.value);
        src = "value = " + leftValue + " " + eNode.operator + " " + rightValue;
        eval(src);
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitDecision: function (eNode, context) {
        var expression = this.Visit(eNode.expression, context);
        var left = this.Visit(eNode.left, context);
        var right = this.Visit(eNode.right, context);
        if (expression !== eNode.expression || left !== eNode.left || right !== eNode.right)
            eNode = $data.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(eNode.executable, expression, left, right);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var value = expression.value ? left.value : right.value;
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitMethodCall: function (eNode, context) {
        var object = eNode.object ? this.Visit(eNode.object, context) : null;
        var args = this.VisitArray(eNode.args, context);
        if (object !== eNode.object || args != eNode.args)
            eNode = $data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(eNode.executable, object, eNode.method, args);
        if (!eNode.executable)
            return eNode;
        // executing and returning with result as a literal
        var a = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var t = typeof arg.value;
            a.push((t == "string") ? ("'" + arg.value + "'") : arg.value);
        }
        var value;
        var src = object ?
			"value = object.value[eNode.method](" + a.join(",") + ");"
			:
			"value = " + eNode.method + "(" + a.join(",") + ");";
        eval(src);

        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    },
    VisitArrayAccess: function (eNode, context) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var arrayNode = this.Visit(eNode.array, context);
        var indexNode = this.Visit(eNode.index, context);
        var value = arrayNode.value[indexNode.value];
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, typeof value, value);
    }
}, null); $data.Class.define('$data.Expressions.ExpressionBuilder', null, null,
{
    constructor: function (context) {
        this.context = context;
    },
    _isLambdaParam: function (name) {
        var p = this.context.lambdaParams;
        for (var i = 0; i < p.length; i++) {
            if (p[i] == name)
                return true;
        }
        return false;
    },
    _isParam: function (name) {
        return this.context.paramContext[name] != undefined;
    },
    _isParamRoot: function (name) {
        return this.context.paramsName == name;
    },
    Build: function (node, expNode) {
        var n;
        switch (node.arity) {
            case "infix":
                if ("(" == node.value)
                    n = this.BuildMethodCall(node, expNode);
                else if ("." == node.value)
                    n = this.BuildMember(node, expNode);
                else if (["===", "==", "!==", "!=", ">", "<", ">=", "<="].indexOf(node.value) >= 0)
                    n = this.BuildEquality(node, expNode);
                else if (["&&", "||"].indexOf(node.value) >= 0)
                    n = this.BuildBinary(node, expNode);
                else if (["+", "-", "*", "/", "%"].indexOf(node.value) >= 0)
                    n = this.BuildBinary(node, expNode);
                else if ("[" == node.value)
                    n = this.BuildArrayAccess(node, expNode);
                else
                    Guard.raise("Value of infix node isn't implemented: " + node.value);
                break;
            case "prefix":
                if (["+", "-", "!"].indexOf(node.value) >= 0)
                    n = this.BuildUnary(node, expNode);
                else if (["++", "--"].indexOf(node.value) >= 0)
                    n = this.BuildIncDec(node, expNode);
                else if ("{" == node.value/* && "object" == node.type*/) //TODO: check the second condition necessity
                    n = this.BuildNewExpression(node, expNode);
                else
                    Guard.raise("Value of prefix node isn't implemented: " + node.value);
                break;
            case "suffix":
                if (["++", "--"].indexOf(node.value) >= 0)
                    n = this.BuildIncDec(node, expNode);
                else
                    Guard.raise("Value of suffix node isn't implemented: " + node.value);
                break;
            case "string":
            case "number":
                n = this.BuildLiteral(node, expNode); //TODO: more arity to literal?
                break;
            case "ternary":
                if (node.value == "?")
                    n = this.BuildDecision(node, expNode);
                else
                    Guard.raise("Value of ternary node isn't implemented: " + node.value);
                break;
            case null:
            case undefined:
                if (node.type == "boolean" && (node.value == "true" || node.value == "false"))
                    n = this.BuildBoolLiteral(node, expNode);
                else
                    n = this.BuildVariable(node, expNode);
                break;
            default:
                Guard.raise("Arity isn't implemented: " + node.arity);
        }
        return n;
    },
    BuildNewExpression: function (node, expNode) {
        var newExpression = $data.Expressions.ExpressionNodeTypes.NewExpressionNode.create(true, []);
        var n = node.first;
        for (var i = 0; i < n.length; i++)
            newExpression.values.push(this.Build(n[i], newExpression));
        return newExpression;
    },
    BuildLiteral: function (node, expNode) {
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.arity, node.value);
    },
    BuildBoolLiteral: function (node, expNode) {
        return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.type, node.value == "true" ? true : false);
    },
    BuildVariable: function (node, expNode) {
        if (!node.first) {
            if (expNode.type == MEMBERACCESS) {
                var subType;
                if (this._isLambdaParam(node.value))
                    subType = "LAMBDAPARAM";
                else if (this._isParamRoot(node.value))
                    subType = "PARAMETERROOT";
                else if (this._isParam(node.value))
                    subType = "PARAMETER";
                else
                    subType = "PROPERTY";
            }
            else {
                if (this._isLambdaParam(node.value))
                    subType = "LAMBDAPARAM";
                else if (this._isParamRoot(node.value))
                    subType = "PARAMETERROOT";
                else if (this._isParam(node.value))
                    subType = "PARAMETER";
                else if (window[node.value] != undefined)
                    subType = "GLOBALOBJECT";
                else
					Guard.raise(
						new Exception("Unknown variable in '" + this.context.operation + "' operation. The variable isn't referenced in the parameter context and it's not a global variable: '" + node.value + "'.",
                        "InvalidOperation", { operationName: this.context.operation, missingParameterName: node.value })
						);
            }
            return $data.Expressions.ExpressionNodeTypes.VariableExpressionNode.create(true, node.value, subType);
        }

        var left = $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, "name", node.value);

        var jsonAssign = $data.Expressions.ExpressionNodeTypes.JsonAssignExpressionNode.create(true);
        var right = this.Build(node.first, jsonAssign);
        //left.parent = jsonAssign;
        jsonAssign.left = left;
        jsonAssign.right = right;

        left.JSONASSIGN = true;
        right.JSONASSIGN = true;

        return jsonAssign;
    },
    BuildMember: function (node, expNode) {
        if (node.value != "." || node.arity != "infix") {
            if (node.type == "string") { //TODO: more types?
                return $data.Expressions.ExpressionNodeTypes.LiteralExpressionNode.create(true, node.arity, node.value);
            }
            return $data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(true, null, node.value);
        }
        var result = $data.Expressions.ExpressionNodeTypes.MemberAccessExpressionNode.create(true);
        var expression = this.Build(node.first, result);
        var member = this.Build(node.second, result);
        result.expression = expression;
        result.member = member;
        return result;
    },
    BuildUnary: function (node, expNode) {
        var result = $data.Expressions.ExpressionNodeTypes.UnaryExpressionNode.create(true, node.value);
        result.operand = this.Build(node.first, result);
        return result;
    },
    BuildIncDec: function (node, expNode) {
        var result = $data.Expressions.ExpressionNodeTypes.IncDecExpressionNode.create(true, node.value, null, node.arity == "suffix");
        result.operand = this.Build(node.first, result);
        return result;
    },
    BuildBinary: function (node, expNode) {
        if (!node.first) Guard.raise("Cannot build binary: node.first is null");
        if (!node.second) Guard.raise("Cannot build binary: node.second is null");
        var result = $data.Expressions.ExpressionNodeTypes.BinaryExpressionNode.create(true, node.value);
        result.left = this.Build(node.first, result);
        result.right = this.Build(node.second, result);
        return result;
    },
    BuildEquality: function (node, expNode) {
        var result = $data.Expressions.ExpressionNodeTypes.EqualityExpressionNode.create(true, node.value);
        result.left = this.Build(node.first, result);
        result.right = this.Build(node.second, result);
        return result;
    },
    BuildDecision: function (node, expNode) {
        var result = $data.Expressions.ExpressionNodeTypes.DecisionExpressionNode.create(true);
        result.expression = this.Build(node.first, result);
        result.left = this.Build(node.second, result);
        result.right = this.Build(node.third, result);
        return result;
    },
    BuildMethodCall: function (node, expNode) {
        var result = $data.Expressions.ExpressionNodeTypes.MethodcallExpressionNode.create(true);
        if (node.first.type == "function") {
            //-- object's function
            result.object = this.Build(node.first.first, result);
            result.method = node.first.second.value;
        }
        else {
            //-- global function
            if (node.first.type != null)
                Guard.raise("Cannot build MethodCall because type is " + type);
            result.object = null;
            result.method = node.first.value;
        }
        var argNodes = node.second;
        var args = [];
        for (var i = 0; i < argNodes.length; i++) {
            var arg = argNodes[i];
            args[i] = this.Build(arg, result);
        }
        result.args = args;
        return result;
    },
    BuildArrayAccess: function (node, expNode) {
        // { type:ARRAYACCESS, executable:true, array:, index: }
        var result = $data.Expressions.ExpressionNodeTypes.ArrayAccessExpressionNode.create(true);
        result.array = this.Build(node.first, result);
        result.index = this.Build(node.second, result);
        return result;
    }
}, null);$C('$data.Expressions.AssociationInfoExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (associationInfo) {
        this.associationInfo = associationInfo;
    },
    nodeType: { value: $data.Expressions.ExpressionType.AssociationInfo, enumerable: true }
});$C('$data.Expressions.CodeExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, parameters) {
        if (Container.resolveType(Container.getTypeName(source)) == $data.String && source.replace(/^[\s\xA0]+/, "").match("^function") != "function") {
            source = "function (it) { return " + source + "; }";
        }

        this.source = source;
        this.parameters = parameters;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Code, enumerable: true }
});$C('$data.Expressions.CodeToEntityConverter', $data.Expressions.ExpressionVisitor, null, {
    constructor: function (scopeContext) {
        ///<summary>This visitor converts a JS language tree into a semantical Entity Expression Tree &#10;This visitor should be invoked on a CodeExpression</summary>
        ///<param name="context">context.thisArg contains parameters, context.lambdaParams should have an array value</param>
        this.scopeContext = scopeContext;
        this.parameters = [];

    },


    VisitBinary: function (expression, context) {
        var left = this.Visit(expression.left, context);
        var right = this.Visit(expression.right, context);

        if ((!(left instanceof $data.Expressions.ConstantExpression) && right instanceof $data.Expressions.ConstantExpression) ||
            (!(right instanceof $data.Expressions.ConstantExpression) && left instanceof $data.Expressions.ConstantExpression)) {

            var refExpression, constExpr;
            if (right instanceof $data.Expressions.ConstantExpression) {
                refExpression = left;
                constExpr = right;
            } else {
                refExpression = right;
                constExpr = left;
            }

            var memInfo;
            if ((memInfo = refExpression.selector) instanceof $data.Expressions.MemberInfoExpression ||
                (memInfo = refExpression.operation) instanceof $data.Expressions.MemberInfoExpression) {


                if (memInfo.memberDefinition && (memInfo.memberDefinition.type || memInfo.memberDefinition.dataType)) {
                    var fieldType = Container.resolveType(memInfo.memberDefinition.type || memInfo.memberDefinition.dataType);
                    var constExprType = Container.resolveType(constExpr.type);

                    if (fieldType !== constExprType) {

                        var value = constExpr.value;
                        if (expression.operator === $data.Expressions.ExpressionType.In) {
                            if (Array.isArray(value)) {
                                var resultExp = [];
                                for (var i = 0; i < value.length; i++) {
                                    resultExp.push(new $data.Expressions.ConstantExpression(value[i], fieldType));
                                }
                                value = resultExp;
                                fieldType = $data.Array;
                            } else {
                                fieldType = constExprType;
                            }
                        }

                        if (right === constExpr) {
                            right = new $data.Expressions.ConstantExpression(value, fieldType, right.name);
                        } else {
                            left = new $data.Expressions.ConstantExpression(value, fieldType, left.name);
                        }
                    }
                }
            }
        }

        var operatorResolution = this.scopeContext.resolveBinaryOperator(expression.nodeType, expression, context.frameType);
        var result = Container.createSimpleBinaryExpression(left, right, expression.nodeType, expression.operator, expression.type, operatorResolution);
        return result;
    },

    VisitUnary: function (expression, context) {
        var operand = this.Visit(expression.operand, context);
        var operatorResolution = this.scopeContext.resolveUnaryOperator(expression.nodeType, expression, context.frameType);
        var result = Container.createUnaryExpression(operand, expression.operator, expression.nodeType, operatorResolution);
        return result;
    },

    VisitParameter: function (expression, context) {
        Guard.requireValue("context", context);
        var et = $data.Expressions.ExpressionType;
        switch (expression.nodeType) {
            case et.LambdaParameterReference:
                var result = Container.createEntityExpression(context.lambdaParameters[expression.paramIndex], { lambda: expression.name });
                return result;
            case et.LambdaParameter:
                //TODO: throw descriptive exception or return a value
                break;
            default:
                Guard.raise("Global parameter " + expression.name + " not found. For query parameters use 'this.field' notation");
                break;
        }
    },

    VisitThis: function (expression, context) {
        ///<summary>converts the ThisExpression into a QueryParameterExpression tha't value will be evaluated and stored in this.parameters collection</summary>
        var index = this.parameters.push({ name: "", value: undefined }) - 1;
        var result = Container.createQueryParameterExpression("", index, context.queryParameters, undefined);
        return result;
    },

    VisitFunction: function (expression, context) {
        var result = $data.Expressions.ExpressionVisitor.prototype.VisitFunction.apply(this, arguments);
        return result.body;
    },

    VisitCall: function (expression, context) {
        //var exp = this.Visit(expression.expression);
        var self = this;
        var exp = this.Visit(expression.expression, context);
        var member = this.Visit(expression.member, context);
        var args = expression.args.map(function (arg) {
            return self.Visit(arg, context);
        });
        var result;

        ///filter=>function(p) { return p.Title == this.xyz.BogusFunction('asd','basd');}
        switch (true) {
            case exp instanceof $data.Expressions.QueryParameterExpression:
                var argValues = args.map(function (a) { return a.value; });
                result = expression.implementation(exp.value, member.value, argValues);
                //var args = expressions
                return Container.createQueryParameterExpression(exp.name + "$" + member.value, exp.index, result, typeof result);
            case exp instanceof $data.Expressions.EntityFieldExpression:

            case exp instanceof $data.Expressions.EntityFieldOperationExpression:
                var operation = this.scopeContext.resolveFieldOperation(member.value, exp, context.frameType);
                if (!operation) {
                    Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = Container.createMemberInfoExpression(operation);
                result = Container.createEntityFieldOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.parameters));
                return result;

            case exp instanceof $data.Expressions.EntitySetExpression:
                var operation = this.scopeContext.resolveSetOperations(member.value, exp, context.frameType);
                if (!operation) {
                    Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = Container.createMemberInfoExpression(operation);
                result = Container.createFrameOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.parameters));
                return result;
                
            case exp instanceof $data.Expressions.EntityExpression:
                var operation = this.scopeContext.resolveTypeOperations(member.value, exp, context.frameType);
                if (!operation) {
                    Guard.raise("Unknown entity function operation: " + member.getJSON());
                }

                member = Container.createMemberInfoExpression(operation);
                result = Container.createEntityFunctionOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.method.params));
                return result;
                break;
            case exp instanceof $data.Expressions.EntityContextExpression:
                var operation = this.scopeContext.resolveContextOperations(member.value, exp, context.frameType);
                if (!operation) {
                    Guard.raise("Unknown entity function operation: " + member.getJSON());
                }

                member = Container.createMemberInfoExpression(operation);
                result = Container.createContextFunctionOperationExpression(exp, member, this._resolveFunctionArguments(args, operation.method.params));
                return result;
                break;
            default:
                Guard.raise("VisitCall: Only fields can have operations: " + expression.getType().name);
                //TODO we must not alter the visited tree
        }

    },
    _resolveFunctionArguments: function (args, params) {
        if (params) // remove current field poz
            params = params.filter(function (p, i) { return p.name !== '@expression'; });

        //objectArgs
        if (args.length === 1 && args[0] instanceof $data.Expressions.ConstantExpression && typeof args[0].value === 'object' && args[0].value && params && params[0] &&
            args[0].value.constructor === $data.Object && params.some(function (param) { return param.name in args[0].value })) {

            return params.map(function (p) {
                var type = p.type || p.dataType || args[0].type;
                return new $data.Expressions.ConstantExpression(args[0].value[p.name], Container.resolveType(type), p.name);
            });

        } else {
            return args.map(function (expr, i) {
                if (expr instanceof $data.Expressions.ConstantExpression && params && params[i]) {
                    var type = params[i].type || params[i].dataType || expr.type;
                    return new $data.Expressions.ConstantExpression(expr.value, Container.resolveType(type), params[i].name);
                } else {
                    return expr;
                }
            });
        }
    },

    VisitProperty: function (expression, context) {
        ///<param name="expression" type="$data.Expressions.PropertyExpression" />
        var exp = this.Visit(expression.expression, context);
        var member = this.Visit(expression.member, context);

        //Guard.requireType("member", member, $data.Expressions.ConstantExpression);
        Guard.requireType("member", member, $data.Expressions.ConstantExpression);

        function isPrimitiveType(memberDefinitionArg) {

            var t = memberDefinitionArg.dataType;
            if (typeof t === 'function') { return false; }

			// suspicious code
            /*switch (t) {
                //TODO: implement this
            }*/
        }

        switch (exp.expressionType) {
            case $data.Expressions.EntityExpression:
                var memberDefinition = exp.getMemberDefinition(member.value);
                if (!memberDefinition) {
                    Guard.raise(new Exception("Unknown member: " + member.value, "MemberNotFound"));
                }
                //var storageMemberDefinition =
                var storageField = memberDefinition.storageModel
                                                   .PhysicalType.memberDefinitions.getMember(memberDefinition.name);
                var res;
                var memberDefinitionExp;
                switch (storageField.kind) {
                    case "property":
                        memberDefinitionExp = Container.createMemberInfoExpression(memberDefinition);
                        res = Container.createEntityFieldExpression(exp, memberDefinitionExp);
                        return res;
                    case "navProperty":
                        var assocInfo = memberDefinition.storageModel.Associations[memberDefinition.name];
                        var setExpression = Container.createEntitySetExpression(exp, Container.createAssociationInfoExpression(assocInfo));
                        if (assocInfo.ToMultiplicity !== "*") {
                            var ee = Container.createEntityExpression(setExpression, {});
                            return ee;
                        }/* else {
                            context.lambdaParameters.push(setExpression);
                        }*/
                        return setExpression;
                    case "complexProperty":
                        memberDefinitionExp = Container.createMemberInfoExpression(memberDefinition);
                        res = Container.createComplexTypeExpression(exp, memberDefinitionExp);
                        return res;
                        //TODO: missing default case
                }

                //s/switch => property or navigationproperty
            case $data.Expressions.ComplexTypeExpression:
                var memDef = exp.getMemberDefinition(member.value);
                if (!(memDef)) {
                    Guard.raise("Unknown member " + member.value + " on " + exp.entityType.name);
                }
                var memDefExp = Container.createMemberInfoExpression(memDef);
                var result;
                //TODO!!!!
                if (Container.isPrimitiveType(Container.resolveType(memDef.dataType))) {
                    result = Container.createEntityFieldExpression(exp, memDefExp);
                    return result;
                }
                result = Container.createComplexTypeExpression(exp, memDefExp);
                return result;
            case $data.Expressions.QueryParameterExpression:
                var value = expression.implementation(exp.value, member.value);
                this.parameters[exp.index].name += "$" + member.value;
                this.parameters[exp.index].value = value;
                return Container.createQueryParameterExpression(exp.name + "$" + member.value, exp.index, value, Container.getTypeName(value));
            case $data.Expressions.EntityFieldExpression:
            case $data.Expressions.EntityFieldOperationExpression:
                var operation = this.scopeContext.resolveFieldOperation(member.value, exp, context.frameType);
                if (!operation) {
                    Guard.raise("Unknown entity field operation: " + member.getJSON());
                }
                member = Container.createMemberInfoExpression(operation);
                result = Container.createEntityFieldOperationExpression(exp, member, []);

                return result;
            default:
                Guard.raise("Unknown expression type to handle: " + exp.expressionType.name);
        }
    }
});$C('$data.Expressions.ComplexTypeExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.ComplexTypeExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        Guard.requireType("source", source, [$data.Expressions.EntityExpression, $data.Expressions.ComplexTypeExpression]);
        Guard.requireType("selector", selector, [$data.Expressions.EntityExpression, $data.Expressions.MemberInfoExpression]);
        this.source = source;
        this.selector = selector;
        var dt = source.entityType.getMemberDefinition(selector.memberName).dataType;
        var t = Container.resolveType(dt);
        this.entityType = t;
    },

    getMemberDefinition: function (name) {
        return this.entityType.getMemberDefinition(name);
    },

    nodeType: { value: $data.Expressions.ExpressionType.Com }
});

$C('$data.Expressions.EntityContextExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (instance) {
        ///<param name="instance" type="$data.EntityContext" />
        //Object.defineProperty(this, "instance", { value: instance, enumerable: false });
        this.instance = instance;
        //this.storage_type = {};
        //this.typeName = this.type.name;
    },
    instance: { enumerable: false },
    nodeType : { value: $data.Expressions.ExpressionType.EntityContext, enumerable: true }

});
$C('$data.Expressions.EntityExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.IndexingExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.AccessorExpression" />
        ///</signature>
        Guard.requireValue("source", source);
        Guard.requireValue("selector", selector);
        if (!(source instanceof $data.Expressions.EntitySetExpression) && !(source instanceof $data.Expressions.ServiceOperationExpression)) {
            Guard.raise("Only EntitySetExpressions can be the source for an EntityExpression");
        }

        this.source = source;
        this.selector = selector;

        this.entityType = this.source.elementType;
        this.storageModel = this.source.storageModel;

        Guard.requireValue("entityType", this.entityType);
        Guard.requireValue("storageModel", this.storageModel);

    },

    getMemberDefinition: function (name) {
        var memdef = this.entityType.getMemberDefinition(name);
        if (!(memdef)) {
            Guard.raise(new Exception("Unknown member " + name + " on type "+ this.entityType.name, "MemberNotFound"));
        };
            memdef.storageModel = this.storageModel;
        return memdef;
    },

    nodeType: { value: $data.Expressions.ExpressionType.Entity }
});$C('$data.Expressions.EntityExpressionVisitor', null, null, {

    constructor: function () {
        this.lambdaTypes = [];
    },

    canVisit: function (expression) {
        return expression instanceof $data.Expressions.ExpressionNode;
    },

    Visit: function (expression, context) {
        if (!this.canVisit(expression))
            return expression;

        var visitorName = "Visit" + expression.getType().name;
        if (visitorName in this) {
            var fn = this[visitorName];
            var result = fn.call(this, expression, context);
            if (typeof result === 'undefined') {
                return expression;
            }
            return result;
        }
        //console.log("unhandled expression type:" + expression.getType().name);
        return expression;
    },
    VisitToArrayExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return Container.createToArrayExpression(source);
        }
        return expression;
    },
    VisitForEachExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return Container.createForEachExpression(source);
        }
        return expression;
    },
    VisitMemberInfoExpression: function (expression, context) {
        return expression;
    },

    VisitSingleExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createSingleExpression(source);
        return expression;
    },

    VisitFirstExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createFirstExpression(source);
        return expression;
    },

    VisitSomeExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createSomeExpression(source);
        return expression;
    },

    VisitFindExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createFindExpression(source);
        return expression;
    },

    VisitEveryExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createEveryExpression(source);
        return expression;
    },

    VisitCountExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source)
            return Container.createCountExpression(source);
        return expression;
    },

    VisitBatchDeleteExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        if (source !== expression.source) {
            return Container.createBatchDeleteExpression(source);
        }
        return expression;
    },

    VisitObjectLiteralExpression: function (expression, context) {
        var newValues = expression.members.map(function (ofe) {
            return this.Visit(ofe, context);
        }, this);
        var equal = true;
        for (var i = 0; i < expression.members.length; i++) {
            equal = equal && (expression.members[i] === newValues[i]);
        }
        if (!equal) {
            return Container.createObjectLiteralExpression(newValues);
        }
        return expression;
    },
    VisitObjectFieldExpression: function (expression, context) {
        var newExpression = this.Visit(expression.expression, context);
        if (expression.expression !== newExpression) {
            return Container.createObjectFieldExpression(expression.fieldName, newExpression);
        }
        return expression;
    },
    VisitIncludeExpression: function (expression, context) {
        var newExpression = this.Visit(expression.source, context);
        if (newExpression !== expression.source) {
            return Container.createIncludeExpression(newExpression, expression.selector);
        }
        return expression;
    },

    VisitUnaryExpression: function(expression, context) {

    	/// <param name="expression" type="$data.Expressions.UnaryExpression"></param>
    	/// <param name="context"></param>
        var operand = this.Visit(expression.operand, context);
        if (expression.operand !== operand) {
            return Container.createUnaryExpression(operand, expression.operator, expression.nodeType, expression.resolution);
        };
        return expression;
    },

    VisitSimpleBinaryExpression: function (expression, context) {
        ///<summary></summary>
        ///<param name="expression" type="$data.Expressions.SimpleBinaryExpression"/>
        ///<param name="context" type="Object"/>
        //<returns type="$data.Expressions.SimpleBinaryExpression"/>
        var left = this.Visit(expression.left, context);
        var right = this.Visit(expression.right, context);
        if (left !== expression.left || right !== expression.right) {
            return new $data.Expressions.SimpleBinaryExpression(left, right, expression.nodeType,
                expression.operator, expression.type, expression.resolution);
        }
        return expression;
    },

    VisitEntityContextExpression: function (expression, context) {
        return expression;
    },

    VisitCodeExpression: function (expression, context) {
        /// <param name="expression" type="$data.Expressions.CodeExpression"></param>
        /// <param name="context"></param>
        /// <returns type="$data.Expressions.CodeExpression"></returns>
        return expression;
    },

    VisitComplexTypeExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = Container.createComplexTypeExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = Container.createEntityExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityFieldExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var result = Container.createEntityFieldExpression(source, selector);
            return result;
        }
        return expression;
    },

    VisitEntityFieldOperationExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var operation = this.Visit(expression.operation, context);
        var parameters = expression.parameters.map(function (p) {
            return this.Visit(p);
        }, this);
        var result = Container.createEntityFieldOperationExpression(source, operation, parameters);
        return result;
    },

    VisitParametricQueryExpression: function (expression, context) {
        var exp = this.Visit(expression.expression, context);
        var args = expression.parameters.map(function (p) {
            return this.Visit(p);
        }, this);
        var result = Container.createParametricQueryExpression(exp, args);
        return result;
    },

    VisitEntitySetExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createEntitySetExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitInlineCountExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createInlineCountExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitFilterExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createFilterExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitProjectionExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var expr = Container.createProjectionExpression(source, selector, expression.params, expression.instance);
            expr.projectionAs = expression.projectionAs;
            return expr;
        }
        return expression;
    },

    VisitOrderExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createOrderExpression(source, selector, expression.nodeType);
        }
        return expression;
    },
    VisitPagingExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        var amount = this.Visit(expression.amount, context);
        if (source !== expression.source || amount !== expression.amount) {
            return Container.createPagingExpression(source, amount, expression.nodeType);
        }
        return expression;
    }
});
$C('$data.Expressions.ExpressionMonitor', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (monitorDefinition) {
        this.Visit = function (expression, context) {

            var result = expression;
            var methodName;
            if (this.canVisit(expression)) {

                //if (monitorDefinition.FilterExpressionNode) {

                //};

                if (monitorDefinition.VisitExpressionNode) {
                    monitorDefinition.VisitExpressionNode.apply(monitorDefinition, arguments);
                };

                methodName = "Visit" + expression.getType().name;
                if (methodName in monitorDefinition) {
                    result = monitorDefinition[methodName].apply(monitorDefinition, arguments);
                }
            }


            //apply is about 3-4 times faster then call on webkit

            var args = arguments;
            if (result !== expression) args = [result, context];
            result = $data.Expressions.EntityExpressionVisitor.prototype.Visit.apply(this, args);

            args = [result, context];

            if (this.canVisit(result)) {
                var expressionTypeName = result.getType().name;
                if (monitorDefinition.MonitorExpressionNode) {
                    monitorDefinition.MonitorExpressionNode.apply(monitorDefinition, args);
                }
                methodName = "Monitor" + expressionTypeName;
                if (methodName in monitorDefinition) {
                    monitorDefinition[methodName].apply(monitorDefinition, args);
                }

                if (monitorDefinition.MutateExpressionNode) {
                    monitorDefinition.MutateExpressionNode.apply(monitorDefinition, args);
                }
                methodName = "Mutate" + expressionTypeName;
                if (methodName in monitorDefinition) {
                    result = monitorDefinition[methodName].apply(monitorDefinition, args);
                }

            }
            return result;
        };
    }
});$C('$data.Expressions.EntityFieldExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, selector) {
        ///<param name="source" type="$data.Entity.EntityExpression" />
        ///<param name="selector" type="$data.Entity.MemberInfoExpression" />
        this.selector = selector;
        this.source = source;


        if (this.selector instanceof $data.Expressions.MemberInfoExpression ||  this.selector.name) {
            this.memberName = this.selector.name; 
        }
    },

    nodeType: { value: $data.Expressions.ExpressionType.EntityField }
});

$C('$data.Expressions.EntityFieldOperationExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, operation, parameters) {
        this.source = source;
        this.operation = operation;
        this.parameters = parameters;
    },
    nodeType: { value: $data.Expressions.ExpressionType.EntityFieldOperation }

});$C('$data.Expressions.EntitySetExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, selector, params, instance) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityContextExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.ParametricQueryExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.CodeExpression" />
        ///</signature>
        Guard.requireType("source", source,
                    [$data.Expressions.EntityContextExpression, $data.Expressions.EntitySetExpression]);
        Guard.requireType("selector", source,
                    [$data.Expressions.MemberInfoExpression, $data.Expressions.CodeExpression, $data.Expressions.ParametricQueryExpression]);

        this.source = source;
        this.selector = selector;
        this.params = params;
        //Object.defineProperty(this, "instance", { value: instance, enumerable: false, writable: true });
        this.instance = instance;

        function findContext() {
            //TODO: use source from function parameter and return a value at the end of the function
            var r = source;
            while (r) {
                if (r instanceof $data.Expressions.EntityContextExpression) {
                    return r;
                }
                r = r.source;
            }
        }

        ///TODO!!!
        this.storage_type = {};
        var c = findContext();
        switch (true) {
            case this.source instanceof $data.Expressions.EntityContextExpression:
                Guard.requireType("selector", selector, $data.Expressions.MemberInfoExpression);
                this.elementType = selector.memberDefinition.elementType;
                this.storageModel = c.instance._storageModel.getStorageModel(this.elementType);
                break;
            case this.source instanceof $data.Expressions.EntityExpression:
                Guard.requireType("selector", selector, $data.Expressions.AssociationInfoExpression);
                this.elementType = selector.associationInfo.ToType;
                this.storageModel = c.instance._storageModel.getStorageModel(this.elementType);
                break;
            case this.source instanceof $data.Expressions.EntitySetExpression:
                this.elementType = this.source.elementType;
                this.storageModel = this.source.storageModel;
                break;
            case this.source instanceof $data.Expressions.ServiceOperationExpression:
                this.elementType = this.source.elementType;//?????????
                this.storageModel = this.source.storageModel;
                break;
            default:
                Guard.raise("take and skip must be the last expressions in the chain!");
                //Guard.raise("Unknown source type for EntitySetExpression: " + this.getType().name);
                break;
        }

        // suspicious code
        /*if (this.source instanceof $data.Expressions.EntitySetExpression) {
                //TODO: missing operation
        }*/
        //EntityTypeInfo

    },
    instance: { enumerable: false },
    nodeType: { value: $data.Expressions.ExpressionType.EntitySet, enumerable: true }
});
$C('$data.Expressions.FrameOperationExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, operation, parameters) {
        this.source = source;
        this.operation = operation;
        this.parameters = parameters;
    },
    nodeType: { value: $data.Expressions.ExpressionType.FrameOperation }

});

$C('$data.Expressions.EntityFunctionOperationExpression', $data.Expressions.FrameOperationExpression, null, {
    nodeType: { value: $data.Expressions.ExpressionType.EntityFunctionOperation }
});

$C('$data.Expressions.ContextFunctionOperationExpression', $data.Expressions.FrameOperationExpression, null, {
    nodeType: { value: $data.Expressions.ExpressionType.ContextFunctionOperation }
});
$C('$data.Expressions.FilterExpression', $data.Expressions.EntitySetExpression, null, {
    constructor: function (source, selector) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.ParametricQueryExpression" />
        ///</signature>
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///<param name="selector" type="$data.Expressions.CodeExpression" />
        ///</signature>
        this.resultType = $data.Array;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Filter, enumerable: true }
});

$C('$data.Expressions.InlineCountExpression', $data.Expressions.EntitySetExpression, null, {
    constructor: function (source, selector) {
    },
    nodeType: { value: $data.Expressions.ExpressionType.InlineCount, enumerable: true }
});

$C('$data.Expressions.FrameOperator', $data.Expressions.ExpressionNode, null, {
    constructor: function () {
        this.isTerminated = true;
    }
});

$C('$data.Expressions.CountExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Integer;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Count, enumerable: true }
});

$C('$data.Expressions.SingleExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Object;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Single, enumerable: true }
});

$C('$data.Expressions.FindExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source, params) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.params = params;
        this.resultType = $data.Object;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Find, enumerable: true }
});

$C('$data.Expressions.FirstExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Object;
    },
    nodeType: { value: $data.Expressions.ExpressionType.First, enumerable: true }
});

$C('$data.Expressions.ForEachExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Array;
    },
    nodeType: { value: $data.Expressions.ExpressionType.ForEach, enumerable: true }
});
$C('$data.Expressions.ToArrayExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Array;
    },
    nodeType: { value: $data.Expressions.ExpressionType.ToArray, enumerable: true }
});

$C('$data.Expressions.SomeExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Object;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Some, enumerable: true }
});

$C('$data.Expressions.EveryExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Object;
    },
    nodeType: { value: $data.Expressions.ExpressionType.Every, enumerable: true }
});

$C('$data.Expressions.BatchDeleteExpression', $data.Expressions.FrameOperator, null, {
    constructor: function (source) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntitySetExpression" />
        ///</signature>
        this.source = source;
        this.resultType = $data.Integer;
    },
    nodeType: { value: $data.Expressions.ExpressionType.BatchDelete, enumerable: true }
});$C('$data.Expressions.IncludeExpression', $data.Expressions.EntitySetExpression, null, {
    constructor: function (source, selector) {
    },
    nodeType: { value: $data.Expressions.ExpressionType.Include, writable: true },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);
$C('$data.Expressions.MemberInfoExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (memberDefinition) {
        this.memberDefinition = memberDefinition;
        this.memberName = memberDefinition.name;
    },
    nodeType: { value: $data.Expressions.ExpressionType.MemberInfo, enumerable: true }

});$C('$data.Expressions.OrderExpression', $data.Expressions.EntitySetExpression, null, {
    constructor: function (source, expression, nType) {
        ///<param name="name" type="string" />
        ///<field name="name" type="string" />
        //this.source = source;
        //this.selector = expression;
        this.nodeType = nType;
    },
    nodeType: { value: $data.Expressions.ExpressionType.OrderBy, writable: true },

    toString: function (debug) {
        //var result;
        //result = debug ? this.type + " " : "";
        //result = result + this.name;
        var result = "unimplemented";
        return result;
    }
}, null);
$C('$data.Expressions.ParametricQueryExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (expression, parameters) {
        this.expression = expression;
        this.parameters = parameters || [];
    },
    nodeType: { value: $data.Expressions.ExpressionType.ParametricQuery, enumerable: true }
});$C('$data.Expressions.ProjectionExpression', $data.Expressions.EntitySetExpression, null, {
    constructor: function (source, selector, params, instance) {

    },
    nodeType: { value: $data.Expressions.ExpressionType.Projection, enumerable: true }

});


$C('$data.Expressions.QueryExpressionCreator', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (scopeContext) {
        ///<param name="scopeContext" type="$data.Expressions.EntityContext" />
        Guard.requireValue("scopeContext", scopeContext);
        this.scopeContext = scopeContext;
    },
    VisitEntitySetExpression: function (expression, context) {
        if (expression.source instanceof $data.Expressions.EntityContextExpression) {
            this.lambdaTypes.push(expression);
        }
        return expression;
    },

    VisitServiceOperationExpression: function (expression, context) {
        if (expression.source instanceof $data.Expressions.EntityContextExpression) {
            this.lambdaTypes.push(expression);
        }
        return expression;
    },

    VisitCodeExpression: function (expression, context) {
        ///<summary>Converts the CodeExpression into an EntityExpression</summary>
        ///<param name="expression" type="$data.Expressions.CodeExpression" />
        var source = expression.source.toString();
        var jsCodeTree = Container.createCodeParser(this.scopeContext).createExpression(source);
        this.scopeContext.log({ event: "JSCodeExpression", data: jsCodeTree });

        //TODO rename classes to reflex variable names
        //TODO engage localValueResolver here
        //var globalVariableResolver = Container.createGlobalContextProcessor(window);
        var constantResolver = Container.createConstantValueResolver(expression.parameters, window, this.scopeContext);
        var parameterProcessor = Container.createParameterResolverVisitor();

        jsCodeTree = parameterProcessor.Visit(jsCodeTree, constantResolver);

        this.scopeContext.log({ event: "JSCodeExpressionResolved", data: jsCodeTree });
        var code2entity = Container.createCodeToEntityConverter(this.scopeContext);

        ///user provided query parameter object (specified as thisArg earlier) is passed in
        var entityExpression = code2entity.Visit(jsCodeTree, {  queryParameters: expression.parameters, lambdaParameters: this.lambdaTypes, frameType: context.frameType });

        ///parameters are referenced, ordered and named, also collected in a flat list of name value pairs
        var result = Container.createParametricQueryExpression(entityExpression, code2entity.parameters);
        this.scopeContext.log({ event: "EntityExpression", data: entityExpression });

        return result;
    },


    VisitFilterExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createFilterExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitInlineCountExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createInlineCountExpression(source, selector, expression.params, expression.instance);
        }
        return expression;
    },

    VisitProjectionExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            var expr = Container.createProjectionExpression(source, selector, expression.params, expression.instance);
            expr.projectionAs = expression.projectionAs;
            return expr;
        }
        return expression;
    },

    VisitOrderExpression: function (expression, context) {
        var source = this.Visit(expression.source, context);
        context = context || {};
        context.frameType = expression.getType();
        var selector = this.Visit(expression.selector, context);
        if (source !== expression.source || selector !== expression.selector) {
            return Container.createOrderExpression(source, selector, expression.nodeType);
        }
        return expression;
    }
});$C('$data.Expressions.QueryParameterExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (name, index, value, type) {
        this.name = name;
        this.index = index;
        this.value = value;
        //TODO
        this.type = Container.getTypeName(value);
    },

    nodeType: { value: $data.Expressions.ExpressionType.QueryParameter, writable: false }
});$C('$data.Expressions.RepresentationExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (kind) {
    },

    getMemberDefinition: function (name) {
        return this.entityType.getMemberDefinition(name);
    },

    nodeType: { value: $data.Expressions.ExpressionType.Entity }
});

$C('$data.Expressions.ServiceOperationExpression', $data.Expressions.ExpressionNode, null, {
    constructor: function (source, selector, params, cfg, boundItem) {
        ///<signature>
        ///<param name="source" type="$data.Expressions.EntityContextExpression" />
        ///<param name="selector" type="$data.Expressions.MemberInfoExpression" />
        ///<param name="params" type="$data.Array" />
        ///<param name="cfg" type="$data.Object" />
        ///</signature>
        Guard.requireType("source", source, [$data.Expressions.EntityContextExpression]);
        Guard.requireType("selector", source, [$data.Expressions.MemberInfoExpression]);

        this.source = source;
        this.selector = selector
        this.params = params
        this.cfg = cfg;
        this.boundItem = boundItem;

        function findContext() {
            //TODO: use source from function parameter and return a value at the end of the function
            var r = source;
            while (r) {
                if (r instanceof $data.Expressions.EntityContextExpression) {
                    return r;
                }
                r = r.source;
            }
        }

        var c = findContext();
        switch (true) {
            case this.source instanceof $data.Expressions.EntityContextExpression:
                this.elementType = cfg.elementType ? Container.resolveType(cfg.elementType) : (this.elementType ? Container.resolveType(cfg.returnType) : null);
                this.storageModel = cfg.elementType ? c.instance._storageModel.getStorageModel(Container.resolveType(cfg.elementType)) : null;
                break;
            default:
                Guard.raise("Unknown source type for EntitySetExpression: " + this.source.getType().name);
        }

    },
    nodeType: { value: $data.Expressions.ExpressionType.ServiceOperation, enumerable: true }
});$C('$data.Expressions.ContinuationExpressionBuilder', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (mode) {
        this.mode = mode;
    },
    compile: function (query) {

        var findContext = { mode: "find", skipExists: false };
        this.Visit(query.expression, findContext);

        var result = {
            skip: findContext.skipSize,
            take: findContext.pageSize,
            message: ''
        }


        if ('pageSize' in findContext) {
            var expression;
            var context = { mode: this.mode, pageSize: findContext.pageSize };

            if (!findContext.skipExists && (findContext.pageSize)) {
                context.append = true;
                expression = this.Visit(query.expression, context);

            } else if (findContext.skipExists) {
                expression = this.Visit(query.expression, context)
            }

            if (!context.abort) {
                result.expression = expression
            }
            else {
                result.skip = (result.skip || 0) - result.take;
                result.message = 'Invalid skip value!';
            }
        }else{
            result.message = 'take expression not defined in the chain!';
        }

        return result;
    },
    VisitPagingExpression: function (expression, context) {

        switch (context.mode) {
            case 'find':
                if (expression.nodeType === $data.Expressions.ExpressionType.Take) {
                    context.pageSize = expression.amount.value;
                } else {
                    context.skipSize = expression.amount.value;
                    context.skipExists = true;
                }
                break;
            case 'prev':
                if (expression.nodeType === $data.Expressions.ExpressionType.Skip) {
                    var amount = expression.amount.value - context.pageSize;
                    context.abort = amount < 0 && expression.amount.value >= context.pageSize;

                    var constExp = Container.createConstantExpression(Math.max(amount, 0), "number");
                    return Container.createPagingExpression(expression.source, constExp, expression.nodeType);
                } else if (context.append) {
                    //no skip expression, skip: 0, no prev
                    context.abort = true;
                }
                break;
            case 'next':
                if (expression.nodeType === $data.Expressions.ExpressionType.Skip) {
                    var amount = context.pageSize + expression.amount.value;
                    var constExp = Container.createConstantExpression(amount, "number");
                    return Container.createPagingExpression(expression.source, constExp, expression.nodeType);
                } else if (context.append) {
                    //no skip expression, skip: 0
                    var constExp = Container.createConstantExpression(context.pageSize, "number");
                    return Container.createPagingExpression(expression, constExp, $data.Expressions.ExpressionType.Skip);
                }
                break;
            default:
        }

        this.Visit(expression.source, context);
    }
});
$data.Class.define('$data.Validation.ValidationError', null, null, {
    constructor: function (message, propertyDefinition, type) {
        ///<param name="message" type="string" />
        ///<param name="propertyDefinition" type="$data.MemberDefinition" />

        this.Message = message;
        this.PropertyDefinition = propertyDefinition;
        this.Type = type;
    },
    Type: { dataType: 'string' },
    Message: { dataType: "string" },
    PropertyDefinition: { dataType: $data.MemberDefinition }
}, null);

$data.Class.define('$data.Validation.EntityValidationBase', null, null, {

    ValidateEntity: function (entity) {
        ///<param name="entity" type="$data.Entity" />
        return [];
    },

    ValidateEntityField: function (entity, memberDefinition) {
        ///<param name="entity" type="$data.Entity" />
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        return [];
    },

    getValidationValue: function (memberDefinition, validationName) {
        Guard.raise("Pure class");
    },
    getValidationMessage: function (memberDefinition, validationName, defaultMessage) {
        Guard.raise("Pure class");
    }

}, null);

$data.Validation = $data.Validation || {};
$data.Validation.Entity = new $data.Validation.EntityValidationBase();
$data.Class.define('$data.Validation.Defaults', null, null, null, {
    validators: {
        value: {
            required: function (value, definedValue) { return !Object.isNullOrUndefined(value); },
            customValidator: function (value, definedValue) { return Object.isNullOrUndefined(value) || typeof definedValue == "function" ? definedValue(value) : true; },

            minValue: function (value, definedValue) { return Object.isNullOrUndefined(value) || value >= definedValue; },
            maxValue: function (value, definedValue) { return Object.isNullOrUndefined(value) || value <= definedValue; },

            minLength: function (value, definedValue) { return Object.isNullOrUndefined(value) || value.length >= definedValue; },
            maxLength: function (value, definedValue) { return Object.isNullOrUndefined(value) || value.length <= definedValue; },
            length: function (value, definedValue) { return Object.isNullOrUndefined(value) || value.length == definedValue; },
            regex: function (value, definedValue) {
                return Object.isNullOrUndefined(value) ||
                    value.match(typeof definedValue === 'string'
                        ? new RegExp((definedValue.indexOf('/') === 0 && definedValue.lastIndexOf('/') === (definedValue.length - 1)) ? definedValue.slice(1, -1) : definedValue)
                        : definedValue)
            }
        }
    },

    _getGroupValidations: function (validations) {
        var validators = {};
        if (Array.isArray(validations)) {
            for (var i = 0; i < validations.length; i++) {
                var validator = validations[i];
                if (typeof this.validators[validator] === 'function') {
                    validators[validator] = this.validators[validator];
                }
            }
        }

        return validators;
    }
});

$data.Class.define('$data.Validation.EntityValidation', $data.Validation.EntityValidationBase, null, {

    ValidateEntity: function (entity) {
        ///<param name="entity" type="$data.Entity" />

        var errors = [];
        entity.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            errors = errors.concat(this.ValidateEntityField(entity, memDef, undefined, true));
        }, this);
        return errors;
    },
    ValidateEntityField: function (entity, memberDefinition, newValue, valueNotSet) {
        ///<param name="entity" type="$data.Entity" />
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        var errors = [];
        var resolvedType = Container.resolveType(memberDefinition.dataType);
        var typeName = Container.resolveName(resolvedType);
        var value = !valueNotSet ? newValue : entity[memberDefinition.name];

        if (!memberDefinition.inverseProperty && resolvedType && typeof resolvedType.isAssignableTo === 'function' && resolvedType.isAssignableTo($data.Entity)) {
            typeName = $data.Entity.fullName;
        }

        this.fieldValidate(entity, memberDefinition, value, errors, typeName);
        return errors;
    },

    getValidationValue: function (memberDefinition, validationName) {
        var value;
        if (memberDefinition[validationName] && memberDefinition[validationName].value)
            value = memberDefinition[validationName].value;
        else
            value = memberDefinition[validationName];

        if (this.convertableValidation[validationName]) {
            var typeToConvert;
            if (this.convertableValidation[validationName] === true) {
                typeToConvert = memberDefinition.type;
            } else {
                typeToConvert = this.convertableValidation[validationName];
            }

            if (typeToConvert)
                value = Container.convertTo(value, typeToConvert, memberDefinition.elementType);
        }

        return value;
    },
    getValidationMessage: function (memberDefinition, validationName, defaultMessage) {
        var eMessage = defaultMessage;
        if (typeof memberDefinition[validationName] == "object" && memberDefinition[validationName].message)
            eMessage = memberDefinition[validationName].message;
        else if (memberDefinition.errorMessage)
            eMessage = memberDefinition.errorMessage;

        return eMessage;
    },
    createValidationError: function (memberDefinition, validationName, defaultMessage) {
        return new $data.Validation.ValidationError(this.getValidationMessage(memberDefinition, validationName, defaultMessage), memberDefinition, validationName);
    },

    convertableValidation: {
        value: {
            required: '$data.Boolean',
            minValue: true,
            maxValue: true,
            minLength: '$data.Integer',
            maxLength: '$data.Integer',
            length: '$data.Integer'
        }

    },
    supportedValidations: {
        value: {
            //'$data.Entity': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.ObjectID': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Byte': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.SByte': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Decimal': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Float': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Number': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int16': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Integer': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int32': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Int64': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.String': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minLength', 'maxLength', 'length', 'regex']),
            '$data.Date': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.DateTimeOffset': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Time': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minValue', 'maxValue']),
            '$data.Boolean': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Array': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'length']),
            '$data.Object': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Guid': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.Blob': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator', 'minLength', 'maxLength', 'length']),
            '$data.GeographyPoint': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyLineString': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyPolygon': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiPoint': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiLineString': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyMultiPolygon': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeographyCollection': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryPoint': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryLineString': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryPolygon': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiPoint': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiLineString': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryMultiPolygon': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator']),
            '$data.GeometryCollection': $data.Validation.Defaults._getGroupValidations(['required', 'customValidator'])
        }
    },

    fieldValidate: function (entity, memberDefinition, value, errors, validationTypeName) {
        ///<param name="memberDefinition" type="$data.MemberDefinition" />
        ///<param name="value" type="Object" />
        ///<param name="errors" type="Array" />
        ///<param name="validationTypeName" type="string" />
        if (entity.entityState == $data.EntityState.Modified && entity.changedProperties && entity.changedProperties.indexOf(memberDefinition) < 0)
            return;

        var validatonGroup = this.supportedValidations[validationTypeName];
        if (validatonGroup) {
            var validations = Object.keys(validatonGroup);
            validations.forEach(function (validation) {
                if (memberDefinition[validation] && validatonGroup[validation] && !validatonGroup[validation].call(entity, value, this.getValidationValue(memberDefinition, validation)))
                    errors.push(this.createValidationError(memberDefinition, validation, 'Validation error!'));
            }, this);

            if (validationTypeName === $data.Entity.fullName && value instanceof $data.Entity && !value.isValid()) {
                errors.push(this.createValidationError(memberDefinition, 'ComplexProperty', 'Validation error!'));
            }
        }
    }

}, null);

$data.Validation.Entity = new $data.Validation.EntityValidation();

$data.Class.define('$data.Notifications.ChangeDistributorBase', null, null, {
    distributeData: function (collectorData) {
        Guard.raise("Pure class");
    }
}, null);
$data.Class.define('$data.Notifications.ChangeCollectorBase', null, null, {
    buildData: function (entityContextData) {
        Guard.raise("Pure class");
    },
    processChangedData: function (entityData) {
        if (this.Distrbutor && this.Distrbutor.distributeData)
            this.Distrbutor.distributeData(this.buildData(entityData));
    },
    Distrbutor: { enumerable: false, dataType: $data.Notifications.ChangeDistributorBase, storeOnObject: true }
}, null);
$data.Class.define('$data.Notifications.ChangeDistributor', $data.Notifications.ChangeDistributorBase, null, {
    constructor: function (broadcastUrl) {
        this.broadcastUrl = broadcastUrl;
    },
    distributeData: function (data) {
        $data.ajax({
            url: this.broadcastUrl,
            type: "POST",
            data: 'data=' + JSON.stringify(data),
            succes: this.success,
            error: this.error
        });
    },
    broadcastUrl: { dataType: "string" },
    success: function () { },
    error: function () { }
}, null);
$data.Class.define('$data.Notifications.ChangeCollector', $data.Notifications.ChangeCollectorBase, null, {
    buildData: function (entities) {
        var result = [];
        entities.forEach(function (element) {
            var resObj = { entityState: element.data.entityState, typeName: element.data.getType().name };
            var enumerableMemDefCollection = [];

            switch (element.data.entityState) {
                case $data.EntityState.Added:
                    enumerableMemDefCollection = element.data.getType().memberDefinitions.getPublicMappedProperties();
                    break;
                case $data.EntityState.Modified:
                    enumerableMemDefCollection = element.data.changedProperties;
                    break;
                case $data.EntityState.Deleted:
                    enumerableMemDefCollection = element.data.getType().memberDefinitions.getKeyProperties();
                    break;
                default:
                    break;
            }

            enumerableMemDefCollection.forEach(function (memDef) {
                resObj[memDef.name] = element.data[memDef.name];
            });

            result.push(resObj);
        });

        return result;
    }
}, null);$data.Class.define('$data.Transaction', null, null, {
    constructor: function () {
        this._objectId = (new Date()).getTime();
        $data.Trace.log("create: ", this._objectId);

        this.oncomplete = new $data.Event("oncomplete", this);
        this.onerror = new $data.Event("onerror", this);
    },
    abort: function () {
        Guard.raise(new Exception('Not Implemented', 'Not Implemented', arguments));
    },

    _objectId: { type: $data.Integer },
    transaction: { type: $data.Object },

    oncomplete: { type: $data.Event },
    onerror: { type: $data.Event }
}, null);$data.Class.define('$data.Access', null, null, {}, {
    isAuthorized: function(access, user, sets, callback){
        var pHandler = new $data.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();
        
        //clbWrapper.error('Authorization failed', 'Access authorization');
        clbWrapper.success(true);
        
        return pHandlerResult;
        
        /*var error;
        
        if (!access) error = 'Access undefined';
        if (typeof access !== 'number') error = 'Invalid access type';
        if (!user) user = {}; //error = 'User undefined';
        if (!user.roles) user.roles = {}; //error = 'User has no roles';
        if (!roles) roles = {}; //error = 'Roles undefined';
        if (!(roles instanceof Array || typeof roles === 'object')) error = 'Invald roles type';
        
        var pHandler = new $data.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();
        
        if (error){
            clbWrapper.error(error, 'Access authorization');
            return pHandlerResult;
        }
        
        if (user.roles instanceof Array){
            var r = {};
            for (var i = 0; i < user.roles.length; i++){
                if (typeof user.roles[i] === 'string') r[user.roles[i]] = true;
            }
            user.roles = r;
        }
        
        if (roles instanceof Array){
            var r = {};
            for (var i = 0; i < roles.length; i++){
                if (typeof roles[i] === 'string') r[roles[i]] = true;
            }
            roles = r;
        }
        
        var args = arguments;
        var readyFn = function(result){
            if (result) clbWrapper.success(result);
            else clbWrapper.error('Authorization failed', args);
        };
        
        var rolesKeys = Object.getOwnPropertyNames(roles);
        var i = 0;
        
        var callbackFn = function(result){
            if (result) readyFn(result);
        
            if (typeof roles[rolesKeys[i]] === 'boolean' && roles[rolesKeys[i]]){
                if (user.roles[rolesKeys[i]]) readyFn(true);
                else{
                    i++;
                    if (i < rolesKeys.length) callbackFn();
                    else readyFn(false);
                }
            }else if (typeof roles[rolesKeys[i]] === 'function'){
                var r = roles[rolesKeys[i]].call(user);
                
                if (typeof r === 'function') r.call(user, (i < rolesKeys.length ? callbackFn : readyFn));
                else{
                    if (r) readyFn(true);
                    else{
                        i++;
                        if (i < rolesKeys.length) callbackFn();
                        else readyFn(false);
                    }
                }
            }else if (typeof roles[rolesKeys[i]] === 'number'){
                if (((typeof user.roles[rolesKeys[i]] === 'number' && (user.roles[rolesKeys[i]] & access)) ||
                    (typeof user.roles[rolesKeys[i]] !== 'number' && user.roles[rolesKeys[i]])) &&
                    (roles[rolesKeys[i]] & access)) user.roles[rolesKeys[i]] &&  readyFn(true);
                else{
                    i++;
                    if (i < rolesKeys.length) callbackFn();
                    else readyFn(false);
                }
            }
        };
        
        callbackFn();
        
        return pHandlerResult;*/
    },
    getAccessBitmaskFromPermission: function(p){
        var access = $data.Access.None;

        if (p.Create) access |= $data.Access.Create;
        if (p.Read) access |= $data.Access.Read;
        if (p.Update) access |= $data.Access.Update;
        if (p.Delete) access |= $data.Access.Delete;
        if (p.DeleteBatch) access |= $data.Access.DeleteBatch;
        if (p.Execute) access |= $data.Access.Execute;
        
        return access;
    },
    None: { value: 0 },
    Create: { value: 1 },
    Read: { value: 2 },
    Update: { value: 4 },
    Delete: { value: 8 },
    DeleteBatch: { value: 16 },
    Execute: { value: 32 }
});
$data.Class.define('$data.Promise', null, null, {
    always: function () { Guard.raise(new Exception('$data.Promise.always', 'Not implemented!')); },
    done: function () { Guard.raise(new Exception('$data.Promise.done', 'Not implemented!')); },
    fail: function () { Guard.raise(new Exception('$data.Promise.fail', 'Not implemented!')); },
    isRejected: function () { Guard.raise(new Exception('$data.Promise.isRejected', 'Not implemented!')); },
    isResolved: function () { Guard.raise(new Exception('$data.Promise.isResolved', 'Not implemented!')); },
    //notify: function () { Guard.raise(new Exception('$data.Promise.notify', 'Not implemented!')); },
    //notifyWith: function () { Guard.raise(new Exception('$data.Promise.notifyWith', 'Not implemented!')); },
    pipe: function () { Guard.raise(new Exception('$data.Promise.pipe', 'Not implemented!')); },
    progress: function () { Guard.raise(new Exception('$data.Promise.progress', 'Not implemented!')); },
    promise: function () { Guard.raise(new Exception('$data.Promise.promise', 'Not implemented!')); },
    //reject: function () { Guard.raise(new Exception('$data.Promise.reject', 'Not implemented!')); },
    //rejectWith: function () { Guard.raise(new Exception('$data.Promise.rejectWith', 'Not implemented!')); },
    //resolve: function () { Guard.raise(new Exception('$data.Promise.resolve', 'Not implemented!')); },
    //resolveWith: function () { Guard.raise(new Exception('$data.Promise.resolveWith', 'Not implemented!')); },
    state: function () { Guard.raise(new Exception('$data.Promise.state', 'Not implemented!')); },
    then: function () { Guard.raise(new Exception('$data.Promise.then', 'Not implemented!')); }
}, null);

$data.Class.define('$data.PromiseHandlerBase', null, null, {
    constructor: function () { },
    createCallback: function (callBack) {
        callBack = $data.typeSystem.createCallbackSetting(callBack);

        return cbWrapper = {
            success: callBack.success,
            error: callBack.error,
            notify: callBack.notify
        };
    },
    getPromise: function () {
        return new $data.Promise();
    }
}, null);

$data.PromiseHandler = $data.PromiseHandlerBase;
var EventSubscriber = $data.Class.define("EventSubscriber", null, null, {
    constructor: function (handler, state, thisArg) {
        /// <param name="handler" type="Function">
        ///     <summary>event handler</summary>
        ///     <signature>
        ///         <param name="sender" type="$data.Entity" />
        ///         <param name="eventData" type="EventData" />
        ///         <param name="state" type="Object" />
        ///     </signature>
        /// </param>
        /// <param name="state" type="Object" optional="true">custom state object</param>
        /// <param name="thisArg" type="Object" optional="true">[i]this[/i] context for handler</param>
        ///
        /// <field name="handler" type="function($data.Entity sender, EventData eventData, Object state)">event handler</field>
        /// <field name="state" type="Object">custom state object</field>
        /// <field name="thisArg">[i]this[/i] context for handler</field>
        this.handler = handler;
        this.state = state;
        this.thisArg = thisArg;
    },
    handler: {},
    state: {},
    thisArg: {}
});

$data.Event = Event = $data.Class.define("$data.Event", null, null, {
    constructor: function (name, sender) {
        ///<param name="name" type="string">The name of the event</param>
        ///<param name="sender" type="Object">The originator/sender of the event. [this] in handlers will be set to this</param>
        var subscriberList = null;
        var parentObject = sender;

        function detachHandler(list, handler) {
            ///<param name="list" type="Array" elementType="EventSubscriber" />
            ///<param name="handler" type="Function" />
            list.forEach(function (item, index) {
                if (item.handler == handler) {
                    list.splice(index, 1);
                }
            });
        }

        this.attach = function (handler, state, thisArg) {
            ///<param name="handler" type="Function">
            ///<signature>
            ///<param name="sender" type="Object" />
            ///<param name="eventData" type="Object" />
            ///<param name="state" type="Object" />
            ///</signature>
            ///</param>
            ///<param name="state" type="Object" optional="true" />
            ///<param name="thisArg" type="Object" optional="true" />
            if (!subscriberList) {
                subscriberList = [];
            }
            subscriberList.push(new EventSubscriber(handler, state, thisArg || sender));
        };
        this.detach = function (handler) {
            detachHandler(subscriberList, handler);
        };
        this.fire = function (eventData, snder) {
            var snd = snder || sender || this;
            //eventData.eventName = name;
            ///<value name="subscriberList type="Array" />
            if (subscriberList) {
                subscriberList.forEach(function (subscriber) {
                    ///<param name="subscriber" type="EventSubscriber" />
                    try {
                        subscriber.handler.call(subscriber.thisArg, snd, eventData, subscriber.state);
                    } catch(ex) {
                        console.log("unhandled exception in event handler. exception suppressed");
                        console.dir(ex);
                    }
                });
            }
        };
        this.fireCancelAble = function (eventData, snder) {
            var snd = snder || sender || this;
            //eventData.eventName = name;
            ///<value name="subscriberList type="Array" />
            var isValid = true;
            if (subscriberList) {
                subscriberList.forEach(function (subscriber) {
                    ///<param name="subscriber" type="EventSubscriber" />
                    try {
                        isValid = isValid && (subscriber.handler.call(subscriber.thisArg, snd, eventData, subscriber.state) === false ? false : true);
                    } catch (ex) {
                        console.log("unhandled exception in event handler. exception suppressed");
                        console.dir(ex);
                    }
                });
            }
            return isValid;
        };
    }
});


var eventData = $data.Class.define("EventData", null, null, {
    eventName: {}
});

var PropertyChangeEventData = $data.Class.define("PropertyChangeEventData", EventData, null, {
    constructor: function (propertyName, oldValue, newValue) {
        this.propertyName = propertyName;
        this.oldValue = oldValue;
        this.newValue = newValue;
    },
    propertyName: {},
    oldValue: {},
    newValue: {}
});

var PropertyValidationEventData = $data.Class.define("PropertyValidationEventData", EventData, null, {
    constructor: function (propertyName, oldValue, newValue, errors) {
        this.propertyName = propertyName;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.errors = errors;
        this.cancel = false;
    },
    propertyName: {},
    oldValue: {},
    newValue: {},
    errors: {},
    cancel: {}
});



$data.Entity = Entity = $data.Class.define("$data.Entity", null, null, {
    constructor: function (initData, newInstanceOptions) {
        /// <description>
        ///     This class provide a light weight, object-relational interface between 
        ///     your javascript code and database.
        /// </description>
        ///
        /// <signature>
        ///     <param name="initData" type="Object">initialization data</param>
        ///     <example>
        ///         var category = new $news.Types.Category({ Title: 'Tech' });
        ///         $news.context.Categories.add(category);
        ///     </example>
        /// </signature>
        ///
        /// <field name="initData" type="Object">initialization data</field>
        /// <field name="context" type="$data.EntityContext"></field>
        /// <field name="propertyChanging" type="$data.Event"></field>
        /// <field name="propertyChanged" type="$data.Event"></field>
        /// <field name="propertyValidationError" type="$data.Event"></field>
        /// <field name="isValidated" type="Boolean">Determines the current $data.Entity is validated.</field>
        /// <field name="ValidationErrors" type="Array">array of $data.Validation.ValidationError</field>
        /// <field name="ValidationErrors" type="Array">array of MemberDefinition</field>
        /// <field name="entityState" type="Integer"></field>
        /// <field name="changedProperties" type="Array">array of MemberDefinition</field>

        this.initData = {};
        var thisType = this.getType();
        if (thisType.__copyPropertiesToInstance) {
            $data.typeSystem.writePropertyValues(this);
        }

        var ctx = null;
        this.context = ctx;
        if ("setDefaultValues" in thisType) {
            if (!newInstanceOptions || newInstanceOptions.setDefaultValues !== false) {
                if (!initData || Object.keys(initData).length < 1) {
                    initData = thisType.setDefaultValues(initData);
                }
            }
        }

        if (typeof initData === "object") {
            var typeMemDefs = thisType.memberDefinitions;
            var memDefNames = typeMemDefs.getPublicMappedPropertyNames();

            for (var i in initData) {
                if (memDefNames.indexOf(i) > -1) {
                    var memberDef = typeMemDefs.getMember(i);
                    var type = Container.resolveType(memberDef.type);
                    var value = initData[i];

                    if (memberDef.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                        this.initData[i] = value;
                    } else {
                        if (newInstanceOptions && newInstanceOptions.converters) {
                            var converter = newInstanceOptions.converters[Container.resolveName(type)];
                            if (converter)
                                value = converter(value);
                        }

                        this.initData[i] = Container.convertTo(value, type, memberDef.elementType, newInstanceOptions);
                    }
                }
            }

        }

        if (newInstanceOptions && newInstanceOptions.entityBuilder) {
            newInstanceOptions.entityBuilder(this, thisType.memberDefinitions.asArray(), thisType);
        }

        this.changedProperties = undefined;
        this.entityState = undefined;

    },
    toString: function () {
        /// <summary>Returns a string that represents the current $data.Entity</summary>
        /// <returns type="String"/>

        return this.getType().fullName + "(" + (this.Id || this.Name || '') + ")"
    },
    toJSON: function () {
        /// <summary>Creates pure JSON object from $data.Entity.</summary>
        /// <returns type="Object">JSON representation</returns>

        var result = {};
        var self = this;
        this.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
            if (self[memDef.name] instanceof Date && memDef.type && Container.resolveType(memDef.type) === $data.DateTimeOffset) {
                result[memDef.name] = new $data.DateTimeOffset(self[memDef.name]);
            } else {
                result[memDef.name] = self[memDef.name];
            }
        });
        return result;
    },
    equals: function (entity) {
        /// <summary>Determines whether the specified $data.Entity is equal to the current $data.Entity.</summary>
        /// <returns type="Boolean">[b]true[/b] if the specified $data.Entity is equal to the current $data.Entity; otherwise, [b]false[/b].</returns>

        if (entity.getType() !== this.getType()) {
            return false;
        }
        var entityPk = this.getType().memberDefinitions.getKeyProperties();
        for (var i = 0; i < entityPk.length; i++) {
            if (this[entityPk[i].name] != entity[entityPk[i].name]) {
                return false;
            }
        }
        return true;
    },

    propertyChanging: {
        dataType: $data.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function () {
            if (!this._propertyChanging)
                this._propertyChanging = new Event('propertyChanging', this);

            return this._propertyChanging;
        },
        set: function (value) { this._propertyChanging = value; }
    },

    propertyChanged: {
        dataType: $data.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function () {
            if (!this._propertyChanged)
                this._propertyChanged = new Event('propertyChanged', this);

            return this._propertyChanged;
        },
        set: function (value) { this._propertyChanged = value; }
    },

    propertyValidationError: {
        dataType: $data.Event, storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, prototypeProperty: true,
        get: function () {
            if (!this._propertyValidationError)
                this._propertyValidationError = new Event('propertyValidationError', this);

            return this._propertyValidationError;
        },
        set: function (value) { this._propertyValidationError = value; }
    },

    // protected
    storeProperty: function (memberDefinition, value) {
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="value" />

        if (memberDefinition.concurrencyMode !== $data.ConcurrencyMode.Fixed) {
            value = Container.convertTo(value, memberDefinition.type, memberDefinition.elementType);
        }

        var eventData = null;
        if (memberDefinition.monitorChanges != false && (this._propertyChanging || this._propertyChanged || "instancePropertyChanged" in this.constructor)) {
            var origValue = this[memberDefinition.name];
            eventData = new PropertyChangeEventData(memberDefinition.name, origValue, value);
            if (this._propertyChanging)
                this.propertyChanging.fire(eventData);
        }

        if (memberDefinition.monitorChanges != false && (this._propertyValidationError || "instancePropertyValidationError" in this.constructor)) {
            var errors = $data.Validation.Entity.ValidateEntityField(this, memberDefinition, value);
            if (errors.length > 0) {
                var origValue = this[memberDefinition.name];
                var errorEventData = new PropertyValidationEventData(memberDefinition.name, origValue, value, errors);

                if (this._propertyValidationError)
                    this.propertyValidationError.fire(errorEventData);
                if ("instancePropertyValidationError" in this.constructor)
                    this.constructor["instancePropertyValidationError"].fire(errorEventData, this);

                if (errorEventData.cancel == true)
                    return;
            }
        }

        if (memberDefinition.storeOnObject == true) {
            //TODO refactor to Base.getBackingFieldName
            var backingFieldName = "_" + memberDefinition.name;
            this[backingFieldName] = value;
        } else {
            this.initData[memberDefinition.name] = value;
        }
        this.isValidated = false;

        if (memberDefinition.monitorChanges != false && this.entityState == $data.EntityState.Unchanged)
            this.entityState = $data.EntityState.Modified;

        this._setPropertyChanged(memberDefinition);

        if (memberDefinition.monitorChanges != false) {
            //if (!this.changedProperties) {
            //    this.changedProperties = [];
            //}

            //if (!this.changedProperties.some(function (memDef) { return memDef.name == memberDefinition.name }))
            //    this.changedProperties.push(memberDefinition);

            if (this._propertyChanged)
                this.propertyChanged.fire(eventData);

            //TODO mixin framework
            if ("instancePropertyChanged" in this.constructor) {
                this.constructor["instancePropertyChanged"].fire(eventData, this);
            }
        }
    },
    _setPropertyChanged: function (memberDefinition) {
        if (memberDefinition.monitorChanges != false) {
            if (!this.changedProperties) {
                this.changedProperties = [];
            }

            if (!this.changedProperties.some(function (memDef) { return memDef.name == memberDefinition.name }))
                this.changedProperties.push(memberDefinition);
        }
    },

    // protected
    retrieveProperty: function (memberDefinition) {
        /// <param name="memberDefinition" type="MemberDefinition" />

        if (memberDefinition.storeOnObject == true) {
            //TODO refactor to Base.getBackingFieldName
            var backingFieldName = "_" + memberDefinition.name;
            return this[backingFieldName];
        } else {
            return this.initData[memberDefinition.name];
        }
    },

    // protected
    getProperty: function (memberDefinition, callback, tran) {
        /// <summary>Retrieve value of member</summary>
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="callback" type="Function">
        ///     <signature>
        ///         <param name="value" />
        ///     </signature>
        /// </param>
        /// <returns>value associated for [i]memberDefinition[/i]</returns>

        callback = $data.typeSystem.createCallbackSetting(callback);
        if (this[memberDefinition.name] != undefined) {
            if (tran instanceof $data.Transaction)
                callback.success(this[memberDefinition.name], tran);
            else
                callback.success(this[memberDefinition.name]);
            return;
        }

        var context = this.context;
        if (!this.context) {
            try {
                var that = this;
                var storeToken = this.storeToken || this.getType().storeToken;
                if (storeToken && typeof storeToken.factory === 'function') {
                    var ctx = storeToken.factory();
                    return ctx.onReady().then(function (context) {
                        return context.loadItemProperty(that, memberDefinition, callback);
                    });
                }
            } catch (e) { }

            Guard.raise(new Exception('Entity not in context', 'Invalid operation'));
        } else {
            return context.loadItemProperty(this, memberDefinition, callback, tran);
        }
    },
    // protected
    setProperty: function (memberDefinition, value, callback, tran) {
        /// <param name="memberDefinition" type="MemberDefinition" />
        /// <param name="value" />
        /// <param name="callback" type="Function">done</param>
        this[memberDefinition.name] = value;
        
        //callback = $data.typeSystem.createCallbackSetting(callback);
        var pHandler = new $data.PromiseHandler();
        callback = pHandler.createCallback(callback);
        callback.success(this[memberDefinition.name]);
        return pHandler.getPromise();
    },

    isValid: function () {
        /// <summary>Determines the current $data.Entity is validated and valid.</summary>
        /// <returns type="Boolean" />

        if (!this.isValidated) {
            this.ValidationErrors = $data.Validation.Entity.ValidateEntity(this);
            this.isValidated = true;
        }
        return this.ValidationErrors.length == 0;
    },
    isValidated: { dataType: "bool", storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false, value: false },
    ValidationErrors: {
        dataType: Array,
        elementType: $data.Validation.ValidationError,
        storeOnObject: true,
        monitorChanges: true,
        notMapped: true,
        enumerable: false
    },

    resetChanges: function () {
        /// <summary>reset changes</summary>

        delete this._changedProperties;
    },

    changedProperties: {
        dataType: Array,
        elementType: window["MemberDefinition"],
        storeOnObject: true,
        monitorChanges: false,
        notMapped: true,
        enumerable: false
    },

    entityState: { dataType: "integer", storeOnObject: true, monitorChanges: false, notMapped: true, enumerable: false },
    /*
    toJSON: function () {
        if (this.context) {
            var itemType = this.getType();
            var storageModel = this.context._storageModel[itemType.name];
            var o = new Object();
            for (var property in this) {
                if (typeof this[property] !== "function") {
                    var excludedFields = storageModel.Associations.every(function (association) {
                        return association.FromPropertyName == property && (association.FromMultiplicity == "0..1" || association.FromMultiplicity == "1");
                    }, this);
                    if (!excludedFields) {
                        o[property] = this[property];
                    }
                }
            }
            return o;
        }
        return this;
    }   */
    //,
  
    //onReady: function (callback) {
    //    this.__onReadyList = this.__onReadyList || [];
    //    this.__onReadyList.push(callback);
    //},

    remove: function () {
        if ($data.ItemStore && 'EntityInstanceRemove' in $data.ItemStore)
            return $data.ItemStore.EntityInstanceRemove.apply(this, arguments);
        else
            throw 'not implemented'; //todo
    },
    save: function () {
        if ($data.ItemStore && 'EntityInstanceSave' in $data.ItemStore)
            return $data.ItemStore.EntityInstanceSave.apply(this, arguments);
        else
            throw 'not implemented'; //todo
    },
    refresh: function () {
        if ($data.ItemStore && 'EntityInstanceSave' in $data.ItemStore)
            return $data.ItemStore.EntityInstanceRefresh.apply(this, arguments);
        else
            throw 'not implemented'; //todo
    },
    storeToken: { type: Object, monitorChanges: false, notMapped: true, storeOnObject: true },

    getFieldUrl: function (field) {
        if (this.context) {
            return this.context.getFieldUrl(this, field);
        } else if (this.getType().storeToken && typeof this.getType().storeToken.factory === 'function') {
            var context = this.getType().storeToken.factory();
            return context.getFieldUrl(this, field);
        } else if (this.getType().storeToken){
            try {
                var ctx = $data.ItemStore._getContextPromise('default', this.getType());
                if (ctx instanceof $data.EntityContext) {
                    return ctx.getFieldUrl(this, field);
                }
            } catch (e) {
            }
        }
        return '#';
    }
},
{
    //create get_[property] and set_[property] functions for properties
    __setPropertyfunctions: { value: true, notMapped: true, enumerable: false, storeOnObject: true },
    //copy public properties to current instance
    __copyPropertiesToInstance: { value: false, notMapped: true, enumerable: false, storeOnObject: true },

    inheritedTypeProcessor: function (type) {
        if ($data.ItemStore && 'EntityInheritedTypeProcessor' in $data.ItemStore)
            $data.ItemStore.EntityInheritedTypeProcessor.apply(this, arguments);

        //default value setter method factory
        type.defaultValues = {};

        type.memberDefinitions.asArray().forEach(function (pd) {
            if (pd.hasOwnProperty("defaultValue")) {
                type.defaultValues[pd.name] = pd.defaultValue;
            }
        });

        if (Object.keys(type.defaultValues).length > 0) {
            type.setDefaultValues = function (initData, instance) {
                initData = initData || {};
                var dv = type.defaultValues;
                for (var n in dv) {
                    if (!(n in initData)) {
                        var value = dv[n];
                        if ("function" === typeof value) {
                            initData[n] = dv[n](n, instance);
                        } else {
                            initData[n] = dv[n];
                        }
                    }
                }
                return initData;
            }
        }
    },


    //Type Events
    addEventListener: function(eventName, fn) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            this[delegateName] = new $data.Event(eventName, this);
        }
        this[delegateName].attach(fn);
    },
    removeEventListener: function(eventName, fn) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            return;
        }
        this[delegateName].detach(fn);
    },
    raiseEvent: function(eventName, data) {
        var delegateName = "on" + eventName;
        if (!(delegateName in this)) {
            return;
        }
        this[delegateName].fire(data);
    },

    getFieldNames: function () {
        return this.memberDefinitions.getPublicMappedPropertyNames();
    },

    'from$data.Object': function (value, type, t, options) {
        if (!Object.isNullOrUndefined(value)) {
            var newInstanceOptions;
            if (options && options.converters) {
                newInstanceOptions = {
                    converters: options.converters
                }
            }

            return new this(value, newInstanceOptions);
        } else {
            return value;
        }
    }

});


$data.define = function (name, container, definition) {
    if (container && !(container instanceof $data.ContainerClass)) {
        definition = container;
        container = undefined;
    }
    if (!definition) {
        throw new Error("json object type is not supported yet");
    }
    var _def = {};
    var hasKey = false;
    var keyFields = [];
    Object.keys(definition).forEach(function (fieldName) {
        var propDef = definition[fieldName];
        if (typeof propDef === 'object' && ("type" in propDef || "get" in propDef || "set" in propDef)) {

            _def[fieldName] = propDef;
            if (propDef.key) {
                keyFields.push(propDef);
            }

            if (("get" in propDef || "set" in propDef) && (!('notMapped' in propDef) || propDef.notMapped === true)) {
                propDef.notMapped = true;
                propDef.storeOnObject = true;
            }
            if ("get" in propDef && !("set" in propDef)) {
                propDef.set = function () { };
            } else if ("set" in propDef && !("get" in propDef)) {
                propDef.get = function () { };
            }

        } else {
            _def[fieldName] = { type: propDef };
        }
    });

    if (keyFields.length < 1) {
        var keyProp;
        switch (true) {
            case "id" in _def:
                keyProp = "id";
                break;
            case "Id" in _def:
                keyProp = "Id"
                break;
            case "ID" in _def:
                keyProp = "ID"
                break;
        }
        if (keyProp) {
            _def[keyProp].key = true;
            var propTypeName = $data.Container.resolveName(_def[keyProp].type);
            _def[keyProp].computed = true;
            //if ("$data.Number" === propTypeName || "$data.Integer" === propTypeName) {
            //}
        } else {
            _def.Id = { type: "int", key: true, computed: true }
        }
    }


    var entityType = $data.Entity.extend(name, container, _def);
    return entityType;
}
$data.implementation = function (name) {
    return Container.resolveType(name);
};




(function () {

    $data.defaults = $data.defaults || {};
    $data.defaults.defaultDatabaseName = 'JayDataDefault';

})();


$data.Class.define('$data.StorageModel', null, null, {
    constructor: function () {
        ///<field name="LogicalType" type="$data.Entity">User defined type</field>
        this.ComplexTypes = [];
        this.Associations = [];
    },
    LogicalType: {},
    LogicalTypeName: {},
    PhysicalType: {},
    PhysicalTypeName: {},
    EventHandlers: {},
    TableName: {},
    TableOptions: { value: undefined },
    ComplexTypes: {},
    Associations: {},
    ContextType: {},
    Roles: {}
}, null);
$data.Class.define('$data.Association', null, null, {
    constructor: function (initParam) {
        if (initParam) {
            this.From = initParam.From;
            this.FromType = initParam.FromType;
            this.FromMultiplicity = initParam.FromMultiplicity;
            this.FromPropertyName = initParam.FromPropertyName;
            this.To = initParam.To;
            this.ToType = initParam.ToType;
            this.ToMultiplicity = initParam.ToMultiplicity;
            this.ToPropertyName = initParam.ToPropertyName;
        }
    },
    From: {},
    FromType: {},
    FromMultiplicity: {},
    FromPropertyName: {},
    To: {},
    ToType: {},
    ToMultiplicity: {},
    ToPropertyName: {},
    ReferentialConstraint: {}
}, null);
$data.Class.define('$data.ComplexType', $data.Association, null, {}, null);

$data.Class.define('$data.EntityContext', null, null,
{
    constructor: function (storageProviderCfg) {
        /// <description>Provides facilities for querying and working with entity data as objects.</description>
        ///<param name="storageProviderCfg" type="Object">Storage provider specific configuration object.</param>

        if ($data.ItemStore && 'ContextRegister' in $data.ItemStore)
            $data.ItemStore.ContextRegister.apply(this, arguments);

        if (storageProviderCfg.queryCache)
            this.queryCache = storageProviderCfg.queryCache;

        if ("string" === typeof storageProviderCfg) {
            if (0 === storageProviderCfg.indexOf("http")) {
                storageProviderCfg = {
                    name: "oData",
                    oDataServiceHost: storageProviderCfg
                }
            } else {
                storageProviderCfg = {
                    name: "local",
                    databaseName: storageProviderCfg
                }
            }
        }

        if ("provider" in storageProviderCfg) {
            storageProviderCfg.name = storageProviderCfg.provider;
        }

        //Initialize properties
        this.lazyLoad = false;
        this.trackChanges = false;
        this._entitySetReferences = {};
        this._storageModel = [];

        var ctx = this;
        ctx._isOK = false;

        var origSuccessInitProvider = this._successInitProvider;
        this._successInitProvider = function (errorOrContext) {
            if (errorOrContext instanceof $data.EntityContext) {
                origSuccessInitProvider(ctx);
            } else {
                origSuccessInitProvider(ctx, errorOrContext);
            }
        }

        this._storageModel.getStorageModel = function (typeName) {
            var name = Container.resolveName(typeName);
            return ctx._storageModel[name];
        };
        if (typeof storageProviderCfg.name === 'string') {
            var tmp = storageProviderCfg.name;
            storageProviderCfg.name = [tmp];
        }
        var i = 0, providerType;
        var providerList = [].concat(storageProviderCfg.name);
        var callBack = $data.typeSystem.createCallbackSetting({ success: this._successInitProvider, error: this._successInitProvider });

        this._initStorageModelSync();
        ctx._initializeEntitySets(ctx.getType());

        $data.StorageProviderLoader.load(providerList, {
            success: function (providerType) {
                ctx.storageProvider = new providerType(storageProviderCfg, ctx);
                ctx.storageProvider.setContext(ctx);
                ctx.stateManager = new $data.EntityStateManager(ctx);

                var contextType = ctx.getType();
                if (providerType.name in contextType._storageModelCache) {
                    ctx._storageModel = contextType._storageModelCache[providerType.name];
                } else {
                    ctx._initializeStorageModel();
                    contextType._storageModelCache[providerType.name] = ctx._storageModel;
                }

                //ctx._initializeEntitySets(contextType);
                if (storageProviderCfg && storageProviderCfg.user) Object.defineProperty(ctx, 'user', { value: storageProviderCfg.user, enumerable: true });
                if (storageProviderCfg && storageProviderCfg.checkPermission) Object.defineProperty(ctx, 'checkPermission', { value: storageProviderCfg.checkPermission, enumerable: true });

                //ctx._isOK = false;
                if (ctx.storageProvider) {
                    ctx.storageProvider.initializeStore(callBack);
                }
            },
            error: function () {
                callBack.error('Provider fallback failed!');
            }
        });



        this.addEventListener = function (eventName, fn) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                this[delegateName] = new $data.Event(eventName, this);
            }
            this[delegateName].attach(fn);
        };

        this.removeEventListener = function (eventName, fn) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                return;
            }
            this[delegateName].detach(fn);
        };

        this.raiseEvent = function (eventName, data) {
            var delegateName = "on" + eventName;
            if (!(delegateName in this)) {
                return;
            }
            this[delegateName].fire(data);
        };


        this.ready = this.onReady({
            success: $data.defaultSuccessCallback,
            error: function () {
                if ($data.PromiseHandler !== $data.PromiseHandlerBase) {
                    $data.defaultErrorCallback.apply(this, arguments);
                } else {
                    $data.Trace.error(arguments);
                }
            }
        });
    },
    beginTransaction: function () {
        var tables = null;
        var callBack = null;
        var isWrite = false;

        function readParam(value) {
            if (Object.isNullOrUndefined(value)) return;

            if (typeof value === 'boolean') {
                isWrite = value;
            } else if (Array.isArray(value)) {
                tables = value;
            } else {
                callBack = value;
            }
        }

        readParam(arguments[0]);
        readParam(arguments[1]);
        readParam(arguments[2]);

        var pHandler = new $data.PromiseHandler();
        callBack = pHandler.createCallback(callBack);

        //callBack = $data.typeSystem.createCallbackSetting(callBack);
        this.storageProvider._beginTran(tables, isWrite, callBack);

        return pHandler.getPromise();
    },
    _isReturnTransaction: function (transaction) {
        return transaction instanceof $data.Base || transaction === 'returnTransaction';
    },
    _applyTransaction: function (scope, cb, args, transaction, isReturnTransaction) {
        if (isReturnTransaction === true) {
            if (transaction instanceof $data.Transaction) {
                Array.prototype.push.call(args, transaction);
                cb.apply(scope, args);
            } else {
                this.beginTransaction(function (tran) {
                    Array.prototype.push.call(args, tran);
                    cb.apply(scope, args);
                });
            }
        }
        else {
            cb.apply(scope, args);
        }
    },

    getDataType: function (dataType) {
        // Obsolate
        if (typeof dataType == "string") {
            var memDef_dataType = this[dataType];
            if (memDef_dataType === undefined || memDef_dataType === null) { memDef_dataType = eval(dataType); }
            return memDef_dataType;
        }
        return dataType;
    },
    _initializeEntitySets: function (ctor) {

        for (var i = 0, l = this._storageModel.length; i < l; i++){
            var storageModel = this._storageModel[i];
            this[storageModel.ItemName] = new $data.EntitySet(storageModel.LogicalType, this, storageModel.ItemName, storageModel.EventHandlers, storageModel.Roles);
            var sm = this[storageModel.ItemName];
            sm.name = storageModel.ItemName;
            sm.tableName = storageModel.TableName;
            sm.tableOptions = storageModel.TableOptions;
            sm.eventHandlers = storageModel.EventHandlers;
            this._entitySetReferences[storageModel.LogicalType.name] = sm;

            this._initializeActions(sm, ctor, ctor.getMemberDefinition(storageModel.ItemName));

        }

    },

    _initStorageModelSync: function() {
        var _memDefArray = this.getType().memberDefinitions.asArray();


        for (var i = 0; i < _memDefArray.length; i++) {
            var item = _memDefArray[i];
            if ('dataType' in item) {
                var itemResolvedDataType = Container.resolveType(item.dataType);
                if (itemResolvedDataType && itemResolvedDataType.isAssignableTo && itemResolvedDataType.isAssignableTo($data.EntitySet)) {
                    var elementType = Container.resolveType(item.elementType);
                    var storageModel = new $data.StorageModel();
                    storageModel.TableName = item.tableName || item.name;
                    storageModel.TableOptions = item.tableOptions;
                    storageModel.ItemName = item.name;
                    storageModel.LogicalType = elementType;
                    storageModel.LogicalTypeName = elementType.name;
                    storageModel.PhysicalTypeName = $data.EntityContext._convertLogicalTypeNameToPhysical(storageModel.LogicalTypeName);
                    storageModel.ContextType = this.getType();
                    storageModel.Roles = item.roles;
		    if (item.indices) {
                        storageModel.indices = item.indices;
                    }
                    if (item.beforeCreate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeCreate = item.beforeCreate;
                    }
                    if (item.beforeRead) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeRead = item.beforeRead;
                    }
                    if (item.beforeUpdate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeUpdate = item.beforeUpdate;
                    }
                    if (item.beforeDelete) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.beforeDelete = item.beforeDelete;
                    }
                    if (item.afterCreate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterCreate = item.afterCreate;
                    }
                    if (item.afterRead) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterRead = item.afterRead;
                    }
                    if (item.afterUpdate) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterUpdate = item.afterUpdate;
                    }
                    if (item.afterDelete) {
                        if (!storageModel.EventHandlers) storageModel.EventHandlers = {};
                        storageModel.EventHandlers.afterDelete = item.afterDelete;
                    }
                    this._storageModel.push(storageModel);
                    var name = Container.resolveName(elementType);
                    this._storageModel[name] = storageModel;
                }
            }
        }

    },
    _initializeStorageModel: function () {

        
        var _memDefArray = this.getType().memberDefinitions.asArray();
        

        if (typeof intellisense !== 'undefined')
            return;

        
        for (var i = 0; i < this._storageModel.length; i++) {
            var storageModel = this._storageModel[i];

            ///<param name="storageModel" type="$data.StorageModel">Storage model item</param>
            var dbEntityInstanceDefinition = {};

            storageModel.Associations = storageModel.Associations || [];
            storageModel.ComplexTypes = storageModel.ComplexTypes || [];
            for (var j = 0; j < storageModel.LogicalType.memberDefinitions.getPublicMappedProperties().length; j++) {
                var memDef = storageModel.LogicalType.memberDefinitions.getPublicMappedProperties()[j];
                ///<param name="memDef" type="MemberDefinition">Member definition instance</param>

                var memDefResolvedDataType = Container.resolveType(memDef.dataType);

                if ((this.storageProvider.supportedDataTypes.indexOf(memDefResolvedDataType) > -1) && Object.isNullOrUndefined(memDef.inverseProperty)) {
                    //copy member definition
                    var t = JSON.parse(JSON.stringify(memDef));
                    //change datatype to resolved type
                    t.dataType = memDefResolvedDataType;
                    dbEntityInstanceDefinition[memDef.name] = t;
                    continue;
                }

                this._buildDbType_navigationPropertyComplite(memDef, memDefResolvedDataType, storageModel);

                //var memDef_dataType = this.getDataType(memDef.dataType);
                if ((memDefResolvedDataType === $data.Array || (memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo($data.EntitySet))) &&
                    (memDef.inverseProperty && memDef.inverseProperty !== '$$unbound')) {
                    this._buildDbType_Collection_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                } else {
                    if (memDef.inverseProperty) {
                        if (memDef.inverseProperty === '$$unbound') {
                            //member definition is navigation but not back reference
                            if (memDefResolvedDataType === $data.Array) {
                                this._buildDbType_Collection_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                            } else {
                                this._buildDbType_ElementType_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                            }
                        } else {
                            //member definition is navigation property one..one or one..many case
                            var fields = memDefResolvedDataType.memberDefinitions.getMember(memDef.inverseProperty);
                            if (fields) {
                                if (fields.elementType) {
                                    //member definition is one..many connection
                                    var referealResolvedType = Container.resolveType(fields.elementType);
                                    if (referealResolvedType === storageModel.LogicalType) {
                                        this._buildDbType_ElementType_OneManyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                                    } else {
                                        if (typeof intellisense === 'undefined') {
                                            Guard.raise(new Exception('Inverse property not valid, refereed item element type not match: ' + storageModel.LogicalTypeName, ', property: ' + memDef.name));
                                        }
                                    }
                                } else {
                                    //member definition is one..one connection
                                    this._buildDbType_ElementType_OneOneDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                                }
                            } else {
                                if (typeof intellisense === 'undefined') {
                                    Guard.raise(new Exception('Inverse property not valid'));
                                }
                            }
                        }
                    } else {
                        //member definition is a complex type
                        this._buildDbType_addComplexTypePropertyDefinition(dbEntityInstanceDefinition, storageModel, memDefResolvedDataType, memDef);
                    }
                }
            }
            this._buildDbType_modifyInstanceDefinition(dbEntityInstanceDefinition, storageModel, this);
            var dbEntityClassDefinition = {};
            dbEntityClassDefinition.convertTo = this._buildDbType_generateConvertToFunction(storageModel, this);
            this._buildDbType_modifyClassDefinition(dbEntityClassDefinition, storageModel, this);

            //create physical type
            //TODO
            storageModel.PhysicalType = $data.Class.define(storageModel.PhysicalTypeName, $data.Entity, storageModel.LogicalType.container, dbEntityInstanceDefinition, dbEntityClassDefinition);
        }
    },
    _initializeActions: function (es, ctor, esDef) {
        if (esDef && esDef.actions) {
            var actionKeys = Object.keys(esDef.actions);
            for (var i = 0; i < actionKeys.length; i++) {
                var actionName = actionKeys[i];
                var action = esDef.actions[actionName];
                if (typeof action === 'function') {
                    es[actionName] = action;
                } else {
                    var actionDef = $data.MemberDefinition.translateDefinition(action, actionName, ctor);
                    if (actionDef instanceof $data.MemberDefinition && actionDef.kind === $data.MemberTypes.method) {
                        es[actionName] = actionDef.method;
                    }
                }
            }
        }
    },
    _buildDbType_navigationPropertyComplite: function (memDef, memDefResolvedDataType, storageModel) {
        if (!memDef.inverseProperty) {
            var refMemDefs = null;
            if (memDefResolvedDataType === $data.Array || (memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo($data.EntitySet))) {
                var refStorageModel = this._storageModel.getStorageModel(Container.resolveType(memDef.elementType));
                if (refStorageModel) {
                    refMemDefs = [];
                    var pubDefs = refStorageModel.LogicalType.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < pubDefs.length; i++) {
                        var m = pubDefs[i];
                        if ((m.inverseProperty == memDef.name) && (Container.resolveType(m.dataType) === Container.resolveType(storageModel.LogicalType)))
                            refMemDefs.push(m);
                    }
                }
            } else {
                var refStorageModel = this._storageModel.getStorageModel(memDefResolvedDataType);
                if (refStorageModel) {
                    refMemDefs = [];
                    var pubDefs = refStorageModel.LogicalType.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < pubDefs.length; i++) {
                        var m = pubDefs[i];
                        if (m.elementType && ((m.inverseProperty == memDef.name) && (Container.resolveType(m.elementType) === storageModel.LogicalType)))
                            refMemDefs.push(m);
                        else if ((m.inverseProperty == memDef.name) && (Container.resolveType(m.dataType) === storageModel.LogicalType))
                            refMemDefs.push(m);
                    }
                }
            }
            if (refMemDefs) {
                if (refMemDefs.length > 1) {
                    if (typeof intellisense !== 'undefined') {
                        Guard.raise(new Exception('More than one inverse property refer to this member definition: ' + memDef.name + ', type: ' + Container.resolveName(storageModel.LogicalType)));
                    }
                }
                var refMemDef = refMemDefs.pop();
                if (refMemDef) {
                    memDef.inverseProperty = refMemDef.name;
                }
            }
        } else {
            var refStorageModel = null;
            if (memDefResolvedDataType === $data.Array || (memDefResolvedDataType.isAssignableTo && memDefResolvedDataType.isAssignableTo($data.EntitySet))) {
                refStorageModel = this._storageModel.getStorageModel(Container.resolveType(memDef.elementType));

            } else {
                refStorageModel = this._storageModel.getStorageModel(memDefResolvedDataType);
            }

            var p = refStorageModel.LogicalType.memberDefinitions.getMember(memDef.inverseProperty);
            if (p) {
                if (p.inverseProperty) {
                    if (p.inverseProperty != memDef.name) {
                        if (typeof intellisense === 'undefined') {
                            Guard.raise(new Exception('Inverse property mismatch'));
                        }
                    }
                } else {
                    p.inverseProperty = memDef.name;
                }
            }

        }
    },
    _buildDbType_generateConvertToFunction: function (storageModel) { return function (instance) { return instance; }; },
    _buildDbType_modifyInstanceDefinition: function (instanceDefinition, storageModel) { return; },
    _buildDbType_modifyClassDefinition: function (classDefinition, storageModel) { return; },
    _buildDbType_addComplexTypePropertyDefinition: function (dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name, $data.MemberTypes.complexProperty);
        var complexType = this._createComplexElement(storageModel.LogicalType, "", memDef.name, memDef_dataType, "", "");
        storageModel.ComplexTypes[memDef.name] = complexType;
        storageModel.ComplexTypes.push(complexType);
    },
    _buildDbType_Collection_OneManyDefinition: function (dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = Container.resolveType(memDef.elementType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("No EntitySet definition for the following element type", "Field definition", memDef));
            }
        }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);
        var associationType = memDef.inverseProperty === '$$unbound' ? '$$unbound' : '0..1';
        var association = this._addAssociationElement(storageModel.LogicalType, associationType, memDef.name, refereedStorageModel.LogicalType, "*", memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _buildDbType_ElementType_OneManyDefinition: function (dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = Container.resolveType(memDef.dataType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("No EntitySet definition for the following element type", "Field definition", memDef));
            }
        }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);
        var associationType = memDef.inverseProperty === '$$unbound' ? '$$unbound' : '*';
        var association = this._addAssociationElement(storageModel.LogicalType, associationType, memDef.name, refereedStorageModel.LogicalType, "0..1", memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _buildDbType_ElementType_OneOneDefinition: function (dbEntityInstanceDefinition, storageModel, memDef_dataType, memDef) {
        var refereedType = Container.resolveType(memDef.dataType);
        if (refereedType === undefined || refereedType === null) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("Element type definition error", "Field definition", memDef));
            }
        }
        var refereedStorageModel = this._storageModel.getStorageModel(refereedType);;
        //var refereedStorageModel = this._storageModel.filter(function (s) { return s.LogicalType === refereedType; })[0];
        if (!refereedStorageModel) {
            if (typeof intellisense === 'undefined') {
                Guard.raise(new Exception("No EntitySet definition following element type", "Field definition", memDef));
            }
        }

        var refereedMemberDefinition = refereedStorageModel.LogicalType.memberDefinitions.getMember(memDef.inverseProperty);
        if (!refereedMemberDefinition.required && !memDef.required) { if (typeof intellisense === 'undefined') { if (typeof intellisense === 'undefined') { Guard.raise(new Exception('In one to one connection, one side must required!', 'One to One connection', memDef)); } } }

        this._addNavigationPropertyDefinition(dbEntityInstanceDefinition, memDef, memDef.name);

        var association = this._addAssociationElement(storageModel.LogicalType,
                                                 memDef.required ? "0..1" : "1",
                                                 memDef.name,
                                                 refereedStorageModel.LogicalType,
                                                 memDef.required ? "1" : "0..1",
                                                 memDef.inverseProperty);
        storageModel.Associations[memDef.name] = association;
        storageModel.Associations.push(association);
    },
    _addNavigationPropertyDefinition: function (definition, member, associationName, kind) {
        var t = JSON.parse(JSON.stringify(member));
        t.dataType = $data.EntitySet;
        t.notMapped = true;
        t.kind = kind ? kind : $data.MemberTypes.navProperty;
        t.association = associationName;
        definition[member.name] = t;
    },
    _addAssociationElement: function (fromType, fromMultiplicity, fromPropName, toType, toMultiplicity, toPropName) {
        return new $data.Association({
            From: fromType.name,
            FromType: fromType,
            FromMultiplicity: fromMultiplicity,
            FromPropertyName: fromPropName,
            To: toType.name,
            ToType: toType,
            ToMultiplicity: toMultiplicity,
            ReferentialConstraint: [],
            ToPropertyName: toPropName
        });
    },
    _createComplexElement: function (fromType, fromMultiplicity, fromPropName, toType, toMultiplicity, toPropName) {
        return new $data.ComplexType({
            From: fromType.name,
            FromType: fromType,
            FromMultiplicity: fromMultiplicity,
            FromPropertyName: fromPropName,
            To: toType.name,
            ToType: toType,
            ToMultiplicity: toMultiplicity,
            ReferentialConstraint: [],
            ToPropertyName: toPropName
        });
    },

    _successInitProvider: function (context, error) {
        if (context instanceof $data.EntityContext && context._isOK !== undefined) {
            if (!error) {
                context._isOK = true;
                if (context.onReadyFunction) {
                    for (var i = 0; i < context.onReadyFunction.length; i++) {
                        context.onReadyFunction[i].success(context);
                    }
                    context.onReadyFunction = undefined;
                }
            } else {
                context._isOK = error;
                if (context.onReadyFunction) {
                    for (var i = 0; i < context.onReadyFunction.length; i++) {
                        context.onReadyFunction[i].error(error);
                    }
                    context.onReadyFunction = undefined;
                }
            }
        }
    },
    onReady: function (fn) {
        /// <signature>
        ///     <summary>
        ///         Sets the callback function to be called when the initialization of the EntityContext has successfully finished.
        ///     </summary>
        ///     <param name="successCallback" type="Function">
        ///         <summary>Success callback</summary>
        ///         <param name="entityContext" type="$data.EntityContext">Current entityContext object</param>
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>
        ///         Sets the callback functions to be called when the initialization of the EntityContext has finished.
        ///     </summary>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        var pHandler = new $data.PromiseHandler();
        var callBack = pHandler.createCallback(fn);
        if (this._isOK === true) {
            callBack.success(this);
        } else if (this._isOK !== false) {
            callBack.error(this._isOK);
        } else {
            this.onReadyFunction = this.onReadyFunction || [];
            this.onReadyFunction.push(callBack);
        }

        return pHandler.getPromise();
    },
    ready: { type: $data.Promise },
    getEntitySetFromElementType: function (elementType) {
        /// <signature>
        ///     <summary>Gets the matching EntitySet for an element type.</summary>
        ///     <param name="elementType" type="Function" />
        ///     <returns type="$data.EntitySet" />
        /// </signature>
        /// <signature>
        ///     <summary>Gets the matching EntitySet for an element type.</summary>
        ///     <param name="elementType" type="String" />
        ///     <returns type="$data.EntitySet" />
        /// </signature>
        var result = this._entitySetReferences[elementType];
        if (!result) {
            try {
                result = this._entitySetReferences[eval(elementType).name];
            } catch (ex) { }
        }
        return result;
    },
    executeQuery: function (queryable, callBack, transaction) {
        var query = new $data.Query(queryable.expression, queryable.defaultType, this);
        query.transaction = transaction instanceof $data.Transaction ? transaction : undefined;
        var returnTransaction = this._isReturnTransaction(transaction);

        callBack = $data.typeSystem.createCallbackSetting(callBack);
        var that = this;
        var clbWrapper = {};
        clbWrapper.success = function (query) {
            if ($data.QueryCache && $data.QueryCache.isCacheable(that, query)) {
                $data.QueryCache.addToCache(that, query);
            }

            query.buildResultSet(that);

            if ($data.ItemStore && 'QueryResultModifier' in $data.ItemStore)
                $data.ItemStore.QueryResultModifier.call(that, query);

            var successResult;

            if (query.expression.nodeType === $data.Expressions.ExpressionType.Single ||
                query.expression.nodeType === $data.Expressions.ExpressionType.Find ||
                query.expression.nodeType === $data.Expressions.ExpressionType.Count ||
                query.expression.nodeType === $data.Expressions.ExpressionType.BatchDelete ||
                query.expression.nodeType === $data.Expressions.ExpressionType.Some ||
                query.expression.nodeType === $data.Expressions.ExpressionType.Every) {
                if (query.result.length !== 1) {
                    callBack.error(new Exception('result count failed'));
                    return;
                }

                successResult = query.result[0];
            } else if (query.expression.nodeType === $data.Expressions.ExpressionType.First) {
                if (query.result.length === 0) {
                    callBack.error(new Exception('result count failed'));
                    return;
                }

                successResult = query.result[0];
            } else {
                if (typeof query.__count === 'number' && query.result)
                    query.result.totalCount = query.__count;

                that.storageProvider._buildContinuationFunction(that, query);

                successResult = query.result;
            }

            var readyFn = function () {
                that._applyTransaction(callBack, callBack.success, [successResult], query.transaction, returnTransaction);

                /*if (returnTransaction === true) {
                    if (query.transaction)
                        callBack.success(successResult, query.transaction);
                    else {
                        that.beginTransaction(function (tran) {
                            callBack.success(successResult, tran);
                        });
                    }
                }
                else
                    callBack.success(successResult);*/
            };

            var i = 0;
            var sets = query.getEntitySets();

            var callbackFn = function () {
                var es = sets[i];
                if (es.afterRead) {
                    i++;
                    var r = es.afterRead.call(this, successResult, sets, query);
                    if (typeof r === 'function') {
                        r.call(this, i < sets.length ? callbackFn : readyFn, successResult, sets, query);
                    } else {
                        if (i < sets.length) {
                            callbackFn();
                        } else readyFn();
                    }
                } else readyFn();
            }

            if (sets.length) callbackFn();
            else readyFn();
        };

        clbWrapper.error = function () {
            if(returnTransaction)
                callBack.error.apply(this, arguments);
            else
                callBack.error.apply(this, Array.prototype.filter.call(arguments, function (p) { return !(p instanceof $data.Transaction); }));
        };
        var sets = query.getEntitySets();

        var authorizedFn = function () {
            var ex = true;
            var wait = false;
            var ctx = that;

            var readyFn = function (cancel) {
                if (cancel === false) ex = false;

                if (ex) {
                    if (query.transaction) {
                        if ($data.QueryCache && $data.QueryCache.isInCache(that, query)) {
                            $data.QueryCache.executeQuery(that, query, clbWrapper);
                        } else {
                            ctx.storageProvider.executeQuery(query, clbWrapper);
                        }
                    } else {
                        ctx.beginTransaction(function (tran) {
                            query.transaction = tran;
                            if ($data.QueryCache && $data.QueryCache.isInCache(that, query)) {
                                $data.QueryCache.executeQuery(that, query, clbWrapper);
                            } else {
                                ctx.storageProvider.executeQuery(query, clbWrapper);
                            }
                        });
                    }
                } else {
                    query.rawDataList = [];
                    query.result = [];
                    clbWrapper.success(query);
                }
            };

            var i = 0;
            var callbackFn = function (cancel) {
                if (cancel === false) ex = false;

                var es = sets[i];
                if (es.beforeRead) {
                    i++;
                    var r = es.beforeRead.call(this, sets, query);
                    if (typeof r === 'function') {
                        r.call(this, (i < sets.length && ex) ? callbackFn : readyFn, sets, query);
                    } else {
                        if (r === false) ex = false;

                        if (i < sets.length && ex) {
                            callbackFn();
                        } else readyFn();
                    }
                } else readyFn();
            };

            if (sets.length) callbackFn();
            else readyFn();
        };

        if (this.user && this.checkPermission) {
            this.checkPermission(query.expression.nodeType === $data.Expressions.ExpressionType.BatchDelete ? $data.Access.DeleteBatch : $data.Access.Read, this.user, sets, {
                success: authorizedFn,
                error: clbWrapper.error
            });
        } else authorizedFn();
    },
    saveChanges: function (callback, transaction) {
        /// <signature>
        ///     <summary>
        ///         Saves the changes made to the context.
        ///     </summary>
        ///     <param name="successCallback" type="Function">
        ///         <summary>Success callback</summary>
        ///         <param name="entityContext" type="$data.EntityContext">Current entityContext object</param>
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>
        ///         Saves the changes made to the context.
        ///     </summary>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>

        if ($data.QueryCache) {
            $data.QueryCache.reset(this);
        }

        var changedEntities = [];
        var trackedEntities = this.stateManager.trackedEntities;
        var pHandler = new $data.PromiseHandler();
        var clbWrapper = pHandler.createCallback(callback);
        var pHandlerResult = pHandler.getPromise();
        var returnTransaction = this._isReturnTransaction(transaction);

        var skipItems = [];
        while (trackedEntities.length > 0) {
            var additionalEntities = [];
            //trackedEntities.forEach(function (entityCachedItem) {
            for (var i = 0; i < trackedEntities.length; i++) {
                var entityCachedItem = trackedEntities[i];

                var sModel = this._storageModel.getStorageModel(entityCachedItem.data.getType());
                if (entityCachedItem.data.entityState == $data.EntityState.Unchanged) {
                    entityCachedItem.skipSave = true;
                    skipItems.push(entityCachedItem.data);
                } else {
                    if (entityCachedItem.data.entityState == $data.EntityState.Modified) {
                        if (entityCachedItem.data.changedProperties) {
                            var changeStoredProperty = entityCachedItem.data.changedProperties.some(function (p) {
                                var pMemDef = sModel.PhysicalType.memberDefinitions.getMember(p.name);
                                if (pMemDef.kind == $data.MemberTypes.navProperty) {
                                    var a = sModel.Associations[pMemDef.association];
                                    var multiplicity = a.FromMultiplicity + a.ToMultiplicity;
                                    return ((multiplicity == '*0..1') || (multiplicity == '0..11'))
                                }
                                return true;
                            });
                            if (!changeStoredProperty) {
                                entityCachedItem.skipSave = true;
                                skipItems.push(entityCachedItem.data);
                            }
                        }
                    }
                }

                //type before events with items
                this.processEntityTypeBeforeEventHandler(skipItems, entityCachedItem);

                var navigationProperties = [];
                var smPhyMemDefs = sModel.PhysicalType.memberDefinitions.asArray();
                for (var ism = 0; ism < smPhyMemDefs.length; ism++) {
                    var p = smPhyMemDefs[ism];
                    if (p.kind == $data.MemberTypes.navProperty)
                        navigationProperties.push(p);
                }
                //var navigationProperties = sModel.PhysicalType.memberDefinitions.asArray().filter(function (p) { return p.kind == $data.MemberTypes.navProperty; });
                //navigationProperties.forEach(function (navProp) {
                for (var j = 0; j < navigationProperties.length; j++) {
                    var navProp = navigationProperties[j];

                    var association = sModel.Associations[navProp.name]; //eg.:"Profile"
                    var name = navProp.name; //eg.: "Profile"
                    var navPropertyName = association.ToPropertyName; //eg.: User

                    var connectedDataList = [].concat(entityCachedItem.data[name]);
                    //connectedDataList.forEach(function (data) {
                    for (var k = 0; k < connectedDataList.length; k++) {
                        var data = connectedDataList[k];

                        if (data) {
                            var value = data[navPropertyName];
                            var associationType = association.FromMultiplicity + association.ToMultiplicity;
                            if (association.FromMultiplicity === '$$unbound') {
                                if (data instanceof $data.Array) {
                                    entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                    //data.forEach(function (dataItem) {
                                    for (var l = 0; l < data.length; l++) {
                                        var dataItem = data[l];

                                        if ((entityCachedItem.dependentOn.indexOf(data) < 0) && (data.skipSave !== true)) {
                                            entityCachedItem.dependentOn.push(data);
                                        }
                                    }
                                    //}, this);
                                } else {
                                    entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                    if ((entityCachedItem.dependentOn.indexOf(data) < 0) && (data.skipSave !== true)) {
                                        entityCachedItem.dependentOn.push(data);
                                    }
                                }
                            } else {
                                switch (associationType) {
                                    case "*0..1": //Array
                                        if (value) {
                                            if (value instanceof Array) {
                                                if (value.indexOf(entityCachedItem.data) == -1) {
                                                    value.push(entityCachedItem.data);
                                                    data.initData[navPropertyName] = value;
                                                    data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                                }
                                            } else {
                                                if (typeof intellisense === 'undefined') {
                                                    Guard.raise("Item must be array or subtype of array");
                                                }
                                            }
                                        } else {
                                            data.initData[navPropertyName] = [entityCachedItem.data];
                                            data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                        }
                                        break;
                                    default: //Item
                                        if (value) {
                                            if (value !== entityCachedItem.data) {
                                                if (typeof intellisense === 'undefined') {
                                                    Guard.raise("Integrity check error! Item assigned to another entity!");
                                                }
                                            }
                                        } else {
                                            data.initData[navPropertyName] = entityCachedItem.data; //set back reference for live object
                                            data._setPropertyChanged(association.ToType.getMemberDefinition(navPropertyName));
                                        }
                                        break;
                                }
                                switch (associationType) {
                                    case "*0..1":
                                    case "0..11":
                                        entityCachedItem.dependentOn = entityCachedItem.dependentOn || [];
                                        if ((entityCachedItem.dependentOn.indexOf(data) < 0) && (data.skipSave !== true)) {
                                            entityCachedItem.dependentOn.push(data);
                                        }
                                        break;
                                }
                            }
                            if (!data.entityState) {
                                if (data.storeToken === this.storeToken) {
                                    data.entityState = $data.EntityState.Modified;
                                } else {
                                    data.entityState = $data.EntityState.Added;
                                }
                            }
                            if (additionalEntities.indexOf(data) == -1) {
                                additionalEntities.push(data);
                            }
                        }
                    }
                    //}, this);
                }
                //}, this);
            }
            //}, this);

            //trackedEntities.forEach(function (entity) {
            for (var i = 0; i < trackedEntities.length; i++) {
                var entity = trackedEntities[i];

                if (entity.skipSave !== true) { changedEntities.push(entity); }
            }
            //});

            trackedEntities = [];
            //additionalEntities.forEach(function (item) {
            for (var i = 0; i < additionalEntities.length; i++) {
                var item = additionalEntities[i];

                if (!skipItems.some(function (entity) { return entity == item; })) {
                    if (!changedEntities.some(function (entity) { return entity.data == item; })) {
                        trackedEntities.push({ data: item, entitySet: this.getEntitySetFromElementType(item.getType().name) });
                    }
                }
            }
            //}, this);
        }


        //changedEntities.forEach(function (d) {
        for (var j = 0; j < changedEntities.length; j++) {
            var d = changedEntities[j];

            if (d.dependentOn) {
                var temp = [];
                for (var i = 0; i < d.dependentOn.length; i++) {
                    if (skipItems.indexOf(d.dependentOn[i]) < 0) {
                        temp.push(d.dependentOn[i]);
                    }
                }
                d.dependentOn = temp;
            }
        }
        //});
        skipItems = null;
        var ctx = this;
        if (changedEntities.length == 0) {
            this.stateManager.trackedEntities.length = 0;
            ctx._applyTransaction(clbWrapper, clbWrapper.success, [0], transaction, returnTransaction);

            /*if (returnTransaction) {
                clbWrapper.success(0, transaction);
            } else {
                clbWrapper.success(0);
            }*/
            return pHandlerResult;
        }

        //validate entities
        var errors = [];
        //changedEntities.forEach(function (entity) {
        for (var i = 0; i < changedEntities.length; i++) {
            var entity = changedEntities[i];

            if (entity.data.entityState === $data.EntityState.Added) {
                //entity.data.getType().memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                for (var j = 0; j < entity.data.getType().memberDefinitions.getPublicMappedProperties().length; j++) {
                    var memDef = entity.data.getType().memberDefinitions.getPublicMappedProperties()[j];

                    var memDefType = Container.resolveType(memDef.type);
                    if (memDef.required && !memDef.computed && !entity.data[memDef.name]) {
                        switch (memDefType) {
                            case $data.String:
                            case $data.Number:
                            case $data.Float:
                            case $data.Decimal:
                            case $data.Integer:
                            case $data.Int16:
                            case $data.Int32:
                            case $data.Int64:
                            case $data.Byte:
                            case $data.SByte:
                            case $data.Date:
                            case $data.Boolean:
                                entity.data[memDef.name] = Container.getDefault(memDef.dataType);
                                break;
                            default:
                                break;
                        }
                    }
                }
                //}, this);
            }
            if ((entity.data.entityState === $data.EntityState.Added || entity.data.entityState === $data.EntityState.Modified)
                && !entity.data.isValid()) {
                errors.push({ item: entity.data, errors: entity.data.ValidationErrors });
            }
        }
        //});
        if (errors.length > 0) {
            clbWrapper.error(errors);
            return pHandlerResult;
        }

        var access = $data.Access.None;

        var eventData = {};
        var sets = [];
        for (var i = 0; i < changedEntities.length; i++) {
            var it = changedEntities[i];
            var n = it.entitySet.elementType.name;
            if (sets.indexOf(it.entitySet) < 0) sets.push(it.entitySet);
            var es = this._entitySetReferences[n];
            if (es.beforeCreate || es.beforeUpdate || es.beforeDelete || (this.user && this.checkPermission)) {
                if (!eventData[n]) eventData[n] = {};

                switch (it.data.entityState) {
                    case $data.EntityState.Added:
                        access |= $data.Access.Create;
                        if (es.beforeCreate) {
                            if (!eventData[n].createAll) eventData[n].createAll = [];
                            eventData[n].createAll.push(it);
                        }
                        break;
                    case $data.EntityState.Modified:
                        access |= $data.Access.Update;
                        if (es.beforeUpdate) {
                            if (!eventData[n].modifyAll) eventData[n].modifyAll = [];
                            eventData[n].modifyAll.push(it);
                        }
                        break;
                    case $data.EntityState.Deleted:
                        access |= $data.Access.Delete;
                        if (es.beforeDelete) {
                            if (!eventData[n].deleteAll) eventData[n].deleteAll = [];
                            eventData[n].deleteAll.push(it);
                        }
                        break;
                }
            }
        }

        var readyFn = function (cancel) {
            if (cancel === false) {
                cancelEvent = 'async';
                changedEntities.length = 0;
            }

            if (changedEntities.length) {
                //console.log('changedEntities: ', changedEntities.map(function(it){ return it.data.initData; }));

                var innerCallback = {
                    success: function (tran) {
                        ctx._postProcessSavedItems(clbWrapper, changedEntities, tran, returnTransaction);
                    },
                    error: function () {
                        //TODO remove trans from args;
                        if (returnTransaction)
                            clbWrapper.error.apply(this, arguments);
                        else
                            clbWrapper.error.apply(this, Array.prototype.filter.call(arguments, function (p) { return !(p instanceof $data.Transaction); }));
                    }
                };

                if (transaction instanceof $data.Transaction){
                    ctx.storageProvider.saveChanges(innerCallback, changedEntities, transaction);
                } else {
                    ctx.beginTransaction(true, function (tran) {
                        ctx.storageProvider.saveChanges(innerCallback, changedEntities, tran);
                    });
                }
            } else if (cancelEvent) {
                clbWrapper.error(new Exception('Cancelled event in ' + cancelEvent, 'CancelEvent'));
            } else {
                ctx._applyTransaction(clbWrapper, clbWrapper.success, [0], transaction, returnTransaction);

                /*if(returnTransaction)
                    clbWrapper.success(0, transaction);
                else
                    clbWrapper.success(0);*/
            };

            /*else if (cancelEvent) clbWrapper.error(new $data.Exception('saveChanges cancelled from event [' + cancelEvent + ']'));
            else Guard.raise('No changed entities');*/
        };

        var cancelEvent;
        var ies = Object.getOwnPropertyNames(eventData);
        var i = 0;
        var cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
        var cmdAll = {
            beforeCreate: 'createAll',
            beforeDelete: 'deleteAll',
            beforeUpdate: 'modifyAll'
        };

        var callbackFn = function (cancel) {
            if (cancel === false) {
                cancelEvent = 'async';
                changedEntities.length = 0;

                readyFn(cancel);
                return;
            }

            var es = ctx._entitySetReferences[ies[i]];
            var c = cmd.pop();
            var ed = eventData[ies[i]];
            var all = ed[cmdAll[c]];

            if (all) {
                var m = [];
                for (var im = 0; im < all.length; im++) {
                    m.push(all[im].data);
                }
                //var m = all.map(function(it){ return it.data; });
                if (!cmd.length) {
                    cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
                    i++;
                }

                var r = es[c].call(ctx, m);
                if (typeof r === 'function') {
                    r.call(ctx, (i < ies.length && !cancelEvent) ? callbackFn : readyFn, m);
                } else if (r === false) {
                    cancelEvent = (es.name + '.' + c);
                    //all.forEach(function (it) {
                    for (var index = 0; index < all.length; index++) {
                        var it = all[index];

                        var ix = changedEntities.indexOf(it);
                        changedEntities.splice(ix, 1);
                    }
                    //});

                    readyFn();
                } else {
                    if (i < ies.length && !cancelEvent) callbackFn();
                    else readyFn();
                }
            } else {
                if (!cmd.length) {
                    cmd = ['beforeUpdate', 'beforeDelete', 'beforeCreate'];
                    i++;
                }

                if (i < ies.length && !cancelEvent) callbackFn();
                else readyFn();
            }
        };

        if (this.user && this.checkPermission) {
            this.checkPermission(access, this.user, sets, {
                success: function () {
                    if (i < ies.length) callbackFn();
                    else readyFn();
                },
                error: clbWrapper.error
            });
        } else {
            if (i < ies.length) callbackFn();
            else readyFn();
        }

        return pHandlerResult;
    },

    processEntityTypeBeforeEventHandler: function (skipItems, entityCachedItem) {
        if (!entityCachedItem.skipSave) {
            var entity = entityCachedItem.data;
            var entityType = entity.getType();
            var state = entity.entityState;

            switch (true) {
                case state === $data.EntityState.Added && entityType.onbeforeCreate instanceof $data.Event:
                    if (entityType.onbeforeCreate.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                case state === $data.EntityState.Modified && entityType.onbeforeUpdate instanceof $data.Event:
                    if (entityType.onbeforeUpdate.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                case state === $data.EntityState.Deleted && entityType.onbeforeDelete instanceof $data.Event:
                    if (entityType.onbeforeDelete.fireCancelAble(entity) === false) {
                        entityCachedItem.skipSave = true;
                        skipItems.push(entity);
                    }
                    break;
                default:
                    break;
            }
        }
    },
    processEntityTypeAfterEventHandler: function (entityCachedItem) {
        var entity = entityCachedItem.data;
        var entityType = entity.getType();
        var state = entity.entityState;

        switch (true) {
            case state === $data.EntityState.Added && entityType.onafterCreate instanceof $data.Event:
                entityType.onafterCreate.fire(entity);
                break;
            case state === $data.EntityState.Modified && entityType.onafterUpdate instanceof $data.Event:
                entityType.onafterUpdate.fire(entity);
                break;
            case state === $data.EntityState.Deleted && entityType.onafterDelete instanceof $data.Event:
                entityType.onafterDelete.fire(entity);
                break;
            default:
                break;
        }
    },

    bulkInsert: function (entitySet, fields, datas, callback) {
        var pHandler = new $data.PromiseHandler();
        callback = pHandler.createCallback(callback);
        if (typeof entitySet === 'string') {
            var currentEntitySet;

            for (var entitySetName in this._entitySetReferences) {
                var actualEntitySet = this._entitySetReferences[entitySetName];
                if (actualEntitySet.tableName === entitySet) {
                    currentEntitySet = actualEntitySet;
                    break;
                }
            }

            if (!currentEntitySet)
                currentEntitySet = this[entitySet];

            entitySet = currentEntitySet;
        }
        if (entitySet) {
            this.storageProvider.bulkInsert(entitySet, fields, datas, callback);
        } else {
            callback.error(new Exception('EntitySet not found'));
        }
        return pHandler.getPromise();
    },

    prepareRequest: function () { },
    _postProcessSavedItems: function (callBack, changedEntities, transaction, returnTransaction) {
        if (this.ChangeCollector && this.ChangeCollector instanceof $data.Notifications.ChangeCollectorBase)
            this.ChangeCollector.processChangedData(changedEntities);

        var eventData = {};
        var ctx = this;
        //changedEntities.forEach(function (entity) {
        for (var i = 0; i < changedEntities.length; i++) {
            var entity = changedEntities[i];

            if (!entity.data.storeToken)
                entity.data.storeToken = ctx.storeToken;

            //type after events with items
            this.processEntityTypeAfterEventHandler(entity);

            var oes = entity.data.entityState;

            entity.data.entityState = $data.EntityState.Unchanged;
            entity.data.changedProperties = [];
            entity.physicalData = undefined;

            var n = entity.entitySet.elementType.name;
            var es = ctx._entitySetReferences[n];


            var eventName = undefined;
            switch (oes) {
                case $data.EntityState.Added:
                    eventName = 'added';
                    break;
                case $data.EntityState.Deleted:
                    eventName = 'deleted';
                    break;
                case $data.EntityState.Modified:
                    eventName = 'updated';
                    break;
            }
            if (eventName) {
                this.raiseEvent(eventName, entity);
            }

            if (es.afterCreate || es.afterUpdate || es.afterDelete) {
                if (!eventData[n]) eventData[n] = {};

                switch (oes) {
                    case $data.EntityState.Added:
                        if (es.afterCreate) {
                            if (!eventData[n].createAll) eventData[n].createAll = [];
                            eventData[n].createAll.push(entity);
                        }
                        break;
                    case $data.EntityState.Modified:
                        if (es.afterUpdate) {
                            if (!eventData[n].modifyAll) eventData[n].modifyAll = [];
                            eventData[n].modifyAll.push(entity);
                        }
                        break;
                    case $data.EntityState.Deleted:
                        if (es.afterDelete) {
                            if (!eventData[n].deleteAll) eventData[n].deleteAll = [];
                            eventData[n].deleteAll.push(entity);
                        }
                        break;
                }
            }
        }
        //});

        var ies = Object.getOwnPropertyNames(eventData);
        var i = 0;
        var ctx = this;
        var cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
        var cmdAll = {
            afterCreate: 'createAll',
            afterDelete: 'deleteAll',
            afterUpdate: 'modifyAll'
        };

        var readyFn = function () {
            if (!ctx.trackChanges) {
                ctx.stateManager.reset();
            }

            ctx._applyTransaction(callBack, callBack.success, [changedEntities.length], transaction, returnTransaction);

            /*if (returnTransaction)
                callBack.success(changedEntities.length, transaction);
            else
                callBack.success(changedEntities.length);*/
        };

        var callbackFn = function () {
            var es = ctx._entitySetReferences[ies[i]];
            var c = cmd.pop();
            var ed = eventData[ies[i]];
            var all = ed[cmdAll[c]];
            if (all) {
                var m = [];
                for (var im = 0; im < all.length; im++) {
                    m.push(all[im].data);
                }
                //var m = all.map(function(it){ return it.data; });
                if (!cmd.length) {
                    cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
                    i++;
                }

                var r = es[c].call(ctx, m);
                if (typeof r === 'function') {
                    r.call(ctx, i < ies.length ? callbackFn : readyFn, m);
                } else {
                    if (i < ies.length) callbackFn();
                    else readyFn();
                }
            } else {
                if (!cmd.length) {
                    cmd = ['afterUpdate', 'afterDelete', 'afterCreate'];
                    i++;
                }

                if (i < ies.length) callbackFn();
                else readyFn();
            }
        };

        if (i < ies.length) callbackFn();
        else readyFn();
    },
    forEachEntitySet: function (fn, ctx) {
        /// <summary>
        ///     Iterates over the entity sets' of current EntityContext.
        /// </summary>
        /// <param name="fn" type="Function">
        ///     <param name="entitySet" type="$data.EntitySet" />
        /// </param>
        /// <param name="ctx">'this' argument for the 'fn' function.</param>
        for (var entitySetName in this._entitySetReferences) {
            var actualEntitySet = this._entitySetReferences[entitySetName];
            fn.call(ctx, actualEntitySet);
        }
    },

    loadItemProperty: function (entity, property, callback, transaction) {
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callback" type="Function">
        ///         <summary>C  allback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="MemberDefinition">Property definition</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="MemberDefinition">Property definition</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        Guard.requireType('entity', entity, $data.Entity);

        var memberDefinition = typeof property === 'string' ? entity.getType().memberDefinitions.getMember(property) : property;
        var returnTransaction = this._isReturnTransaction(transaction);

        if (entity[memberDefinition.name] != undefined) {

            var pHandler = new $data.PromiseHandler();
            callBack = pHandler.createCallback(callback);
            this._applyTransaction(callback, callback.success, [entity[memberDefinition.name]], transaction, returnTransaction);
            /*if (returnTransaction)
                callback.success(entity[memberDefinition.name], transaction);
            else
                callback.success(entity[memberDefinition.name]);*/
                
            return pHandler.getPromise();
        }

        var isSingleSide = true;
        var storageModel = this._storageModel.getStorageModel(entity.getType().fullName);
        var elementType = Container.resolveType(memberDefinition.dataType);
        if (elementType === $data.Array || (elementType.isAssignableTo && elementType.isAssignableTo($data.EntitySet))) {
            elementType = Container.resolveType(memberDefinition.elementType);

            isSingleSide = false;

        } else {
            var associations;
            for (var i = 0; i < storageModel.Associations.length; i++) {
                var assoc = storageModel.Associations[i];
                if (assoc.FromPropertyName == memberDefinition.name) {
                    associations = assoc;
                    break;
                }
            }
            //var associations = storageModel.Associations.filter(function (assoc) { return assoc.FromPropertyName == memberDefinition.name; })[0];
            if (associations && associations.FromMultiplicity === "0..1" && associations.ToMultiplicity === "1")
                isSingleSide = false;
        }

        var keyProp = storageModel.LogicalType.memberDefinitions.getKeyProperties();
        if (isSingleSide === true) {
            //singleSide

            var filterFunc = "function (e) { return";
            var filterParams = {};
            //storageModel.LogicalType.memberDefinitions.getKeyProperties().forEach(function (memDefKey, index) {
            for (var index = 0; index < keyProp.length; index++) {
                var memDefKey = keyProp[index];

                if (index > 0)
                    filterFunc += ' &&';
                filterFunc += " e." + memDefKey.name + " == this.key" + index;
                filterParams['key' + index] = entity[memDefKey.name];
            }
            //});
            filterFunc += "; }"

            var entitySet = this.getEntitySetFromElementType(entity.getType());
            return entitySet
                .map('function (e) { return e.' + memberDefinition.name + ' }')
                .single(filterFunc, filterParams, callback, transaction);
        } else {
            //multipleSide

            var filterFunc = "function (e) { return"
            var filterParams = {};
            //storageModel.LogicalType.memberDefinitions.getKeyProperties().forEach(function (memDefKey, index) {
            for (var index = 0; index < keyProp.length; index++) {
                var memDefKey = keyProp[index];

                if (index > 0)
                    filterFunc += ' &&';
                filterFunc += " e." + memberDefinition.inverseProperty + "." + memDefKey.name + " == this.key" + index;
                filterParams['key' + index] = entity[memDefKey.name];
            }
            //});
            filterFunc += "; }"

            var entitySet = this.getEntitySetFromElementType(elementType);
            return entitySet
                .filter(filterFunc, filterParams)
                .toArray(callback, transaction);
        }

    },

    getTraceString: function (queryable) {
        /// <summary>
        /// Returns a trace string. Used for debugging purposes!
        /// </summary>
        /// <param name="queryable" type="$data.Queryable" />
        /// <returns>Trace string</returns>
        var query = new $data.Query(queryable.expression, queryable.defaultType, this);
        return this.storageProvider.getTraceString(query);
    },
    log: function (logInfo) {
        //noop as do nothing
    },

    resolveBinaryOperator: function (operator, expression, frameType) {
        return this.storageProvider.resolveBinaryOperator(operator, expression, frameType);
    },
    resolveUnaryOperator: function (operator, expression, frameType) {
        return this.storageProvider.resolveUnaryOperator(operator, expression, frameType);
    },
    resolveFieldOperation: function (operation, expression, frameType) {
        return this.storageProvider.resolveFieldOperation(operation, expression, frameType);
    },
    resolveSetOperations: function (operation, expression, frameType) {
        return this.storageProvider.resolveSetOperations(operation, expression, frameType);
    },
    resolveTypeOperations: function (operation, expression, frameType) {
        return this.storageProvider.resolveTypeOperations(operation, expression, frameType);
    },
    resolveContextOperations: function (operation, expression, frameType) {
        return this.storageProvider.resolveContextOperations(operation, expression, frameType);
    },

    _generateServiceOperationQueryable: function (functionName, returnEntitySet, arg, parameters) {
        if (typeof console !== 'undefined' && console.log)
            console.log('Obsolate: _generateServiceOperationQueryable, $data.EntityContext');

        var params = [];
        for (var i = 0; i < parameters.length; i++) {
            var obj = {};
            obj[parameters[i]] = Container.resolveType(Container.getTypeName(arg[i]));
            params.push(obj);
        }

        var tempOperation = $data.EntityContext.generateServiceOperation({ serviceName: functionName, returnType: $data.Queryable, elementType: this[returnEntitySet].elementType, params: params });
        return tempOperation.apply(this, arg);
    },
    attach: function (entity, keepChanges) {
        /// <summary>
        ///     Attaches an entity to its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the attached entity.</returns>

        if (entity instanceof $data.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.attach(entity, keepChanges);
    },
    attachOrGet: function (entity) {
        /// <summary>
        ///     Attaches an entity to its matching entity set, or returns if it's already attached.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the entity.</returns>

        if (entity instanceof $data.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.attachOrGet(entity);
    },

    addMany: function (entities) {
        /// <summary>
        ///     Adds several entities to their matching entity set.
        /// </summary>
        /// <param name="entity" type="Array" />
        /// <returns type="Array">Returns the added entities.</returns>
        var self = this;
        entities.forEach(function (entity) {
            self.add(entity);
        });
        return entities;
    },

    add: function (entity) {
        /// <summary>
        ///     Adds a new entity to its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the added entity.</returns>

        if (entity instanceof $data.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.add(entity);
    },
    remove: function (entity) {
        /// <summary>
        ///     Removes an entity from its matching entity set.
        /// </summary>
        /// <param name="entity" type="$data.Entity" />
        /// <returns type="$data.Entity">Returns the removed entity.</returns>

        if (entity instanceof $data.EntityWrapper) {
            entity = entity.getEntity();
        }
        var entitySet = this.getEntitySetFromElementType(entity.getType());
        return entitySet.remove(entity);
    },
    storeToken: { type: Object },

    getFieldUrl: function (entity, member, collection) {
        try {
            var entitySet = typeof collection === 'string' ? this[collection] : collection;
            var fieldName = typeof member === 'string' ? member : member.name;
            if (entity instanceof $data.Entity) {
                entitySet = this.getEntitySetFromElementType(entity.getType());
            } else if (!Object.isNullOrUndefined(entity) && entity.constructor !== $data.Object) { //just a single key
                var keyDef = entitySet.elementType.memberDefinitions.getKeyProperties()[0];
                var key = {};
                key[keyDef.name] = entity;
                entity = key;
            }

            //key object
            if (!(entity instanceof $data.Entity)) {
                entity = new entitySet.elementType(entity);
            }

            return this.storageProvider.getFieldUrl(entity, fieldName, entitySet);
        } catch (e) {}
        return '#';
    }
}, {
    inheritedTypeProcessor: function(type) {
        if (type.resolveForwardDeclarations) {
            type.resolveForwardDeclarations();
        }
    },
    generateServiceOperation: function (cfg) {

        var fn;
        if (cfg.serviceMethod) {
            var returnType = cfg.returnType ? Container.resolveType(cfg.returnType) : {};
            if (returnType.isAssignableTo && returnType.isAssignableTo($data.Queryable)) {
                fn = cfg.serviceMethod;
            } else {
                fn = function () {
                    var lastParam = arguments[arguments.length - 1];

                    var pHandler = new $data.PromiseHandler();
                    var cbWrapper;

                    var args = arguments;
                    if (typeof lastParam === 'function') {
                        cbWrapper = pHandler.createCallback(lastParam);
                        arguments[arguments.length - 1] = cbWrapper;
                    } else {
                        cbWrapper = pHandler.createCallback();
                        arguments.push(cbWrapper);
                    }

                    try {
                        var result = cfg.serviceMethod.apply(this, arguments);
                        if (result !== undefined)
                            cbWrapper.success(result);
                    } catch (e) {
                        cbWrapper.error(e);
                    }

                    return pHandler.getPromise();
                }
            }

        } else {
            fn = function () {
                var context = this;

                var boundItem;
                if (this instanceof $data.Entity) {
                    if (!cfg.method) {
                        cfg.method = 'POST';
                    }

                    if (this.context) {
                        context = this.context;
                    } else {
                        Guard.raise('entity not attached into context');
                        return;
                    }

                    boundItem = {
                        data: this,
                        entitySet: context.getEntitySetFromElementType(this.getType())
                    };
                }

                var virtualEntitySet = cfg.elementType ? context.getEntitySetFromElementType(Container.resolveType(cfg.elementType)) : null;

                var paramConstExpression = null;
                if (cfg.params) {
                    paramConstExpression = [];
                    for (var i = 0; i < cfg.params.length; i++) {
                        //TODO: check params type
                        for (var name in cfg.params[i]) {
                            paramConstExpression.push(Container.createConstantExpression(arguments[i], Container.resolveType(cfg.params[i][name]), name));
                        }
                    }
                }

                var ec = Container.createEntityContextExpression(context);
                var memberdef = (boundItem ? boundItem.data : context).getType().getMemberDefinition(cfg.serviceName);
                var es = Container.createServiceOperationExpression(ec,
                        Container.createMemberInfoExpression(memberdef),
                        paramConstExpression,
                        cfg,
                        boundItem);

                //Get callback function
                var clb = arguments[arguments.length - 1];
                if (typeof clb !== 'function') {
                    clb = undefined;
                }

                if (virtualEntitySet) {
                    var q = Container.createQueryable(virtualEntitySet, es);
                    if (clb) {
                        es.isTerminated = true;
                        return q._runQuery(clb);
                    }
                    return q;
                }
                else {
                    var returnType = cfg.returnType ? Container.resolveType(cfg.returnType) : null;

                    var q = Container.createQueryable(context, es);
                    q.defaultType = returnType || $data.Object;

                    if (returnType === $data.Queryable) {
                        q.defaultType = Container.resolveType(cfg.elementType);
                        if (clb) {
                            es.isTerminated = true;
                            return q._runQuery(clb);
                        }
                        return q;
                    }
                    es.isTerminated = true;
                    return q._runQuery(clb);
                }
            };
        };

        var params = [];
        if (cfg.params) {
            for (var i = 0; i < cfg.params.length; i++) {
                var param = cfg.params[i];
                for (var name in param) {
                    params.push({
                        name: name,
                        type: param[name]
                    });
                }
            }
        }
        $data.typeSystem.extend(fn, cfg, { params: params });

        return fn;
    },
    _convertLogicalTypeNameToPhysical: function (name) {
        return name + '_$db$';
    },
    _storageModelCache: {
        get: function () {
            if (!this.__storageModelCache)
                this.__storageModelCache = {};
            return this.__storageModelCache;
        },
        set: function () {
            //todo exception
        }
    }
});
$data.Class.define('$data.QueryProvider', null, null,
{
    //TODO: instance member?????
    constructor: function () { this.requiresExpressions= false },
    executeQuery: function (queryable, resultHandler) {
    },
    getTraceString: function (queryable) {
    }
}, null);$data.Class.define('$data.ModelBinder', null, null, {

    constructor: function (context) {
        this.context = context;
        this.providerName = null;
        if (this.context.storageProvider && typeof this.context.storageProvider.getType === 'function') {
            this.references = !(this.context.storageProvider.providerConfiguration.modelBinderOptimization || false);
            for (var i in $data.RegisteredStorageProviders) {
                if ($data.RegisteredStorageProviders[i] === this.context.storageProvider.getType()) {
                    this.providerName = i;
                }
            }
        }
    },

    _deepExtend: function (o, r) {
        if (o === null || o === undefined) {
            return r;
        }
        for (var i in r) {
            if (o.hasOwnProperty(i)) {
                if (typeof r[i] === 'object') {
                    if (Array.isArray(r[i])) {
                        for (var j = 0; j < r[i].length; j++) {
                            if (o[i].indexOf(r[i][j]) < 0) {
                                o[i].push(r[i][j]);
                            }
                        }
                    } else this._deepExtend(o[i], r[i]);
                }
            } else {
                o[i] = r[i];
            }
        }
        return this._finalize(o);
    },

    _finalize: function(o){
        if (o instanceof $data.Entity) {
            o.changedProperties = undefined;
            o.storeToken = this.context.storeToken;
        }
        return o;
    },

    _buildSelector: function (meta, context) {
        if (meta.$selector) {
            if (!(Array.isArray(meta.$selector))) {
                meta.$selector = [meta.$selector];
            }

            for (var i = 0; i < meta.$selector.length; i++) {
                var selector = meta.$selector[i].replace('json:', '');
                context.src += 'if(';
                var path = selector.split('.');
                for (var j = 0; j < path.length; j++) {
                    context.src += 'di.' + path.slice(0, j + 1).join('.') + (j < path.length - 1 ? ' && ' : ' !== undefined && typeof di.' + selector + ' === "object"');
                }
                context.src += '){di = di.' + selector + ';}' + (i < meta.$selector.length - 1 ? 'else ' : '');
            }

            context.src += 'if (di === null){';
            if (context.iter) context.src += context.iter + ' = null;';
            context.src += 'return null;';
            context.src += '}';
        }
    },

    _buildKey: function (name, type, keys, context, data) {
        if (keys) {
            var type = Container.resolveType(type);
            var typeIndex = Container.getIndex(type);
            type = type.fullName || type.name;
            context.src += 'var ' + name + 'Fn = function(di){';
            if (!(Array.isArray(keys)) || keys.length == 1) {
                if (typeof keys !== 'string') keys = keys[0];
                context.src += 'if (typeof di.' + keys + ' === "undefined") return undefined;';
                context.src += 'if (di.' + keys + ' === null) return null;';
                context.src += 'var key = ("' + type + '_' + typeIndex + '_' + keys + '#" + di.' + keys + ');';
            } else {
                context.src += 'var key = "";';
                for (var i = 0; i < keys.length; i++) {
                    var id = typeof keys[i] !== 'object' ? keys[i] : keys[i].$source;
                    context.src += 'if (typeof di.' + id + ' === "undefined") return undefined;';
                    context.src += 'if (di.' + id + ' === null) return null;';
                    context.src += 'key += ("' + type + '_' + typeIndex + '_' + id + '#" + di.' + id + ');';
                }
            }

            context.src += 'return key;};';
        }

        context.src += 'var ' + name + ' = ' + (keys ? name + 'Fn(' + (data || 'di') + ')' : 'undefined') + ';';
    },

    build: function (meta, context) {
        if (meta.$selector) {
            if (!(Array.isArray(meta.$selector))) meta.$selector = [meta.$selector];
            for (var i = 0; i < meta.$selector.length; i++) {
                meta.$selector[i] = meta.$selector[i].replace('json:', '');
            }
        }

        if (meta.$value) {
            if (typeof meta.$value === 'function') {
                context.src += 'var di = di || data;';
                context.src += 'var fn = function(){ return meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + '.$value.call(self, meta' + (context.meta.length ? '.' + context.meta.join('.') : '') + ', di); };';
                if (meta.$type) {
                    var type = Container.resolveName(Container.resolveType(meta.$type));
                    var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
                    var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                    if (converter) {
                        context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](fn())';
                    } else {
                        context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(fn())';
                    }
                } else context.item = 'fn()';
            } else if (meta.$type) {
                var type = Container.resolveName(Container.resolveType(meta.$type));
                var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.item = 'self.context.storageProvider.fieldConverter.fromDb["' + type + '"](' + meta.$value + ')';
                } else {
                    context.item = 'new (Container.resolveByIndex(' + typeIndex + '))(' + meta.$value + ')';
                }
            } else context.item = meta.$value;
        } else if (meta.$source) {
            var type = Container.resolveName(Container.resolveType(meta.$type));
            var typeIndex = Container.getIndex(Container.resolveType(meta.$type));
            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (!context.forEach) context.src += 'var di = data;';
            context.item = item;
            this._buildSelector(meta, context);
            if (converter) {
                context.src += 'var ' + item + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta.$source + ');';
            } else {
                context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta.$source + ');';
            }
        } else if (meta.$item) {
            context.meta.push('$item');
            var iter = (context.item && context.current ? context.item + '.' + context.current : (context.item ? context.item : 'result'));
            context.iter = iter;
            if (iter.indexOf('.') < 0) context.src += 'var ' + iter + ';';
            context.src += 'var fn = function(di){';
            if (meta.$selector) {
                context.src += 'if (typeof di !== "undefined" && !(Array.isArray(di))){';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            if (this.references && meta.$keys) this._buildKey('forKey', meta.$type, meta.$keys, context);
            //else if (this.references && meta.$item && meta.$item.$keys) this._buildKey('forKey', meta.$type, meta.$item.$keys, context);
            //else context.src += 'var forKey = typeof itemKey !== "undefined" ? itemKey : undefined;';
            /*context.src += 'if (typeof forKey !== "undefined" && forKey){';
            context.src += 'if (cache[forKey]){';
            context.src += iter + ' = cache[forKey];'; 
            context.src += '}else{';
            context.src += iter + ' = [];';
            context.src += 'cache[forKey] = ' + iter + ';';
            context.src += '}';
            context.src += '}else{';
            context.src += iter + ' = [];';
            context.src += '}';*/
            context.src += iter + ' = typeof ' + iter + ' == "undefined" ? [] : ' + iter + ';';
            //context.src += iter + ' = [];';
            if (this.references && meta.$item.$keys) {
                var keycacheName = 'keycache_' + iter.replace(/\./gi, '_');
                context.src += 'var ' + keycacheName + ';';
                context.src += 'var kci = keycacheIter.indexOf(' + iter + ');';
                context.src += 'if (kci < 0){';
                context.src += keycacheName + ' = [];';
                context.src += 'keycache.push(' + keycacheName + ');';
                context.src += 'keycacheIter.push(' + iter + ');';
                context.src += '}else{';
                context.src += keycacheName + ' = keycache[kci];';
                context.src += '}';
                //context.src += 'var ' + keycacheName + ' = ' + (meta.$item.$keys ? '[]' : 'null') + ';';
            }
            context.iter = undefined;
            context.forEach = true;
            var itemForKey = 'itemForKey_' + iter.replace(/\./gi, '_');
            context.src += 'var forEachFn = function(di, i){';
            context.src += 'var diBackup = di;';
            if (this.providerName == "sqLite" && this.references && meta.$item.$keys) this._buildKey(itemForKey, meta.$type, meta.$item.$keys, context);
            var item = context.item || 'iter';
            context.item = item;
            if (!meta.$item.$source) {
                this._buildSelector(meta.$item, context);
            }
            this.build(meta.$item, context);
            if (this.references && meta.$keys) {
                context.src += 'if (forKey){';
                context.src += 'if (cache[forKey]){';
                context.src += iter + ' = cache[forKey];';
                context.src += 'if (' + iter + '.indexOf(' + (context.item || item) + ') < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                context.src += 'cache[forKey] = ' + iter + ';';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}}else{';
                if (this.references && meta.$item.$keys) this._buildKey('cacheKey', meta.$type, meta.$item.$keys, context, 'diBackup');
                context.src += 'if (typeof cacheKey != "undefined" && cacheKey !== null){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + ' && cacheKey){';
                context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(cacheKey) < 0){';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(cacheKey);';
                context.src += '}';
                context.src += '}else{';
                context.src += iter + '.push(' + (context.item || item) + ');';
                context.src += '}';
                context.src += '}';
                context.src += '}';
            } else {
                if (this.references && meta.$item.$keys) {
                    context.src += 'if (typeof ' + itemForKey + ' !== "undefined" && ' + itemForKey + ' !== null){';
                    context.src += 'if (typeof keycache_' + iter.replace(/\./gi, '_') + ' !== "undefined" && ' + itemForKey + '){';
                    context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(' + itemForKey + ') < 0){';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(' + itemForKey + ');'
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}';
                    /*context.src += 'if (typeof itemKey !== "undefined" && itemKey !== null){';
                    context.src += 'if (typeof keycache_' + iter.replace(/\./gi, '_') + ' !== "undefined" && itemKey){';
                    context.src += 'if (keycache_' + iter.replace(/\./gi, '_') + '.indexOf(itemKey) < 0){';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += 'keycache_' + iter.replace(/\./gi, '_') + '.push(itemKey);'
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}}else{';
                    context.src += iter + '.push(' + (context.item || item) + ');';
                    context.src += '}';*/
                } else {
                    context.src += iter + '.push(' + (context.item || item) + ');';
                }
            }
            context.src += '};';
            context.src += 'if (Array.isArray(di)) di.forEach(forEachFn);';
            context.src += 'else forEachFn(di, 0);';
            context.forEach = false;
            context.item = null;
            context.src += '};fn(typeof di === "undefined" ? data : di);'
            context.meta.pop();
        } else if (meta.$type) {
            if (!context.forEach) {
                context.src += 'if (typeof di === "undefined"){';
                context.src += 'var di = data;';
                this._buildSelector(meta, context);
                context.src += '}';
            }
            var resolvedType = Container.resolveType(meta.$type);
            var type = Container.resolveName(resolvedType);
            var typeIndex = Container.getIndex(resolvedType);
            var isEntityType = resolvedType.isAssignableTo && resolvedType.isAssignableTo($data.Entity);
            var item = '_' + type.replace(/\./gi, '_') + '_';
            if (context.item == item) item += 'new_';
            context.item = item;


            var isPrimitive = false;
            if (!meta.$source && !meta.$value && resolvedType !== $data.Array && resolvedType !== $data.Object && !resolvedType.isAssignableTo)
                isPrimitive = true;
            if (resolvedType === $data.Object || resolvedType === $data.Array) {
                var keys = Object.keys(meta);
                if (keys.length == 1 || (keys.length == 2 && meta.$selector)) isPrimitive = true;
            }

            if (isPrimitive) {
                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                if (converter) {
                    context.src += 'var ' + item + ' = di != undefined ? self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di) : di;';
                } else {
                    context.src += 'var ' + item + ' = di;';
                }
            } else {
                if (this.references && meta.$keys) {
                    this._buildKey('itemKey', meta.$type, meta.$keys, context);
                    context.src += 'if (itemKey === null) return null;';
                    context.src += 'var ' + item + ';';
                    context.src += 'if (itemKey && cache[itemKey]){';
                    context.src += item + ' = cache[itemKey];';
                    context.src += '}else{';
                    if (isEntityType) {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                    context.src += 'if (itemKey){';
                    context.src += 'cache[itemKey] = ' + item + ';';
                    context.src += '}';
                    context.src += '}';
                } else {
                    if (isEntityType) {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))(undefined, { setDefaultValues: false });';
                    } else {
                        context.src += 'var ' + item + ' = new (Container.resolveByIndex(' + typeIndex + '))();';
                    }
                }
            }
            for (var i in meta) {
                if (i.indexOf('$') < 0) {
                    context.current = i;
                    if (!meta[i].$item) {
                        if (meta[i].$value) {
                            context.meta.push(i);
                            var item = context.item;
                            this.build(meta[i], context);
                            context.src += item + '.' + i + ' = ' + context.item + ';';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta[i].$source) {
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            if (meta[i].$type) {
                                var type = Container.resolveName(Container.resolveType(meta[i].$type));
                                var typeIndex = Container.getIndex(Container.resolveType(meta[i].$type));
                                var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                                if (converter) {
                                    context.src += 'return self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta[i].$source + ');';
                                } else {
                                    context.src += 'return new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta[i].$source + ');';
                                }
                            } else {
                                context.src += item + '.' + i + ' = di.' + meta[i].$source + ';';
                            }
                            context.src += '};';
                            if (meta[i].$type) context.src += item + '.' + i + ' = fn(di);';
                            else context.src += 'fn(di);';
                        } else if (meta[i].$type) {
                            context.meta.push(i);
                            context.src += 'var fn = function(di){';
                            this._buildSelector(meta[i], context);
                            this.build(meta[i], context);
                            context.src += 'return ' + context.item + ';};';
                            if (meta[i].$type === $data.Object) context.src += item + '.' + i + ' = self._deepExtend(' + item + '.' + i + ', fn(di));';
                            else context.src += item + '.' + i + ' = fn(di);';
                            context.item = item;
                            context.meta.pop();
                        } else if (meta.$type) {
                            var memDef = Container.resolveType(meta.$type).memberDefinitions.getMember(i);
                            var type = Container.resolveName(memDef.type);
                            var entityType = Container.resolveType(meta.$type);
                            var entityTypeIndex = Container.getIndex(meta.$type);
                            var converter = this.context.storageProvider.fieldConverter.fromDb[type];
                            if (this.providerName && memDef && memDef.converter && memDef.converter[this.providerName] && typeof memDef.converter[this.providerName].fromDb == 'function') {
                                context.src += item + '.' + i + ' = Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '").converter.' + this.providerName + '.fromDb(di.' + meta[i] + ', Container.resolveByIndex("' + entityTypeIndex + '").memberDefinitions.getMember("' + i + '"), self.context, Container.resolveByIndex("' + entityTypeIndex + '"));';
                            } else if (converter) {
                                context.src += item + '.' + i + ' = self.context.storageProvider.fieldConverter.fromDb["' + type + '"](di.' + meta[i] + ');';
                            } else {
                                //var type = Container.resolveName(Container.resolveType(type.memberDefinitions.getMember(i).type));
                                var typeIndex = Container.getIndex(Container.resolveType(type.memberDefinitions.getMember(i).type));
                                context.src += item + '.' + i + ' = new (Container.resolveByIndex(' + typeIndex + '))(di.' + meta[i] + ');';
                            }
                        }
                    } else {
                        context.meta.push(i);
                        this.build(meta[i], context);
                        context.item = item;
                        context.meta.pop();
                    }
                }
            }
            context.src += item + ' = self._finalize(' + item + ');';
        }
    },

    call: function (data, meta) {
        if (!Object.getOwnPropertyNames(meta).length) {
            return data;
        }
        var context = {
            src: '',
            meta: []
        };
        context.src += 'var self = this;';
        context.src += 'var result;';
        context.src += 'var cache = {};';
        context.src += 'var keycache = [];';
        context.src += 'var keycacheIter = [];';
        this.build(meta, context);
        if (context.item) context.src += 'if (typeof result === "undefined") result = ' + context.item + ';';
        context.src += 'return result;';
        
        /*var beautify = require('beautifyjs');
        console.log(beautify.js_beautify(context.src));*/
        
        var fn = new Function('meta', 'data', context.src).bind(this);
        var ret = fn(meta, data);
        return ret;
    }
});
$C('$data.queryBuilder', null, null, {
    constructor: function () {
        this._fragments = {};
        this.selectedFragment = null;
        this._binderConfig = {};
        this.modelBinderConfig = this._binderConfig;
        this._binderConfigPropertyStack = [];
    },
    selectTextPart: function (name) {
        if (!this._fragments[name]) {
            this._fragments[name] = { text: '', params: [] };
        }
        this.selectedFragment = this._fragments[name];
    },
    getTextPart: function (name) {
        return this._fragments[name];
    },
    addText: function (textParticle) {
        this.selectedFragment.text += textParticle;
    },
    addParameter: function (param) {
        this.selectedFragment.params.push(param);
    },
    selectModelBinderProperty: function (name) {
        this._binderConfigPropertyStack.push(this.modelBinderConfig);
        if (!(name in this.modelBinderConfig)) {
            this.modelBinderConfig[name] = {};
        }
        this.modelBinderConfig = this.modelBinderConfig[name];
    },
    popModelBinderProperty: function () {
        if (this._binderConfigPropertyStack.length === 0) {
            this.modelBinderConfig = this._binderConfig();
        } else {
            this.modelBinderConfig = this._binderConfigPropertyStack.pop();
        }
    },
    resetModelBinderProperty: function (name) {
        this._binderConfigPropertyStack = [];
        this.modelBinderConfig = this._binderConfig;
    },
    addKeyField: function (name) {
        if(!this.modelBinderConfig['$keys']){
            this.modelBinderConfig['$keys'] = new Array();
        }
        this.modelBinderConfig['$keys'].push(name);
    }
});
$C('$data.Query', null, null,
{
    constructor: function (expression, defaultType, context) {
        ///<param name="context" type="$data.EntityContext" />
        ///<field name="expression" type="$data.Expressions.ExpressionNode" />
        ///<field name="context" type="$data.EntityContext" />

        this.expression = expression;
        this.context = context;

        //TODO: expressions get as JSON string?!
        
        this.expressions = expression;
        this.defaultType = defaultType;
        this.result = [];
        this.rawDataList = [];
        this.modelBinderConfig = {};
        this.context = context;
    },
        
    rawDataList: { dataType: "Array" },
    result: { dataType: "Array" },
    resultType: {},
    buildResultSet: function (ctx) {
        var converter = new $data.ModelBinder(this.context);
        this.result = converter.call(this.rawDataList, this.modelBinderConfig);
        return;
    },
    getEntitySets: function(){
        var ret = [];
        var ctx = this.context;
        
        var fn = function(expression){
            if (expression instanceof $data.Expressions.EntitySetExpression){
                if (ret.indexOf(ctx._entitySetReferences[expression.elementType.name]) < 0)
                    ret.push(ctx._entitySetReferences[expression.elementType.name]);
            }
            if (expression.source) fn(expression.source);
        };
        
        fn(this.expression);
        
        return ret;
    }
}, null);
$data.Class.define('$data.Queryable', null, null,
{
    constructor: function (source, rootExpression) {
        ///	<signature>
        /// <summary>Provides a base class for classes supporting JavaScript Language Query.</summary>
        /// <description>Provides a base class for classes supporting JavaScript Language Query.</description>
        /// <param name="source" type="$data.EntitySet" />
        /// <param name="rootExpression" type="$data.Expressions.ExpressionNode"></param>
        ///	</signature>
        ///	<signature>
        /// <summary>Provides a base class for classes supporting JavaScript Language Query.</summary>
        /// <description>Provides a base class for classes supporting JavaScript Language Query.</description>
        /// <param name="source" type="$data.EntityContext" />
        /// <param name="rootExpression" type="$data.Expressions.ExpressionNode"></param>
        ///	</signature>

        var context = source instanceof $data.EntityContext ? source : source.entityContext;
        this.defaultType = source instanceof $data.EntityContext ? null : source.defaultType;
        this.entityContext = context;
        this.expression = rootExpression;
    },

    filter: function (predicate, thisArg) {
        ///<summary>Filters a set of entities using a boolean expression.</summary>
        ///<param name="predicate" type="Function">A boolean query expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Filters a set of entities using a boolean expression formulated as string.</summary>
        ///<param name="predicate" type="string">
        ///The expression body of the predicate function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: filter("it.Title == 'Hello'")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Filters a set of entities using a bool expression formulated as a JavaScript function.</summary>
        ///<param name="predicate" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Filtering a set of entities with a predicate function&#10;
        ///var males = Persons.filter( function( person ) { return person.Gender == 'Male' } );
        ///</example>
        ///<example>
        ///Filtering a set of entities with a predicate function and parameters&#10;
        ///var draftables = Persons.filter( function( person ) {
        ///     return person.Gender == this.gender &amp;&amp; person.Age &gt; this.age
        /// }, { gender: 'Male',  age: 21 });
        ///</example>
        ///<example>
        ///Filtering a set of entities with a predicate as a string and parameters&#10;
        ///var draftables = Persons.filter("it.Gender == this.gender &amp;&amp;  it.Age &gt; this.age",
        /// { gender: 'Male',  age: 21 });
        ///</example>
        ///</signature>
        if (arguments.length === 3) {
            predicate = "it." + arguments[0] + 
                (arguments[1][0] === "." ? (arguments[1] + "(param)") : (" " + arguments[1] + " param"));
            thisArg = { param : arguments[2] }
        }
        this._checkOperation('filter');
        var expression = Container.createCodeExpression(predicate, thisArg);
        var expressionSource = this.expression;
        if (this.expression instanceof $data.Expressions.FilterExpression) {
            expressionSource = this.expression.source;

            var operatorResolution = this.entityContext.storageProvider.resolveBinaryOperator("and");
            expression = Container.createSimpleBinaryExpression(this.expression.selector, expression, "and", "filter", "boolean", operatorResolution);
        }
        var exp = Container.createFilterExpression(expressionSource, expression);
        var q = Container.createQueryable(this, exp);
        return q;
    },
    where: function (predicate, params) {
        ///<summary>Where is a convenience alias for C# developers. Use filter instead.</summary>
		///<returns type="$data.Queryable" />
        return this.filter(predicate, params);
    },

    map: function (projection, thisArg, mappedTo) {
		///	<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///	<param name="projection" type="Function">A projection expression</param>
        ///	<param name="thisArg" type="Object">The query parameters</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///		<param name="projection" type="string">
        ///			The expression body of the projection function in string. &#10;
		///			To reference the lambda parameter use the 'it' context variable. &#10;
		///			Example: map("{ i: it.Id, t: it.Title }")
        ///		</param>
        ///		<param name="thisArg" type="Object" />
        ///		<returns type="$data.Queryable" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Map specifies the shape or type of each returned element. You can specify whether your results will consist of complete Person objects, just one member, a subset of members, or some completely different result type based on a computation or new object creation. When map produces something other than a copy of the source element, the operation is called a projection. The use of projections to transform data is a powerful capability of JavaScript Language Query expressions.</summary>
        ///		<param name="projection" type="Function">
        ///			Projection function to specify the shape or type of each returned element.
        ///		</param>
        ///		<param name="thisArg" type="Object" optional="true">
        ///			Contains the projection parameters.
        ///		</param>
        ///		<returns type="$data.Queryable" />
        ///		<example>
		///			Projection to get an array of the full name property of a set of Person entities&#10;
        ///			var personFullNames = Persons.map( function( person ) { return person.FullName; } );
        ///		</example>
        ///		<example>
		///			Projection to get an array of the required fields of Person entities in an anonymous type.&#10;
        ///			var custom = Persons.map( function( person ) {
        ///				return { FullName: person.FullName, Info: { Address: person.Location.Address, Phone: person.Phone } };
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('map');
        var codeExpression = Container.createCodeExpression(projection, thisArg);
        var exp = Container.createProjectionExpression(this.expression, codeExpression);

        if (mappedTo === 'default')
            exp.projectionAs = this.defaultType;
        else if (mappedTo)
            exp.projectionAs = Container.resolveType(mappedTo);
        else
            exp.projectionAs = $data.Object;

        var q = Container.createQueryable(this, exp);
        return q;
    },
    select: function (projection, thisArg, mappedTo) {
		///<summary>Select is a convenience alias for C# developers. Use map instead.</summary>
		///<returns type="$data.Queryable" />
        return this.map(projection, thisArg, mappedTo);
    },

    length: function (onResult, transaction) {
		///	<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///	<param name="onResult" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Returns the number of entities (or projected object) in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
		///			Example: { success: function(cnt) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
		///			Get the count of Person entities. &#10;
        ///			Persons.length( function( cnt ) { alert("There are " + cnt + " person(s) in the database."); } );
        ///		</example>
        ///	</signature>

        this._checkOperation('length');
        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var countExpression = Container.createCountExpression(this.expression);
        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(countExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }
		
        return pHandler.getPromise();
    },
	count: function (onResult, transaction) {
		///<summary>Count is a convenience alias for C# developers. Use length instead.</summary>
		///<returns type="$data.Integer" />
	    return this.length(onResult, transaction);
    },

	forEach: function (iterator, transaction) {
		///	<summary>Calls the iterator function for all entity (or projected object) in the query.</summary>
        ///	<param name="iterator" type="Function">Iterator function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Calls the iterator function for all entity (or projected object) in the query.</summary>
        ///		<param name="iterator" type="Function">
        ///			Iterator function to handle the result elements.
        ///		</param>
        ///		<returns type="$data.Promise" />
		///		<example>
		///			Log the full name of each Person. &#10;
        ///			Persons.forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('forEach');
        var pHandler = new $data.PromiseHandler();
        function iteratorFunc(items) { items.forEach(iterator); }
        var cbWrapper = pHandler.createCallback(iteratorFunc);

        var forEachExpression = Container.createForEachExpression(this.expression);
        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(forEachExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

	toArray: function (onResult_items, transaction) {
		///	<summary>Returns the query result as the callback parameter.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Returns the query result as the callback parameter.</summary>
        ///		<param name="onResult_items" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Returns the query result as the callback parameter.</summary>
        ///		<param name="onResult_items" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
		///			Example: { success: function(result) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
		///			Get all Person entities. &#10;
        ///			Persons.toArray( function( result ) { console.dir(result); } );
        ///		</example>
        ///	</signature>

        if (onResult_items instanceof $data.Array)
        {
            return this.toArray(function (results) {
                onResult_items.length = 0;
                results.forEach(function (item, idx) {
                    onResult_items.push(item);
                });
            });
        }

        this._checkOperation('toArray');
        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult_items);

        var toArrayExpression = Container.createToArrayExpression(this.expression);
        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(toArrayExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

	single: function (filterPredicate, thisArg, onResult, transaction) {
		///	<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
		///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
		///		<param name="filterPredicate" type="string">
		///			Same as in filter.
		///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
		///		<param name="filterPredicate" type="Function">
		///			Same as in filter.
		///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
		///			Get "George" from the Person entity set. &#10;
        ///			Persons.single( function( person ) { return person.FirstName == this.name; }, { name: "George" }, {&#10;
		///				success: function ( result ){ ... },&#10;
		///				error: function () { ... }
		///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('single');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(2);

        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var singleExpression = Container.createSingleExpression(q.expression);
        var preparator = Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(singleExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

	some: function (filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///	<param name="filterPredicate" type="Function">Filter function</param>
        ///	<param name="thisArg" type="Function">The query parameters for filter function</param>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns true if the query has any result element.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///         Is there any person who's first name is "George"? &#10;
        ///			Persons.some( function( person ) { return person.FirstName == this.name; }, { name: "George" }, {&#10;
        ///				success: function ( result ){ ... },&#10;
        ///				error: function () { ... }
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('some');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var someExpression = Container.createSomeExpression(q.expression);
        var preparator = Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(someExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

	every: function (filterPredicate, thisArg, onResult, transaction) {
        ///	<summary>Filters a set of entities using a boolean expression and returns true if all elements of the EntitySet is in the result set.</summary>
        ///	<param name="filterPredicate" type="Function">Filter function</param>
        ///	<param name="thisArg" type="Function">The query parameters for filter function</param>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a </summary>
        ///		<param name="filterPredicate" type="string">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns a single element or throws an error if more than one element is filtered.</summary>
        ///		<param name="filterPredicate" type="Function">
        ///			Same as in filter.
        ///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Result is true when all person are married. &#10;
        ///			Persons.every( function( person ) { return person.Married == true; }, null, {&#10;
        ///				success: function ( result ){ ... },&#10;
        ///				error: function () { ... }
        ///			});
        ///		</example>
        ///	</signature>

        this._checkOperation('every');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var everyExpression = Container.createEveryExpression(q.expression);
        var preparator = Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(everyExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },


    take: function (amount) {
		///	<summary>Returns only a specified number of elements from the start of the result set.</summary>
        ///	<param name="amount" type="$data.Integer">The number of elements to return.</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Returns only a specified number of elements from the start of the result set.</summary>
        ///		<param name="amount" type="$data.Integer">
        ///			The number of elements to skip.
        ///		</param>
        ///		<returns type="$data.Queryable" />
		///		<example>
		///			Log the full name of each Person. &#10;
        ///			Persons.take(10).forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('take');
        var constExp = Container.createConstantExpression(amount, "number");
        var takeExp = Container.createPagingExpression(this.expression, constExp, $data.Expressions.ExpressionType.Take);
        return Container.createQueryable(this, takeExp);
    },
    skip: function (amount) {
		///	<summary>Skip a specified number of elements from the start of the result set.</summary>
        ///	<param name="amount" type="$data.Integer">The number of elements to skip.</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Skip a specified number of elements from the start of the result set.</summary>
        ///		<param name="amount" type="$data.Integer">
        ///			The number of elements to skip.
        ///		</param>
        ///		<returns type="$data.Queryable" />
		///		<example>
		///			Log the full name of each Person. &#10;
        ///			Persons.skip(1).take(5).forEach( function( person ) { console.log(person.FullName; } );
        ///		</example>
        ///	</signature>

        this._checkOperation('skip');
        var constExp = Container.createConstantExpression(amount, "number");
        var takeExp = Container.createPagingExpression(this.expression, constExp, $data.Expressions.ExpressionType.Skip);
        return Container.createQueryable(this, takeExp);
    },

    order: function(selector) {
       if (selector === '' || selector === undefined || selector === null) {
           return this;
       }
       if(selector[0] === "-") {
           var orderString = "it." + selector.replace("-","");
           return this.orderByDescending(orderString);
       } else {
           return this.orderBy("it." + selector);
       }

    },

    orderBy: function (selector, thisArg) {
		///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="Function">An order expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="string">
        ///The expression body of the order function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: orderBy("it.Id")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Order a set of entities using an expression.</summary>
        ///<param name="selector" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Ordering a set of entities with a predicate function&#10;
        ///var males = Persons.orderBy( function( person ) { return person.Id; } );
        ///</example>
        ///</signature>

        this._checkOperation('orderBy');
        var codeExpression = Container.createCodeExpression(selector, thisArg);
        var exp = Container.createOrderExpression(this.expression, codeExpression, $data.Expressions.ExpressionType.OrderBy);
        var q = Container.createQueryable(this, exp);
        return q;
    },
    orderByDescending: function (selector, thisArg) {
		///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="Function">An order expression</param>
        ///<param name="thisArg" type="Object">The query parameters</param>
        ///<returns type="$data.Queryable" />
        ///<signature>
        ///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="string">
        ///The expression body of the order function in string. &#10;
        ///To reference the lambda parameter use the 'it' context variable. &#10;
        ///Example: orderBy("it.Id")
        ///</param>
        ///<param name="thisArg" type="Object" />
        ///<returns type="$data.Queryable" />
        ///</signature>
        ///<signature>
        ///<summary>Order a set of entities descending using an expression.</summary>
        ///<param name="selector" type="Function">
        ///</param>
        ///<param name="thisArg" type="Object" optional="true">
        ///Contains the predicate parameters
        ///</param>
        ///<returns type="$data.Queryable" />
        ///<example>
        ///Ordering a set of entities with a predicate function&#10;
        ///var males = Persons.orderByDescending( function( person ) { return person.Id; } );
        ///</example>
        ///</signature>

        this._checkOperation('orderByDescending');
        var codeExpression = Container.createCodeExpression(selector, thisArg);
        var exp = Container.createOrderExpression(this.expression, codeExpression, $data.Expressions.ExpressionType.OrderByDescending);
        var q = Container.createQueryable(this, exp);
        return q;
    },

    first: function (filterPredicate, thisArg, onResult, transaction) {
		///	<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
        ///	<param name="onResult_items" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
		///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
		///		<param name="filterPredicate" type="string">
		///			Same as in filter.
		///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Filters a set of entities using a boolean expression and returns the first element.</summary>
		///		<param name="filterPredicate" type="Function">
		///			Same as in filter.
		///		</param>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result, same as in toArray.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
		///			Get "George" from the Person entity set. &#10;
        ///			Persons.first( function( person ) { return person.FirstName == this.name; }, { name: "George" }, function ( result ){ ... });
        ///		</example>
        ///	</signature>

        this._checkOperation('first');
        var q = this;
        if (filterPredicate) {
            q = this.filter(filterPredicate, thisArg);
        }
        q = q.take(1);

        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var firstExpression = Container.createFirstExpression(q.expression);
        var preparator = Container.createQueryExpressionCreator(q.entityContext);
        try {
            var expression = preparator.Visit(firstExpression);
            q.entityContext.log({ event: "EntityExpression", data: expression });

            q.entityContext.executeQuery(Container.createQueryable(q, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    find: function (keyValue, onResult, transaction) {

        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var keys = this.defaultType.memberDefinitions.getKeyProperties();

        try {

            if (keys.length === 1 && typeof keyValue !== 'object') {
                var keyV = {};
                keyV[keys[0].name] = keyValue;
                keyValue = keyV;
            }

            if (typeof keyValue !== 'object') {
                throw new Exception('Key parameter is invalid');
            } else {


                var parameters = [];
                for (var i = 0; i < keys.length; i++) {
                    var keyProp = keys[i];
                    if (!(keyProp.name in keyValue)) {
                        throw new Exception('Key value missing');
                    }
                    parameters.push(Container.createConstantExpression(keyValue[keyProp.name], keyProp.type, keyProp.name));
                }

                var operation = this.entityContext.storageProvider.supportedSetOperations['find'];
                if (operation) {

                    var findExpression = Container.createFindExpression(this.expression, parameters);
                    var preparator = Container.createQueryExpressionCreator(this.entityContext);
                    try {
                        var expression = preparator.Visit(findExpression);
                        this.entityContext.log({ event: "EntityExpression", data: expression });

                        this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
                    } catch (e) {
                        cbWrapper.error(e);
                    }

                } else {
                    var predicate = '';
                    var params = {}
                    for (var i = 0; i < parameters.length; i++) {
                        var param = parameters[i];
                        params[param.name] = param.value;
                        if (i > 0) predicate += ' && ';
                        predicate += "it." + param.name + " == this." + param.name;
                    }

                    this.single(predicate, params, cbWrapper, transaction);
                }
            }
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    include: function (selector) {
		///	<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///	<param name="selector" type="$data.String">Entity set name</param>
        ///	<returns type="$data.Queryable" />
        ///	<signature>
        ///		<summary>Includes the given entity set in the query if it's an inverse property.</summary>
        ///		<param name="selector" type="$data.String">
        ///			The name of the entity set you want to include in the query.
        ///		</param>
        ///		<returns type="$data.Queryable" />
		///		<example>
		///			Include the Category on every Article. &#10;
        ///			Articles.include("Category");
        ///		</example>
        ///	</signature>

        this._checkOperation('include');
        var constExp = Container.createConstantExpression(selector, "string");
        var takeExp = Container.createIncludeExpression(this.expression, constExp);
        return Container.createQueryable(this, takeExp);
    },

    withInlineCount: function (selector) {
        this._checkOperation('withInlineCount');
        var constExp = Container.createConstantExpression(selector || 'allpages', "string");
        var inlineCountExp = Container.createInlineCountExpression(this.expression, constExp);
        return Container.createQueryable(this, inlineCountExp);
    },

    removeAll: function (onResult, transaction) {
        ///	<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///	<param name="onResult" type="Function">A callback function</param>
        ///	<returns type="$data.Promise" />
        ///	<signature>
        ///		<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Function">
        ///			The callback function to handle the result.
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///	</signature>
        ///	<signature>
        ///		<summary>Delete the query result and returns the number of deleted entities in a query as the callback parameter.</summary>
        ///		<param name="onResult" type="Object">
        ///			Object of callback functions to handle success and error. &#10;
        ///			Example: { success: function(result) { ... }, error: function() { alert("Something went wrong..."); } }
        ///		</param>
        ///		<returns type="$data.Promise" />
        ///		<example>
        ///			Delete all People who are younger than 18 years old. &#10;
        ///			Persons.filter( function( p ){ return p.Age &#60; 18; } ).removeAll( function( result ) { console.dir(result); } );
        ///		</example>
        ///	</signature>

        this._checkOperation('batchDelete');
        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult);

        var batchDeleteExpression = Container.createBatchDeleteExpression(this.expression);
        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(batchDeleteExpression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },


    _runQuery: function (onResult_items, transaction) {
        var pHandler = new $data.PromiseHandler();
        var cbWrapper = pHandler.createCallback(onResult_items);

        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        try {
            var expression = preparator.Visit(this.expression);
            this.entityContext.log({ event: "EntityExpression", data: expression });

            this.entityContext.executeQuery(Container.createQueryable(this, expression), cbWrapper, transaction);
        } catch (e) {
            cbWrapper.error(e);
        }

        return pHandler.getPromise();
    },

    toTraceString: function (name) {
		///	<summary>Returns the trace string of the query.</summary>
        ///	<param name="name" type="$data.String">Name of the execution method (toArray, length, etc.).</param>
        ///	<returns type="$data.String" />
        ///	<signature>
        ///		<summary>Returns the trace string of the query.</summary>
        ///		<param name="name" type="$data.String">
        ///			Name of the execution method (toArray, length, etc.). Optional. Default value is "toArray".
        ///		</param>
        ///		<returns type="$data.String" />
		///		<example>
		///			Get the trace string for Articles.toArray() &#10;
        ///			Articles.toTraceString();
        ///		</example>
        ///	</signature>

        var expression = this.expression;

        if (name) {
            expression = Container['create' + name + 'Expression'](expression);
        } else {
            expression = Container.createToArrayExpression(expression);
        }

        var preparator = Container.createQueryExpressionCreator(this.entityContext);
        expression = preparator.Visit(expression);

        //this.expression = expression;
        var q = Container.createQueryable(this, expression)
        return q.entityContext.getTraceString(q);
    },

    _checkOperation: function (name) {
        var operation = this.entityContext.resolveSetOperations(name);
        if (operation.invokable != undefined && !operation.invokable)
            Guard.raise(new Exception("Operation '" + name + "' is not invokable with the provider"));
    },
    defaultType: {}

}, null);
///EntitySet is responsible for
/// -creating and holding entityType through schema
/// - provide Add method
/// - provide Delete method
/// - provide Update method
/// - provide queryProvider for queryable

$data.EntitySchemaConfig = function EntitySchemaConfig() {
    this.Name = "";
};
$data.entitySetState = { created: 0, defined: 1, active: 2 };

$data.Class.defineEx('$data.EntitySet',
    [
        { type: $data.Queryable, params: [new ConstructorParameter(1)] }
    ], null,
{
    constructor: function (elementType, context, collectionName, eventHandlers, roles) {
        /// <signature>
        ///     <summary>Represents a typed entity set that is used to perform create, read, update, and delete operations</summary>
        ///     <param name="elementType" type="Function" subClassOf="$data.Entity">Type of entity set elements, elementType must be subclass of $data.Entity</param>
        ///     <param name="context" type="$data.EntityContext">Context of the EntitySet</param>
        ///     <param name="collectionName" type="String">Name of the EntitySet</param>
        /// </signature>
        this.createNew = this[elementType.name] = this.elementType = this.defaultType = elementType;
        var self = this;
        context['createAdd' + elementType.name] = function (initData) {
            var entity  = new elementType(initData);
            return self.add(entity);
        }
        this.stateManager = new $data.EntityStateManager(this);

        this.collectionName = collectionName;
        this.roles = roles;
        
        for (var i in eventHandlers){
            this[i] = eventHandlers[i];
        }
    },

    addNew: function(item, cb) {
        var callback = $data.typeSystem.createCallbackSetting(cb);
        var _item = new this.createNew(item);
        this.entityContext.saveChanges(cb);
        return _item;
    },

    executeQuery: function (expression, on_ready) {
        //var compiledQuery = this.entityContext
        var callBack = $data.typeSystem.createCallbackSetting(on_ready);
        this.entityContext.executeQuery(expression, callBack);
    },
    getTraceString: function (expression) {
        return this.entityContext.getTraceString(expression);
    },
    setContext: function (entityContext) {
        this.entitySetState = $data.entitySetState.active;
        this.entityContext = entityContext;
        this.entityContext[this.schema.name] = this[this.schema.name];
    },
    _trackEntity: function (entity) {
        var trackedEntities = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEntities.length; i++) {
            if (trackedEntities[i].data === entity)
                return;
        }
        trackedEntities.push({ entitySet: this, data: entity });
    },
    add: function (entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the context.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         
        ///         Persons.add({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' });
        ///         
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Adds the given entity to the context.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to add</param>
        ///     <example>
        ///
        ///         Persons.add(new $news.Types.Person({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' }));
        ///
        ///     </example>
        ///     <example>
        ///
        ///         var person = new $news.Types.Person({ Name: 'John', Email: 'john@example.com', Age: 30, Gender: 'Male' });
        ///         Persons.add(person);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof $data.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }
        data.entityState = $data.EntityState.Added;
        data.changedProperties = undefined;
        data.context = this.entityContext;
        this._trackEntity(data);
        return data;
    },

    addMany: function(entities) {
        var result = [];
        var self = this;
        entities.forEach(function (entity) {
            result.push(self.add(entity));
        });
        return result;
    },
    remove: function (entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and marks it as Deleted.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         Person will be marked as Deleted where an id is 5. Id is a key of entity.
        ///         Persons.remove({ Id: 5 });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Marks the given entity as Deleted.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to remove</param>
        ///     <example>
        ///         
        ///         Persons.remove(person);
        ///
        ///     </example>
        ///     <example>
        ///         Person will be marked as Deleted where an Id is 5. Id is a key of entity.
        ///         Persons.add(new $news.Types.Person({ Id: 5 }));
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof $data.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }
        data.entityState = $data.EntityState.Deleted;
        data.changedProperties = undefined;
        this._trackEntity(data);
    },
    attach: function (entity, keepChanges) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the Context with Unchanged state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         
        ///         Persons.attach({ Id: 5, Email: 'newEmail@example.com' });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Adds to the context and sets state Unchanged.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to attach</param>
        ///     <example>
        ///
        ///         Persons.attach(person);
        ///
        ///     </example>
        ///     <example>
        ///         Set an entity's related entities without loading 
        ///
        ///         var categoryPromo = new $news.Types.Category({ Id: 5 });
        ///         Category.attach(categoryPromo);
        ///         var article = new $news.Types.Article({ Title: 'New Article title', Body: 'Article body', Category: [ categoryPromo ] });
        ///         Article.attach(article);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof $data.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }
        
        for (var i = 0; i < this.entityContext.stateManager.trackedEntities.length; i++) {
            var current = this.entityContext.stateManager.trackedEntities[i];
            if (current.data === data)
                break;
            if (current.data.equals(data)) {
                Guard.raise(new Exception("Context already contains this entity!!!"));
            }
        }
        if (!keepChanges) {
            data.entityState = $data.EntityState.Unchanged;
            data.changedProperties = undefined;
        }
        data.context = this.entityContext;
        this._trackEntity(data);
    },
    detach: function (entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and detach from the Context with Detached state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <example>
        ///         Person will be Detached where an id is 5. Id is a key of entity.
        ///         Persons.detach({ Id: 5 });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>Detach from the context and sets state Detached.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to detach</param>
        ///     <example>
        ///
        ///         Persons.detach(person);
        ///
        ///     </example>
        ///     <example>
        ///         Person will be Detached where an Id is 5. Id is a key of entity.
        ///         Persons.add(new $news.Types.Person({ Id: 5 }));
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof $data.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }

        var existsItem;
        var trackedEnt = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEnt.length; i++) {
            if (trackedEnt[i].data.equals(data))
                existsItem = trackedEnt[i];
        }

        //var existsItem = this.entityContext.stateManager.trackedEntities.filter(function (i) { return i.data.equals(data); }).pop();
        if (existsItem) {
            var idx = this.entityContext.stateManager.trackedEntities.indexOf(existsItem);
            entity.entityState = $data.EntityState.Detached;
            this.entityContext.stateManager.trackedEntities.splice(idx, 1);
            return;
        }
    },
    attachOrGet: function (entity) {
        /// <signature>
        ///     <summary>Creates a typed entity and adds to the Context with Unchanged state.</summary>
        ///     <param name="entity" type="Object">The init parameters whish is based on Entity</param>
        ///     <returns type="$data.Entity" />
        ///     <example>
        ///         Id is a key of entity.
        ///         var person = Persons.attachOrGet({ Id: 5  });
        ///
        ///     </example>
        /// </signature>
        /// <signature>
        ///     <summary>If not in context then adds to it and sets state Unchanged.</summary>
        ///     <param name="entity" type="$data.Entity">The entity to detach</param>
        ///     <returns type="$data.Entity" />
        ///     <example>
        ///
        ///         var attachedPerson = Persons.attachOrGet(person);
        ///
        ///     </example>
        ///     <example>
        ///         Id is a key of entity.
        ///         var p = new $news.Types.Person({ Id: 5 });
        ///         var attachedPerson = Persons.attachOrGet(p);
        ///
        ///     </example>
        /// </signature>

        var data = entity;
        if (entity instanceof $data.EntityWrapper) {
            data = entity.getEntity();
        } else if (!(entity instanceof this.createNew)) {
            data = new this.createNew(entity);
        }

        var existsItem;
        var trackedEnt = this.entityContext.stateManager.trackedEntities;
        for (var i = 0; i < trackedEnt.length; i++) {
            if (trackedEnt[i].data.equals(data))
                existsItem = trackedEnt[i];
        }
        //var existsItem = this.entityContext.stateManager.trackedEntities.filter(function (i) { return i.data.equals(data); }).pop();
        if (existsItem) {
            return existsItem.data;
        }

        data.entityState = $data.EntityState.Unchanged;
        data.changedProperties = undefined;
        data.context = this.entityContext;
        this._trackEntity(data);
        return data;
    },
    //find: function (keys) {
    //    //todo global scope
    //    if (!this.entityKeys) {
    //        this.entityKeys = this.createNew.memberDefinition.filter(function (prop) { return prop.key; }, this);
    //    }
    //    this.entityContext.stateManager.trackedEntities.forEach(function (item) {
    //        if (item.entitySet == this) {
    //            var isOk = true;
    //            this.entityKeys.forEach(function (item, index) { isOK = isOk && (item.data[item.name] == keys[index]); }, this);
    //            if (isOk) {
    //                return item.data;
    //            }
    //        }
    //    }, this);
    //    //TODO: db call
    //    return null;
    //},
    loadItemProperty: function (entity, memberDefinition, callback) {
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="String">Property name</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="$data.MemberDefinition">Property definition</param>
        ///     <param name="callback" type="Function">
        ///         <summary>Callback function</summary>
        ///         <param name="propertyValue" />
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>
        /// <signature>
        ///     <summary>Loads a property of the entity through the storage provider.</summary>
        ///     <param name="entity" type="$data.Entity">Entity object</param>
        ///     <param name="property" type="$data.MemberDefinition">Property definition</param>
        ///     <param name="callbacks" type="Object">
        ///         Success and error callbacks definition.
        ///         Example: [code]{ success: function(db) { .. }, error: function() { .. } }[/code]
        ///     </param>
        ///     <returns type="$.Deferred" />
        /// </signature>

        return this.entityContext.loadItemProperty(entity, memberDefinition, callback);
    },
    saveChanges: function () {
        return this.entityContext.saveChanges.apply(this.entityContext, arguments);
    },
    addProperty: function (name, getter, setter) {
        return this.elementType.addProperty.apply(this.elementType, arguments);
    },
    expression: {
        get: function () {
            if (!this._expression) {
                var ec = Container.createEntityContextExpression(this.entityContext);
                //var name = entitySet.collectionName;
                //var entitySet = this.entityContext[entitySetName];
                var memberdef = this.entityContext.getType().getMemberDefinition(this.collectionName);
                var es = Container.createEntitySetExpression(ec,
                    Container.createMemberInfoExpression(memberdef), null,
                    this);
                this._expression = es;
            }

            return this._expression;
        },
        set: function (value) {
            this._expression = value;
        }
    },
    getFieldUrl: function (keys, field) {
        return this.entityContext.getFieldUrl(keys, field, this);
    },
    bulkInsert: function (fields, datas, callback) {
        return this.entityContext.bulkInsert(this, fields, datas, callback);
    }
}, null);
$data.EntityState = {
    Detached:0,
    Unchanged: 10,
    Added: 20,
    Modified: 30,
    Deleted: 40
};$data.Class.define('$data.EntityStateManager', null, null,
{
    constructor: function (entityContext) {
        this.entityContext = null;
        this.trackedEntities = [];
        this.init(entityContext);
    },
    init: function (entityContext) {
        this.entityContext = entityContext;
    },
    reset: function () {
        this.trackedEntities = [];
    }
}, null);$data.Class.define('$data.ItemStoreClass', null, null, {
    constructor: function () {
        var self = this;
        self.itemStoreConfig = {
            aliases: {},
            contextTypes: {}
        }

        self.resetStoreToDefault('local', true);
        $data.addStore = function () {
            return self.addItemStoreAlias.apply(self, arguments);
        };
        $data.implementation = self.implementation;

        $data.Entity.addMember('storeToken', {
            get: function () {
                if (this.storeConfigs && this.storeConfigs['default'])
                    return this.storeConfigs.stores[this.storeConfigs['default']];
            },
            set: function (value) {
                self._setTypeStoreConfig(this, 'default', value);
            } 
        }, true);
    },
    itemStoreConfig: {},

    addItemStoreAlias: function (name, contextFactoryOrToken, isDefault) {
        var self = this;
        var promise = new $data.PromiseHandler();
        var callback = promise.createCallback();

        if ('string' === typeof name) {
            //storeToken
            if ('object' === typeof contextFactoryOrToken && 'factory' in contextFactoryOrToken) {
                var type = Container.resolveType(contextFactoryOrToken.typeName);

                self.itemStoreConfig.aliases[name] = contextFactoryOrToken.factory;
                self.itemStoreConfig.contextTypes[name] = type;
                if (isDefault) {
                    self.itemStoreConfig['default'] = name;
                }

                callback.success();
                return promise.getPromise();
            }
                //contextFactory
            else if ('function' === typeof contextFactoryOrToken) {
                var preContext = contextFactoryOrToken();
                var contextPromise;
                if (preContext && preContext instanceof $data.EntityContext) {
                    callback.success(preContext);
                    contextPromise = promise.getPromise();
                } else {
                    contextPromise = preContext;
                }

                return contextPromise.then(function (ctx) {
                    if (typeof ctx === 'function') {
                        //factory resolve factory
                        return self.addItemStoreAlias(name, ctx, isDefault);
                    }

                    if (ctx instanceof $data.EntityContext) {
                        return ctx.onReady()
                            .then(function (ctx) {
                                self.itemStoreConfig.aliases[name] = contextFactoryOrToken;
                                self.itemStoreConfig.contextTypes[name] = ctx.getType();
                                if (isDefault) {
                                    self.itemStoreConfig['default'] = name;
                                }

                                return ctx;
                            });
                    } else {
                        promise = new $data.PromiseHandler();
                        callback = promise.createCallback();
                        callback.error(new Exception('factory dont have context instance', 'Invalid arguments'));
                        return promise.getPromise();
                    }
                });
            }
        }

        callback.error(new Exception('Name or factory missing', 'Invalid arguments'));
        return promise.getPromise();
    },
    resetStoreToDefault: function (name, isDefault) {
        this.itemStoreConfig.aliases[name] = this._getDefaultItemStoreFactory;
        delete this.itemStoreConfig.contextTypes[name];
        if (isDefault) {
            this.itemStoreConfig['default'] = name;
        }
    },
    _setStoreAlias: function (entity, storeToken) {
        if ('object' === typeof storeToken && !entity.storeToken)
            entity.storeToken = storeToken
        return entity;
    },
    _getStoreAlias: function (entity, storeAlias) {
        var type;
        if (entity instanceof $data.Entity) {
            var alias = storeAlias || entity.storeToken;
            if (alias) {
                return alias;
            } else {
                type = entity.getType();
            }
        } else {
            type = entity;
        }

        return storeAlias || (type.storeConfigs ? type.storeConfigs['default'] : undefined) || type.storeToken;
    },
    _getStoreContext: function (aliasOrToken, type, nullIfInvalid) {
        var contextPromise = this._getContextPromise(aliasOrToken, type);

        if (!contextPromise || contextPromise instanceof $data.EntityContext) {
            var promise = new $data.PromiseHandler();
            var callback = promise.createCallback();
            callback.success(contextPromise);
            contextPromise = promise.getPromise();
        }

        return contextPromise.then(function (context) {
            if (context instanceof $data.EntityContext) {
                return context.onReady();
            } else if (nullIfInvalid) {
                return null;
            } else {
                var promise = new $data.PromiseHandler();
                var callback = promise.createCallback();
                callback.error(new Exception('factory return type error', 'Error'));
                return promise.getPromise();
            }
        });
    },
    _getContextPromise: function (aliasOrToken, type) {
        /*Token*/
        if (aliasOrToken && 'object' === typeof aliasOrToken && 'function' === typeof aliasOrToken.factory) {
            return aliasOrToken.factory(type);
        } else if (aliasOrToken && 'object' === typeof aliasOrToken && 'object' === typeof aliasOrToken.args && 'string' === typeof aliasOrToken.typeName) {
            var type = Container.resolveType(aliasOrToken.typeName);
            return new type(JSON.parse(JSON.stringify(aliasOrToken.args)));
        }
            /*resolve alias from type (Token)*/
        else if (aliasOrToken && 'string' === typeof aliasOrToken && type.storeConfigs && type.storeConfigs.stores[aliasOrToken] && typeof type.storeConfigs.stores[aliasOrToken].factory === 'function') {
            return type.storeConfigs.stores[aliasOrToken].factory();
        }
            /*resolve alias from type (constructor options)*/
        else if (aliasOrToken && 'string' === typeof aliasOrToken && type.storeConfigs && type.storeConfigs.stores[aliasOrToken]) {
            return this._getDefaultItemStoreFactory(type, type.storeConfigs.stores[aliasOrToken]);
        }
            /*resolve alias from ItemStore (factories)*/
        else if (aliasOrToken && 'string' === typeof aliasOrToken && this.itemStoreConfig.aliases[aliasOrToken]) {
            return this.itemStoreConfig.aliases[aliasOrToken](type);
        }
            /*token is factory*/
        else if (aliasOrToken && 'function' === typeof aliasOrToken) {
            return aliasOrToken();
        }
            /*default no hint*/
        else {
            return this.itemStoreConfig.aliases[this.itemStoreConfig['default']](type);
        }

    },
    _getStoreEntitySet: function (storeAlias, instanceOrType) {
        var aliasOrToken = this._getStoreAlias(instanceOrType, storeAlias);
        var type = ("function" === typeof instanceOrType) ? instanceOrType : instanceOrType.getType();;

        return this._getStoreContext(aliasOrToken, type)
            .then(function (ctx) {
                var entitySet = ctx.getEntitySetFromElementType(type);
                if (!entitySet) {
                    var d = new $data.PromiseHandler();
                    var callback = d.createCallback();
                    callback.error("EntitySet not exist for " + type.fullName);
                    return d.getPromise();
                }
                return entitySet;
            });
    },
    _getDefaultItemStoreFactory: function (instanceOrType, initStoreConfig) {
        if (instanceOrType) {
            var type = ("function" === typeof instanceOrType) ? instanceOrType : instanceOrType.getType();
            var typeName = $data.Container.resolveName(type) + "_items";
            var typeName = typeName.replace(/\./g, "_");

            var storeConfig = $data.typeSystem.extend({
                collectionName: initStoreConfig && initStoreConfig.collectionName ? initStoreConfig.collectionName : 'Items',
                tableName: typeName,
                initParam: { provider: 'local', databaseName: typeName }
            }, initStoreConfig);

            var contextDef = {};
            contextDef[storeConfig.collectionName] = { type: $data.EntitySet, elementType: type }
            if (storeConfig.tableName)
                contextDef[storeConfig.collectionName]['tableName'] = storeConfig.tableName;

            var inMemoryType = $data.EntityContext.extend(typeName, contextDef);
            var ctx = new inMemoryType(storeConfig.initParam);
            if (initStoreConfig && typeof initStoreConfig === 'object')
                initStoreConfig.factory = ctx._storeToken.factory;
            return ctx;
        }
        return undefined;
    },
    implementation: function (name, contextOrAlias) {
        var self = $data.ItemStore;
        var result;

        if (typeof contextOrAlias === 'string') {
            contextOrAlias = self.itemStoreConfig.contextTypes[contextOrAlias]
        } else if (contextOrAlias instanceof $data.EntityContext) {
            contextOrAlias = contextOrAlias.getType();
        } else if (!(typeof contextOrAlias === 'function' && contextOrAlias.isAssignableTo)) {
            contextOrAlias = self.itemStoreConfig.contextTypes[self.itemStoreConfig['default']];
        }

        if (contextOrAlias) {
            result = self._resolveFromContext(contextOrAlias, name);
        }

        if (!result) {
            result = Container.resolveType(name);
        }

        return result;
    },
    _resolveFromContext: function (contextType, name) {
        var memDefs = contextType.memberDefinitions.getPublicMappedProperties();
        for (var i = 0; i < memDefs.length; i++) {
            var memDef = memDefs[i];
            if (memDef.type) {
                var memDefType = Container.resolveType(memDef.type);
                if (memDefType.isAssignableTo && memDefType.isAssignableTo($data.EntitySet)) {
                    var elementType = Container.resolveType(memDef.elementType);
                    if (elementType.name === name) {
                        return elementType;
                    }
                }
            }
        }
        return null;
    },


    //Entity Instance
    EntityInstanceSave: function (storeAlias, hint) {
        var self = $data.ItemStore;
        var entity = this;
        return self._getStoreEntitySet(storeAlias, entity)
            .then(function (entitySet) {
                return self._getSaveMode(entity, entitySet, hint, storeAlias)
                    .then(function (mode) {
                        mode = mode || 'add';
                        switch (mode) {
                            case 'add':
                                entitySet.add(entity);
                                break;
                            case 'attach':
                                entitySet.attach(entity, true);
                                entity.entityState = $data.EntityState.Modified;
                                break;
                            default:
                                var d = new $data.PromiseHandler();
                                var callback = d.createCallback();
                                callback.error('save mode not supported: ' + mode);
                                return d.getPromise();
                        }

                        return entitySet.entityContext.saveChanges()
                            .then(function () { self._setStoreAlias(entity, entitySet.entityContext.storeToken); return entity; });
                    });
            });
    },
    EntityInstanceRemove: function (storeAlias) {
        var self = $data.ItemStore;
        var entity = this;
        return self._getStoreEntitySet(storeAlias, entity)
            .then(function (entitySet) {
                entitySet.remove(entity);

                return entitySet.entityContext.saveChanges()
                    .then(function () { return entity; });
            });
    },
    EntityInstanceRefresh: function (storeAlias, keepStore) {
        var self = $data.ItemStore;
        var entity = this;
        var entityType = entity.getType();

        var key = self._getKeyObjectFromEntity(entity, entityType);

        return entityType.read(key, storeAlias)
            .then(function (loadedEntity) {
                entityType.memberDefinitions.getPublicMappedProperties().forEach(function (memDef) {
                    entity[memDef.name] = loadedEntity[memDef.name];
                });
                entity.storeToken = (keepStore ? entity.storeToken : undefined) || loadedEntity.storeToken;
                entity.changedProperties = undefined;
                return entity;
            });
    },

    //Entity Type
    EntityInheritedTypeProcessor: function (type) {
        var self = $data.ItemStore;
        type.readAll = self.EntityTypeReadAll(type);
        type.read = self.EntityTypeRead(type);
        type.removeAll = self.EntityTypeRemoveAll(type);
        type.remove = self.EntityTypeRemove(type);
        type.get = self.EntityTypeGet(type); //Not complete
        type.save = self.EntityTypeSave(type);
        type.addMany = self.EntityTypeAddMany(type);
        type.itemCount = self.EntityTypeItemCount(type);
        type.query = self.EntityTypeQuery(type);
        type.takeFirst = self.EntityTypeTakeFirst(type);

        type.setStore = self.EntityTypeSetStore(type);
    },
    EntityTypeReadAll: function (type) {
        return function (storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    return entitySet.forEach(function (item) { self._setStoreAlias(item, entitySet.entityContext.storeToken); });
                });
        }
    },
    EntityTypeRemoveAll: function (type) {
        return function (storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    return entitySet.toArray().then(function (items) {
                        items.forEach(function (item) {
                            entitySet.remove(item);
                        });

                        return entitySet.entityContext.saveChanges()
                            .then(function () { return items; });
                    });
                });
        }
    },
    EntityTypeRead: function (type) {
        return function (key, storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    try {
                        var singleParam = self._findByIdQueryable(entitySet, key);
                        return entitySet.single(singleParam.predicate, singleParam.thisArgs)
                            .then(function (item) { return self._setStoreAlias(item, entitySet.entityContext.storeToken); });
                    } catch (e) {
                        var d = new $data.PromiseHandler();
                        var callback = d.createCallback();
                        callback.error(e);
                        return d.getPromise();
                    }
                });
        };
    },
    EntityTypeGet: function (type) {
        return function (key, storeAlias) {
            var self = $data.ItemStore;
            var item = new type(self._getKeyObjectFromEntity(key));
            item.refresh(storeAlias);
            return item;
        };
    },
    EntityTypeSave: function (type) {
        return function (initData, storeAlias, hint) {

            var self = $data.ItemStore;
            var instance = new type(initData);
            return instance.save(storeAlias, hint);
        }
    },
    EntityTypeAddMany: function (type) {
        return function (initDatas, storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    var items = entitySet.addMany(initDatas);
                    return entitySet.entityContext.saveChanges()
                        .then(function () {
                            return items;
                        });
                });
        }
    },
    EntityTypeRemove: function (type) {
        return function (key, storeAlias) {
            var self = $data.ItemStore;
            var entityPk = type.memberDefinitions.getKeyProperties();
            var entity;
            if (entityPk.length === 1) {
                var obj = {};
                obj[entityPk[0].name] = key;
                entity = new type(obj);
            } else {
                entity = new type(key);
            }
            return entity.remove(storeAlias);
        }
    },
    EntityTypeItemCount: function (type) {
        return function (storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    return entitySet.length();
                });
        }
    },
    EntityTypeQuery: function (type) {
        return function (predicate, thisArg, storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    return entitySet.filter(predicate, thisArg).forEach(function (item) { self._setStoreAlias(item, entitySet.entityContext.storeToken); });
                });
        }
    },
    EntityTypeTakeFirst: function (type) {
        return function (predicate, thisArg, storeAlias) {
            var self = $data.ItemStore;
            return self._getStoreEntitySet(storeAlias, type)
                .then(function (entitySet) {
                    return entitySet.first(predicate, thisArg)
                        .then(function (item) { return self._setStoreAlias(item, entitySet.entityContext.storeToken); });
                });
        }
    },

    EntityTypeSetStore: function (type) {
        return function (name, config) {
            if (typeof name === 'object' && typeof config === 'undefined') {
                config = name;
                name = 'default';
            }

            var self = $data.ItemStore;

            var defStoreConfig = {};
            if (config) {
                if (config.tableName) {
                    defStoreConfig.tableName = config.tableName;
                    delete config.tableName;
                }

                if (config.collectionName) {
                    defStoreConfig.collectionName = config.collectionName;
                    delete config.collectionName;
                }

                if (typeof config.dataSource === 'string') {
                    var ds = config.dataSource;
                    if (ds.lastIndexOf('/') === ds.length - 1) {
                        ds = ds.substring(0, ds.lastIndexOf('/'));
                    }
                    var parsedApiUrl = ds.substring(0, ds.lastIndexOf('/'));
                    if (!defStoreConfig.tableName)
                        defStoreConfig.tableName = ds.substring(ds.lastIndexOf('/') + 1);

                    var provider = config.provider || config.name;
                    switch (provider) {
                        case 'oData':
                            config.oDataServiceHost = config.oDataServiceHost || parsedApiUrl;
                            break;
                        case 'webApi':
                            config.apiUrl = config.apiUrl || parsedApiUrl;
                            break;
                        default:
                            break;
                    }
                }


            } else {
                config = { name: 'local' };
            }

            defStoreConfig.initParam = config;
            self._setTypeStoreConfig(type, name, defStoreConfig);

            return type;
        }
    },
    _setTypeStoreConfig: function(type, name, config){
        if (!type.storeConfigs) {
            type.storeConfigs = {
                stores: {}
            };
        }
        type.storeConfigs.stores[name] = config;
        if (name === 'default') {
            type.storeConfigs['default'] = name;
        }
    },

    _findByIdQueryable: function (set, keys) {
        var keysProps = set.defaultType.memberDefinitions.getKeyProperties();
        if (keysProps.length > 1 && keys && 'object' === typeof keys) {
            var predicate = "", thisArgs = {};
            for (var i = 0; i < keysProps.length; i++) {
                if (i > 0) predicate += " && ";

                var key = keysProps[i];
                predicate += "it." + key.name + " == this." + key.name;
                thisArgs[key.name] = keys[key.name];
            }

            return {
                predicate: predicate,
                thisArgs: thisArgs
            };
        } else if (keysProps.length === 1) {
            return {
                predicate: "it." + keysProps[0].name + " == this.value",
                thisArgs: { value: keys }
            };
        } else {
            throw 'invalid keys';
        }
    },
    _getKeyObjectFromEntity: function (obj, entityType) {
        var key;
        var keyDefs = entityType.memberDefinitions.getKeyProperties();
        if (keyDefs.length === 1)
            key = obj && typeof obj === 'object' ? obj[keyDefs[0].name] : obj;
        else {
            key = {};

            for (var i = 0; i < keyDefs.length; i++) {
                key[keyDefs[0].name] = obj ? obj[keyDefs[0].name] : obj;
            }
        }

        return key;
    },
    _getSaveMode: function (entity, entitySet, hint, storeAlias) {
        var self = this;
        var promise = new $data.PromiseHandler();
        var callback = promise.createCallback();
        var entityType = entity.getType();

        switch (true) {
            case hint === 'update':
                callback.success('attach'); break;
            case hint === 'new':
                callback.success('add'); break;
            case false === entityType.memberDefinitions.getKeyProperties().every(function (keyDef) { return entity[keyDef.name]; }):
                callback.success('add'); break;
            case !!entity.storeToken:
                callback.success('attach'); break;
                break;
            default:
                //use the current entity store informations
                storeAlias = this._getStoreAlias(entity, storeAlias);
                entityType.read(self._getKeyObjectFromEntity(entity, entityType), storeAlias)
                    .then(function () { callback.success('attach'); })
                    .fail(function () { callback.success('add'); });
                break;
        }

        return promise.getPromise();
    },

    //EntityContext
    ContextRegister: function (storageProviderCfg) {
        //context instance
        var self = this;
        var args = JSON.parse(JSON.stringify(storageProviderCfg));
        this.storeToken = {
            typeName: this.getType().fullName,
            args: args,
            factory: function () {
                return new (self.getType())(args);
            }
        }

        //set elementType storetoken
        var members = this.getType().memberDefinitions.getPublicMappedProperties();
        for (var i = 0; i < members.length; i++) {
            var item = members[i];
            if (item.type) {
                var itemResolvedDataType = Container.resolveType(item.type);
                if (itemResolvedDataType && itemResolvedDataType.isAssignableTo && itemResolvedDataType.isAssignableTo($data.EntitySet)) {
                    var elementType = Container.resolveType(item.elementType);
                    if (!elementType.storeToken) {
                        elementType.storeToken = this.storeToken;
                    }
                }
            }
        }

    },
    QueryResultModifier: function (query) {
        var self = $data.ItemStore;
        var context = query.context;
        var type = query.modelBinderConfig.$type;
        if ('string' === typeof type) {
            type = Container.resolveType(type);
        }

        if (type === $data.Array && query.modelBinderConfig.$item && query.modelBinderConfig.$item.$type) {
            type = query.modelBinderConfig.$item.$type;
        }

        //TODO: runs when model binding missed (inmemory)
        if ((typeof type === 'undefined' && query.result && query.result[0] instanceof $data.Entity)) {
            var navProps = !type ? [] : type.memberDefinitions.getPublicMappedProperties().filter(function (memDef) {
                return !!memDef.inverseProperty;
            });

            for (var i = 0; i < query.result.length; i++) {
                self._setStoreAlias(query.result[i], context.storeToken);

                for (var j = 0; j < navProps.length; j++) {
                    var navProp = navProps[j];
                    if (query.result[i][navProp.name] instanceof $data.Entity) {
                        self._setStoreAlias(query.result[i][navProp.name], context.storeToken);
                    } else if (Array.isArray(query.result[i][navProp.name])) {
                        for (var k = 0; k < query.result[i][navProp.name].length; k++) {
                            if (query.result[i][navProp.name][k] instanceof $data.Entity) {
                                self._setStoreAlias(query.result[i][navProp.name][k], context.storeToken);
                            }
                        }
                    }
                }
            }
        }
    }
});
$data.ItemStore = new $data.ItemStoreClass();

$data.Entity.addMember('field', function (propName) {
    var def = this.memberDefinitions.getMember(propName);
    if (def) {
        if (def.definedBy === this) {
            return new $data.MemberWrapper(def);
        } else {
            Guard.raise(new Exception("Member '" + propName + "' defined on '" + def.definedBy.fullName + "'!", 'Invalid Operation'));
        }
    } else {
        Guard.raise(new Exception("Member '" + propName + "' not exists!", 'Invalid Operation'));
    }

    return this;
}, true);


$data.Class.define('$data.MemberWrapper', null, null, {
    constructor: function (memberDefinition) {
        this.memberDefinition = memberDefinition;
    },
    setKey: function (value) {
        this.memberDefinition.key = value || value === undefined ? true : false;
        return this;
    },
    setComputed: function (value) {
        this.memberDefinition.computed = value || value === undefined ? true : false;
        return this;
    },
    setRequired: function (value) {
        this.memberDefinition.required = value || value === undefined ? true : false;
        return this;
    },
    setNullable: function (value) {
        this.memberDefinition.nullable = value || value === undefined ? true : false;
        return this;
    },
    changeDefinition: function (attr, value) {
        this.memberDefinition[attr] = value;
        return this;
    }
});

$data.Class.define('$data.StorageProviderLoaderBase', null, null, {
    isSupported: function (providerName) {
        $data.Trace.log('Detecting ' + providerName + ' provider support');
        var supported = true;
        switch (providerName) {
            case 'indexedDb':
                supported = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || (window.msIndexedDB && !(/^file:/.test(window.location.href)));
                break;
            case 'storm':
                supported = 'XMLHttpRequest' in window;
                break;
            case 'webSql':
            case 'sqLite':
                supported = 'openDatabase' in window;
                break;
            case 'LocalStore':
                supported = 'localStorage' in window && window.localStorage ? true : false;
                break;
            case 'sqLite':
                supported = 'openDatabase' in window;
                break;
            case 'mongoDB':
                supported = $data.mongoDBDriver;
                break;
            default:
                break;
        }
        $data.Trace.log(providerName + ' provider is ' + (supported ? '' : 'not') + ' supported');
        return supported;
    },
    scriptLoadTimeout: { type: 'int', value: 1000 },
    scriptLoadInterval: { type: 'int', value: 50 },
    npmModules: {
        value: {
            'indexedDb': 'jaydata-indexeddb',
            'InMemory': 'jaydata-inmemory',
            'LocalStore': 'jaydata-inmemory',
            'mongoDB': 'jaydata-mongodb',
            'oData': 'jaydata-odata',
            'webApi': 'jaydata-webapi',
            'sqLite': 'jaydata-sqlite',
            'webSql': 'jaydata-sqlite',
            'storm': 'jaydata-storm'
        }
    },
    ProviderNames: {
        value: {
            'indexedDb': 'IndexedDb',
            'InMemory': 'InMemory',
            'LocalStore': 'InMemory',
            'oData': 'oData',
            'webApi': 'WebApi',
            'sqLite': 'SqLite',
            'webSql': 'SqLite',
            'storm': 'Storm'
        }
    },
    load: function (providerList, callback) {
        $data.RegisteredStorageProviders = $data.RegisteredStorageProviders || {};

        $data.Trace.log('Loading provider(s): ' + providerList);
        callback = $data.typeSystem.createCallbackSetting(callback);

        var self = this;
        var cacheKey = providerList.join(',');
        self._fallbackCache = self._fallbackCache || {};

        if (self._fallbackCache[cacheKey]) {
            callback.success(self._fallbackCache[cacheKey]);
        } else {
            this.find(providerList, {
                success: function (provider, selectedProvider) {
                    self._fallbackCache[cacheKey] = provider;
                    callback.success.call(this, provider);
                },
                error: callback.error
            });
        }
    },
    find: function (providerList, callback) {
        var currentProvider = providerList.shift();
        var currentProvider = this.getVirtual(currentProvider);
        if(Array.isArray(currentProvider)){
            providerList = currentProvider;
            currentProvider = providerList.shift();
        }

        while (currentProvider && !this.isSupported(currentProvider)) {
            currentProvider = providerList.shift();
        }
        
        $data.Trace.log('First supported provider is ' + currentProvider);

        if (!currentProvider){
            $data.Trace.log('Provider fallback failed');
            callback.error();
        }

        if ($data.RegisteredStorageProviders) {
            $data.Trace.log('Is the ' + currentProvider + ' provider already registered?');
            var provider = $data.RegisteredStorageProviders[currentProvider];
            if (provider) {
                $data.Trace.log(currentProvider + ' provider registered');
                callback.success(provider)
                return;
            }else{
                $data.Trace.log(currentProvider + ' provider not registered');
            }
        }

        if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
            // NodeJS
            $data.Trace.log('node.js detected trying to load NPM module');
            this.loadNpmModule(currentProvider, providerList, callback);
        } else {
            $data.Trace.log('Browser detected trying to load provider');
            this.loadProvider(currentProvider, providerList, callback);
        }
    },
    loadProvider: function (currentProvider, providerList, callback) {
        var self = this;
        var mappedName = $data.StorageProviderLoader.ProviderNames[currentProvider] || currentProvider;
        $data.Trace.log(currentProvider + ' provider is mapped to name ' + mappedName + 'Provider');
        if (mappedName) {
            var url = this.getUrl(mappedName);
            $data.Trace.log(currentProvider + ' provider from URL: ' + url);

            var loader = this.loadScript;
            if (document && document.createElement) {
                $data.Trace.log('document and document.createElement detected, using script element loader method');
                loader = this.loadScriptElement;
            }

            loader.call(this, url, currentProvider, function (successful) {
                var provider = $data.RegisteredStorageProviders[currentProvider];
                if (successful && provider) {
                    $data.Trace.log(currentProvider + ' provider successfully registered');
                    callback.success(provider);
                } else if (providerList.length > 0) {
                    $data.Trace.log(currentProvider + ' provider failed to load, trying to fallback to ' + providerList + ' provider(s)');
                    self.find(providerList, callback);
                } else {
                    $data.Trace.log(currentProvider + ' provider failed to load');
                    callback.error();
                }
            });
        }
    },
    getUrl: function (providerName) {
        var jaydataScriptMin = document.querySelector('script[src$="jaydata.min.js"]');
        var jaydataScript = document.querySelector('script[src$="jaydata.js"]');
        if (jaydataScriptMin) return jaydataScriptMin.src.substring(0, jaydataScriptMin.src.lastIndexOf('/') + 1) + 'jaydataproviders/' + providerName + 'Provider.min.js';
        else if (jaydataScript) return jaydataScript.src.substring(0, jaydataScript.src.lastIndexOf('/') + 1) + 'jaydataproviders/' + providerName + 'Provider.js';
        else return 'jaydataproviders/' + providerName + 'Provider.js';
    },
    loadScript: function (url, currentProvider, callback) {
        if (!url){
            callback(false);
            return;
        }

        function getHttpRequest() {
            if (window.XMLHttpRequest)
                return new XMLHttpRequest();
            else if (window.ActiveXObject)
                return new ActiveXObject("MsXml2.XmlHttp");
            else{
                $data.Trace.log('XMLHttpRequest or MsXml2.XmlHttp ActiveXObject not found');
                callback(false);
                return;
            }
        }

        var oXmlHttp = getHttpRequest();
        oXmlHttp.onreadystatechange = function () {
            $data.Trace.log('HTTP request is in state: ' + oXmlHttp.readyState);
            if (oXmlHttp.readyState == 4) {
                if (oXmlHttp.status == 200 || oXmlHttp.status == 304) {
                    $data.Trace.log('HTTP request succeeded');
                    $data.Trace.log('HTTP request response text: ' + oXmlHttp.responseText);
                    eval.call(window, oXmlHttp.responseText);
                    if (typeof callback === 'function')
                        callback(true);
                    else $data.Trace.log('Callback function is undefined');
                } else {
                    $data.Trace.log('HTTP request status: ', oXmlHttp.status);
                    if (typeof callback === 'function')
                        callback(false);
                    else $data.Trace.log('Callback function is undefined');
                }
            }
        };
        oXmlHttp.open('GET', url, true);
        oXmlHttp.send(null);
    },
    loadScriptElement: function (url, currentProvider, callback) {
        var head = document.getElementsByTagName('head')[0] || document.documentElement;

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        $data.Trace.log('Appending child ' + script + ' to ' + head);
        head.appendChild(script);

        var loadInterval = this.scriptLoadInterval || 50;
        var iteration = Math.ceil(this.scriptLoadTimeout / loadInterval);
        $data.Trace.log('Script element watcher iterating ' + iteration + ' times');
        function watcher() {
            $data.Trace.log('Script element watcher iteration ' + iteration);
            var provider = $data.RegisteredStorageProviders[currentProvider];
            if (provider) {
                $data.Trace.log(currentProvider + ' provider registered');
                callback(true);
            } else {
                iteration--;
                if (iteration > 0) {
                    $data.Trace.log('Script element watcher next iteration');
                    setTimeout(watcher, loadInterval);
                } else {
                    $data.Trace.log('Script element loader failed');
                    callback(false);
                }
            }
        }
        setTimeout(watcher, loadInterval);
    },

    loadNpmModule: function (currentProvider, providerList, callback) {
        var provider = null;
        try {
            require(this.npmModules[currentProvider]);
            provider = $data.RegisteredStorageProviders[currentProvider];
            $data.Trace.log('NPM module loader successfully registered ' + currentProvider + ' provider');
        } catch (e) {
            $data.Trace.log('NPM module loader failed for ' + currentProvider + ' provider');
        }

        if (provider) {
            callback.success(provider);
        } else if (providerList.length > 0) {
            this.find(providerList, callback);
        } else {
            callback.error();
        }
    },

    virtualProviders: {
        type: $data.Array,
        value: {
            local: {
                fallbacks: ['webSql', 'indexedDb', 'LocalStore']
            }
        }
    },
    getVirtual: function(name){
        if(this.virtualProviders[name])
            return [].concat(this.virtualProviders[name].fallbacks);

        return name;
    }
});

$data.StorageProviderLoader = new $data.StorageProviderLoaderBase();
$data.storageProviders = {
    DbCreationType: {
        Merge: 10,
        DropTableIfChanged: 20,
        DropTableIfChange: 20,
        DropAllExistingTables: 30,
        ErrorIfChange: 40,
        DropDbIfChange: 50
    }
}

$data.ConcurrencyMode = { Fixed: 'fixed', None: 'none' };
$data.Class.define('$data.StorageProviderBase', null, null,
{
    constructor: function (schemaConfiguration, context) {
        this.providerConfiguration = schemaConfiguration || {};

        this.name = this.getType().name;
        if ($data.RegisteredStorageProviders) {
            var keys = Object.keys($data.RegisteredStorageProviders);
            for (var i = 0; i < keys.length; i++) {
                if (this instanceof $data.RegisteredStorageProviders[keys[i]]) {
                    this.name = keys[i];
                    break;
                }
            }
        }
    },
    providers: {},
    supportedDataTypes: { value: [], writable: false },
    initializeStore: function (callBack) {
        Guard.raise("Pure class");
    },

    executeQuery: function (queryable, callBack) {
        Guard.raise("Pure class");
    },

    buildIndependentBlocks: function (changedItems) {
        /// <summary>
        /// Build and processes a dependency graph from the changed items,
        /// and generates blocks that can be inserted to the database sequentially.
        /// </summary>
        /// <param name="changedItems">Array of changed items to build independent blocks from.</param>
        var edgesTo = [];
        var edgesFrom = [];

        function hasOwnProperty(obj) {
            /// <summary>
            /// Returns true if object has own property (used for 'hashset'-like objects)
            /// </summary>
            /// <param name="obj">Target object</param>
            /// <returns>True if the object has own property</returns>
            for (var p in obj) {
                if (obj.hasOwnProperty(p))
                    return true;
            }
            return false;
        }

        // Building edgesTo and edgesFrom arrays (containing only indeces of items in changedItems array.
        for (var i = 0; i < changedItems.length; i++) {
            var current = changedItems[i];
            if (!current.dependentOn || current.dependentOn.length == 0) {
                // This item is independent
                continue;
            }

            var to = null;
            // Iterating over items 'current' depends on
            for (var j = 0; j < current.dependentOn.length; j++) {
                var currentDependency = current.dependentOn[j];
                if (currentDependency.entityState == $data.EntityState.Unchanged) {
                    continue;
                }
                to = to || {};
                // Getting the index of current dependency
                var ixDependendOn = -1;
                for (var k = 0; k < changedItems.length; k++) {
                    if (changedItems[k].data == currentDependency) {
                        ixDependendOn = k;
                        break;
                    }
                }
                // Sanity check
                if (ixDependendOn == -1) {
                    Guard.raise(new Exception('Dependent object not found', 'ObjectNotFound', current.dependentOn[j]));
                }
                // Setting edge in 'to' array
                to[ixDependendOn] = true;
                // Setting edge in 'from' array
                from = edgesFrom[ixDependendOn] || {};
                from[i] = true;
                edgesFrom[ixDependendOn] = from;
            }
            // Persisting found edges in edgesTo array
            if (to !== null)
                edgesTo[i] = to;
        }

        // Array of sequentialyl independent blocks (containing objects, not just their id's)
        var independentBlocks = [];
        // Objects getting their dependency resolved in the current cycle.
        var currentBlock = [];
        // Filling currentBlock with initially independent objects.
        for (var x = 0; x < changedItems.length; x++) {
            if (!edgesTo.hasOwnProperty(x)) {
                currentBlock.push(x);
            }
        }
        while (currentBlock.length > 0) {
            // Shifting currentBlock to cbix,
            // and clearing currentBlock for next independent block
            var cbix = [].concat(currentBlock);
            currentBlock = [];
            // Iterating over previous independent block, to generate the new one
            for (var b = 0; b < cbix.length; b++) {
                var dependentNodes = edgesFrom[cbix[b]];
                if (typeof dependentNodes !== 'undefined') {
                    for (var d in dependentNodes) {
                        // Removing edge from 'edgesTo'
                        delete edgesTo[d][cbix[b]];
                        // Check if has any more dependency
                        if (!hasOwnProperty(edgesTo[d])) {
                            // It doesn't, so let's clean up a bit
                            delete edgesTo[d];
                            // and push the item to 'currentBlock'
                            currentBlock.push(d);
                        }
                    }
                }
                // Clearing processed item from 'edgesFrom'
                delete edgesFrom[cbix[b]];
            }
            // Push cbix t to independentBlocks
            var cb = [];
            for (var c = 0; c < cbix.length; c++) {
                var item = changedItems[cbix[c]];
                if (item.data.entityState != $data.EntityState.Unchanged)
                    cb.push(item);
            }
            if (cb.length > 0)
                independentBlocks.push(cb);
        }
        return independentBlocks;
    },
    getTraceString: function (queryable) {
        Guard.raise("Pure class");
    },
    setContext: function (ctx) {
        this.context = ctx;
    },

    _buildContinuationFunction: function (context, query) {
        if (Array.isArray(query.result)) {
            query.result.next = this._buildPagingMethod(context, query, 'next');
            query.result.prev = this._buildPagingMethod(context, query, 'prev');
        }
    },
    _buildPagingMethod: function (context, query, mode) {
        return function (onResult_items) {
            var pHandler = new $data.PromiseHandler();
            var cbWrapper = pHandler.createCallback(onResult_items);

            var continuation = new $data.Expressions.ContinuationExpressionBuilder(mode);
            var continuationResult = continuation.compile(query);
            if (continuationResult.expression) {
                var queryable = Container.createQueryable(context, continuationResult.expression);
                queryable.defaultType = query.defaultType;
                context.executeQuery(queryable, cbWrapper);
            } else {
                cbWrapper.error(new Exception(continuationResult.message, 'Invalid Operation', continuationResult));
            }

            return pHandler.getPromise();
        }
    },

    buildDbType_modifyInstanceDefinition: function (instanceDefinition, storageModel) {
        var buildDbType_copyPropertyDefinition = function (propertyDefinition, refProp) {
            var cPropertyDef;
            if (refProp) {
                cPropertyDef = JSON.parse(JSON.stringify(instanceDefinition[refProp]));
                cPropertyDef.kind = propertyDefinition.kind;
                cPropertyDef.name = propertyDefinition.name;
                cPropertyDef.notMapped = false;
            } else {
                cPropertyDef = JSON.parse(JSON.stringify(propertyDefinition));
            }

            cPropertyDef.dataType = Container.resolveType(propertyDefinition.dataType);
            cPropertyDef.type = cPropertyDef.dataType;
            cPropertyDef.key = false;
            cPropertyDef.computed = false;
            return cPropertyDef;
        };
        var buildDbType_createConstrain = function (foreignType, dataType, propertyName, prefix) {
            var constrain = new Object();
            constrain[foreignType.name] = propertyName;
            constrain[dataType.name] = prefix + '__' + propertyName;
            return constrain;
        };

        if (storageModel.Associations) {
            storageModel.Associations.forEach(function (association) {
                var addToEntityDef = false;
                var foreignType = association.FromType;
                var dataType = association.ToType;
                var foreignPropName = association.ToPropertyName;

                association.ReferentialConstraint = association.ReferentialConstraint || [];

                if ((association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1") || (association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1")) {
                    foreignType = association.ToType;
                    dataType = association.FromType;
                    foreignPropName = association.FromPropertyName;
                    addToEntityDef = true;
                }

                foreignType.memberDefinitions.getPublicMappedProperties().filter(function (d) { return d.key }).forEach(function (d) {
                    if (addToEntityDef) {
                        instanceDefinition[foreignPropName + '__' + d.name] = buildDbType_copyPropertyDefinition(d, foreignPropName);
                    }
                    association.ReferentialConstraint.push(buildDbType_createConstrain(foreignType, dataType, d.name, foreignPropName));
                }, this);
            }, this);
        }
        //Copy complex type properties
        if (storageModel.ComplexTypes) {
            storageModel.ComplexTypes.forEach(function (complexType) {
                complexType.ReferentialConstraint = complexType.ReferentialConstraint || [];

                complexType.ToType.memberDefinitions.getPublicMappedProperties().forEach(function (d) {
                    instanceDefinition[complexType.FromPropertyName + '__' + d.name] = buildDbType_copyPropertyDefinition(d);
                    complexType.ReferentialConstraint.push(buildDbType_createConstrain(complexType.ToType, complexType.FromType, d.name, complexType.FromPropertyName));
                }, this);
            }, this);
        }
    },
    buildDbType_generateConvertToFunction: function (storageModel) {
        return function (logicalEntity) {
            var dbInstance = new storageModel.PhysicalType();
            dbInstance.entityState = logicalEntity.entityState;

            //logicalEntity.changedProperties.forEach(function(memberDef){
            //}, this);
            storageModel.PhysicalType.memberDefinitions.getPublicMappedProperties().forEach(function (property) {
                if (logicalEntity[property.name] !== undefined) {
                    dbInstance[property.name] = logicalEntity[property.name];
                }
            }, this);

            if (storageModel.Associations) {
                storageModel.Associations.forEach(function (association) {
                    if ((association.FromMultiplicity == "*" && association.ToMultiplicity == "0..1") || (association.FromMultiplicity == "0..1" && association.ToMultiplicity == "1")) {
                        var complexInstance = logicalEntity[association.FromPropertyName];
                        if (complexInstance !== undefined) {
                            association.ReferentialConstraint.forEach(function (constrain) {
                                if (complexInstance !== null) {
                                    dbInstance[constrain[association.From]] = complexInstance[constrain[association.To]];
                                } else {
                                    dbInstance[constrain[association.From]] = null;
                                }
                            }, this);
                        }
                    }
                }, this);
            }
            if (storageModel.ComplexTypes) {
                storageModel.ComplexTypes.forEach(function (cmpType) {
                    var complexInstance = logicalEntity[cmpType.FromPropertyName];
                    if (complexInstance !== undefined) {
                        cmpType.ReferentialConstraint.forEach(function (constrain) {
                            if (complexInstance !== null) {
                                dbInstance[constrain[cmpType.From]] = complexInstance[constrain[cmpType.To]];
                            } else {
                                dbInstance[constrain[cmpType.From]] = null;
                            }
                        }, this);
                    }
                }, this);
            }
            return dbInstance;
        };
    },

    bulkInsert: function (a, b, c, callback) {
        callback.error(new Exception('Not Implemented'));
    },

    supportedFieldOperations: {
        value: {
            length: { dataType: "number", allowedIn: "filter, map" },
            substr: { dataType: "string", allowedIn: "filter", parameters: [{ name: "startFrom", dataType: "number" }, { name: "length", dataType: "number" }] },
            toLowerCase: { dataType: "string" }
        },
        enumerable: true,
        writable: true
    },

    resolveFieldOperation: function (operationName, expression, frameType) {
        ///<summary></summary>
        var result = this.supportedFieldOperations[operationName];
        if (Array.isArray(result)) {
            var i = 0;
            for (; i < result.length; i++) {
                if (result[i].allowedType === 'default' || Container.resolveType(result[i].allowedType) === Container.resolveType(expression.selector.memberDefinition.type) &&
                    (frameType && result[i].allowedIn &&
                        (
                            (Array.isArray(result[i].allowedIn) && result[i].allowedIn.some(function(type){ return frameType === Container.resolveType(type); })) ||
                            (!Array.isArray(result[i].allowedIn) && (frameType === Container.resolveType(result[i].allowedIn)))
                        )
                    )
                    ) {
                    result = result[i];
                    break;
                }
            }
            if (i === result.length) {
                result = undefined;
            }
        }

        if (!result) {
            Guard.raise(new Exception("Field operation '" + operationName + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if ((result.allowedIn instanceof Array && !result.allowedIn.some(function (type) { return frameType === Container.resolveType(type); })) ||
                        (!(result.allowedIn instanceof Array) && frameType !== Container.resolveType(result.allowedIn))) {
                Guard.raise(new Exception(operationName + " not supported in: " + frameType.name));
            }
        }
        result.name = operationName;
        return result;
    },

    supportedBinaryOperators: {
        value: {
            equal: { mapTo: 'eq', dataType: "boolean" }
        },
        enumerable: true,
        writable: true
    },

    resolveBinaryOperator: function (operator, expression, frameType) {
        var result = this.supportedBinaryOperators[operator];
        if (!result) {
            Guard.raise(new Exception("Binary operator '" + operator + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if ((result.allowedIn instanceof Array && !result.allowedIn.some(function (type) { return frameType === Container.resolveType(type); })) ||
                        (!(result.allowedIn instanceof Array) && frameType !== Container.resolveType(result.allowedIn))) {
                Guard.raise(new Exception(operator + " not supported in: " + frameType.name));
            }
        }
        result.name = operator;
        return result;
    },

    supportedUnaryOperators: {
        value: {
            not: { mapTo: 'not' }
        },
        enumerable: true,
        writable: true
    },
    resolveUnaryOperator: function (operator, expression, frameType) {
        var result = this.supportedUnaryOperators[operator];
        if (!result) {
            Guard.raise(new Exception("Unary operator '" + operator + "' is not supported by the provider"));
        };
        if (frameType && result.allowedIn) {
            if ((result.allowedIn instanceof Array && !result.allowedIn.some(function (type) { return frameType === Container.resolveType(type); })) ||
                        (!(result.allowedIn instanceof Array) && frameType !== Container.resolveType(result.allowedIn))) {
                Guard.raise(new Exception(operator + " not supported in: " + frameType.name));
            }
        }
        result.name = operator;
        return result;
    },

    supportedSetOperations: {
        value: {
            toArray: { invokable: true, allowedIn: [] }
        },
        enumerable: true,
        writable: true
    },
    resolveSetOperations: function (operation, expression, frameType) {
        var result = this.supportedSetOperations[operation];
        if (!result) {
            Guard.raise(new Exception("Operation '" + operation + "' is not supported by the provider"));
        };
        var allowedIn = result.allowedIn || [];
        if (frameType && allowedIn) {
            if ((allowedIn instanceof Array && !allowedIn.some(function (type) { return frameType === Container.resolveType(type); })) ||
                        (!(allowedIn instanceof Array) && frameType !== Container.resolveType(allowedIn))) {
                Guard.raise(new Exception(operation + " not supported in: " + frameType.name));
            }
        }
        return result;
    },

    resolveTypeOperations: function (operation, expression, frameType) {
        Guard.raise(new Exception("Entity '" + expression.entityType.name + "' Operation '" + operation + "' is not supported by the provider"));
    },

    resolveContextOperations: function (operation, expression, frameType) {
        Guard.raise(new Exception("Context '" + expression.instance.getType().name + "' Operation '" + operation + "' is not supported by the provider"));
    },

    makePhysicalTypeDefinition: function (entityDefinition, association) {
    },

    _beginTran: function (tables, isWrite, callBack) {
        callBack.success(new $data.Transaction());
    },

    getFieldUrl: function () {
        return '#';
    },

    supportedAutoincrementKeys: {
        value: { }
    }
},
{
    onRegisterProvider: { value: new $data.Event() },
    registerProvider: function (name, provider) {
        this.onRegisterProvider.fire({ name: name, provider: provider }, this);
        $data.RegisteredStorageProviders = $data.RegisteredStorageProviders || [];
        $data.RegisteredStorageProviders[name] = provider;
    },
    getProvider: function (name) {
        var provider = $data.RegisteredStorageProviders[name];
        if (!provider)
            console.warn("Provider not found: '" + name + "'");
        return provider;
        /*var provider = $data.RegisteredStorageProviders[name];
        if (!provider)
            Guard.raise(new Exception("Provider not found: '" + name + "'", "Not Found"));
        return provider;*/
    },
    isSupported: {
        get: function () { return true; },
        set: function () { }
    }
});
$data.Class.define('$data.ServiceOperation', null, null, {}, {
    translateDefinition: function (propertyDef, name, definedBy) {
        propertyDef.serviceName = name;
        var memDef = new $data.MemberDefinition(this.generateServiceOperation(propertyDef), this);
        memDef.name = name;
        return memDef;
    },
    generateServiceOperation: function (cfg) {

        var fn;
        if (cfg.serviceMethod) {
            var returnType = cfg.returnType ? Container.resolveType(cfg.returnType) : {};
            if (returnType.isAssignableTo && returnType.isAssignableTo($data.Queryable)) {
                fn = cfg.serviceMethod;
            } else {
                fn = function () {
                    var lastParam = arguments[arguments.length - 1];

                    var pHandler = new $data.PromiseHandler();
                    var cbWrapper;

                    var args = arguments;
                    if (typeof lastParam === 'function') {
                        cbWrapper = pHandler.createCallback(lastParam);
                        arguments[arguments.length - 1] = cbWrapper;
                    } else {
                        cbWrapper = pHandler.createCallback();
                        arguments.push(cbWrapper);
                    }

                    try {
                        var result = cfg.serviceMethod.apply(this, arguments);
                        if (result !== undefined)
                            cbWrapper.success(result);
                    } catch (e) {
                        cbWrapper.error(e);
                    }

                    return pHandler.getPromise();
                }
            }

        } else {
            fn = function () {
                var context = this;
                var memberdef;

                var boundItem;
                if (this instanceof $data.Entity || this instanceof $data.EntitySet) {
                    var entitySet;
                    if (this instanceof $data.Entity) {
                        if (this.context) {
                            context = this.context;
                            entitySet = context.getEntitySetFromElementType(this.getType());
                        } else if (this.storeToken && typeof this.storeToken.factory === 'function') {
                            context = this.storeToken.factory();
                            entitySet = context.getEntitySetFromElementType(this.getType());
                        } else {
                            Guard.raise(new Exception("entity can't resolve context", 'Not Found!', this));
                            return;
                        }
                    } else if (this instanceof $data.EntitySet) {
                        context = this.entityContext;
                        entitySet = this;

                        var esDef = context.getType().getMemberDefinition(entitySet.name);
                        memberdef = $data.MemberDefinition.translateDefinition(esDef.actions[cfg.serviceName], cfg.serviceName, entitySet.getType());
                    }


                    boundItem = {
                        data: this,
                        entitySet: entitySet
                    };
                }

                var virtualEntitySet = cfg.elementType ? context.getEntitySetFromElementType(Container.resolveType(cfg.elementType)) : null;

                var paramConstExpression = null;
                if (cfg.params) {
                    paramConstExpression = [];
                    //object as parameter
                    if (arguments[0] && typeof arguments[0] === 'object' && arguments[0].constructor === $data.Object && cfg.params && cfg.params[0] && cfg.params[0].name in arguments[0]) {
                        var argObj = arguments[0];
                        for (var i = 0; i < cfg.params.length; i++) {
                            var paramConfig = cfg.params[i];
                            if (paramConfig.name && paramConfig.type && paramConfig.name in argObj) {
                                paramConstExpression.push(Container.createConstantExpression(argObj[paramConfig.name], Container.resolveType(paramConfig.type), paramConfig.name));
                            }
                        }
                    }
                    //arg params
                    else {
                        for (var i = 0; i < cfg.params.length; i++) {
                            if (typeof arguments[i] == 'function') break;

                            //TODO: check params type
                            var paramConfig = cfg.params[i];
                            if (paramConfig.name && paramConfig.type && arguments[i] !== undefined) {
                                paramConstExpression.push(Container.createConstantExpression(arguments[i], Container.resolveType(paramConfig.type), paramConfig.name));
                            }
                        }
                    }
                }

                var ec = Container.createEntityContextExpression(context);
                if (!memberdef) {
                    if (boundItem && boundItem.data) {
                        memberdef = boundItem.data.getType().getMemberDefinition(cfg.serviceName);
                    } else {
                        memberdef = context.getType().getMemberDefinition(cfg.serviceName);
                    }
                }
                var es = Container.createServiceOperationExpression(ec,
                        Container.createMemberInfoExpression(memberdef),
                        paramConstExpression,
                        cfg,
                        boundItem);

                //Get callback function
                var clb = arguments[arguments.length - 1];
                if (!(typeof clb === 'function' || (typeof clb === 'object' /*&& clb.constructor === $data.Object*/ && (typeof clb.success === 'function' || typeof clb.error === 'function')))) {
                    clb = undefined;
                }

                if (virtualEntitySet) {
                    var q = Container.createQueryable(virtualEntitySet, es);
                    if (clb) {
                        es.isTerminated = true;
                        return q._runQuery(clb);
                    }
                    return q;
                }
                else {
                    var returnType = cfg.returnType ? Container.resolveType(cfg.returnType) : null;

                    var q = Container.createQueryable(context, es);
                    q.defaultType = returnType || $data.Object;

                    if (returnType === $data.Queryable) {
                        q.defaultType = Container.resolveType(cfg.elementType);
                        if (clb) {
                            es.isTerminated = true;
                            return q._runQuery(clb);
                        }
                        return q;
                    }
                    es.isTerminated = true;
                    return q._runQuery(clb);
                }
            };
        };

        var params = cfg.params || [];
        $data.typeSystem.extend(fn, cfg, { params: params });

        return fn;
    }
});

$data.Class.define('$data.ServiceAction', $data.ServiceOperation, null, {}, {
    generateServiceOperation: function (cfg) {
        if (!cfg.method) {
            cfg.method = 'POST'; //default Action method is POST
        }

        return $data.ServiceOperation.generateServiceOperation.apply(this, arguments);
    }
});$data.Base.extend('$data.EntityWrapper', {
    getEntity: function () {
        Guard.raise("pure object");
    }
});
if (typeof jQuery !== 'undefined' && jQuery.ajax) {
    $data.ajax = $data.ajax || jQuery.ajax;
}

if (typeof WinJS !== 'undefined' && WinJS.xhr) {
    $data.ajax = $data.ajax || function (options) {
        $data.typeSystem.extend(options, {
            dataType: 'json',
            headers: {}
        });
        var dataTypes = {
            'json': {
                accept: 'application/json, text/javascript',
                convert: JSON.parse
            },
            'text': {
                accept: 'text/plain',
                convert: function (e) { return e; }
            },
            'html': {
                accept: 'text/html',
                convert: function (e) { return e; }
            },
            'xml': {
                accept: 'application/xml, text/xml',
                convert: function (e) {
                    // TODO?
                    return e;
                }
            }
        }
        var dataTypeContext = dataTypes[options.dataType.toLowerCase()];

        options.headers.Accept = dataTypeContext.accept;

        var successClb = options.success || $data.defaultSuccessCallback;
        var errorClb = options.error || $data.defaultErrorCallback;
        var progressClb = options.progress;

        var success = function (r) {
            var result = dataTypeContext.convert(r.responseText);
            successClb(result);
        }
        var error = function (r) {
            var error = dataTypeContext.convert(r.responseText);
            errorClb(error);
        }
        var progress = progressClb;

        WinJS.xhr(options)
        .done(success, error, progress);
    }
}

if (typeof Ext !== 'undefined' && typeof Ext.Ajax) {
    $data.ajax = $data.ajax || function (options) {
        Ext.Ajax.request(options);
    };
}

$data.ajax = $data.ajax || function () {
    var cfg = arguments[arguments.length - 1];
    var clb = $data.typeSystem.createCallbackSetting(cfg);
    clb.error("Not implemented");
};


$C('$data.modelBinder.FindProjectionVisitor', $data.Expressions.EntityExpressionVisitor, null, {
    VisitProjectionExpression: function (expression) {
        this.projectionExpression = expression;
    }
});

$C('$data.modelBinder.ModelBinderConfigCompiler', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (query, includes, oDataProvider) {
        this._query = query;
        this._includes = includes;
        this._isoDataProvider = oDataProvider || false;
    },
    VisitSingleExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitSomeExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitFindExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitEveryExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitToArrayExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitFirstExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitForEachExpression: function (expression) {
        this._defaultModelBinder(expression);
    },
    VisitServiceOperationExpression: function (expression) {
        if (expression.cfg.returnType) {
            var returnType = Container.resolveType(expression.cfg.returnType);
            if ((typeof returnType.isAssignableTo === 'function' && returnType.isAssignableTo($data.Queryable)) || returnType === $data.Array) {
                this._defaultModelBinder(expression);
            } else {
                var builder = Container.createqueryBuilder();
                builder.modelBinderConfig['$type'] = returnType;
                if (typeof returnType.isAssignableTo === 'function' && returnType.isAssignableTo($data.Entity)) {
                    builder.modelBinderConfig['$selector'] = ['json:' + expression.cfg.serviceName];
                } else {
                    builder.modelBinderConfig['$type'] = returnType;
                    builder.modelBinderConfig['$value'] = function (a, v) {
                        return (expression.cfg.serviceName in v) ? v[expression.cfg.serviceName] : v.value;
                    }
                }
                this.VisitExpression(expression, builder);
                builder.resetModelBinderProperty();
                this._query.modelBinderConfig = builder.modelBinderConfig;
            }
        }
    },
    VisitCountExpression: function (expression) {
        var builder = Container.createqueryBuilder();

        builder.modelBinderConfig['$type'] = $data.Array;
        builder.selectModelBinderProperty('$item');
        builder.modelBinderConfig['$type'] = $data.Integer;
        builder.modelBinderConfig['$source'] = 'cnt';
        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    VisitBatchDeleteExpression: function (expression) {
        var builder = Container.createqueryBuilder();

        builder.modelBinderConfig['$type'] = $data.Array;
        builder.selectModelBinderProperty('$item');
        builder.modelBinderConfig['$type'] = $data.Integer;
        builder.modelBinderConfig['$source'] = 'cnt';
        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    VisitConstantExpression: function (expression, builder) {
        builder.modelBinderConfig['$type'] = expression.type;
        builder.modelBinderConfig['$value'] = expression.value;
    },

    VisitExpression: function (expression, builder) {
        var projVisitor = Container.createFindProjectionVisitor();
        projVisitor.Visit(expression);

        if (projVisitor.projectionExpression) {
            this.Visit(projVisitor.projectionExpression, builder);
        } else {
            this.DefaultSelection(builder, this._query.defaultType, this._includes);
        }
    },
    _defaultModelBinder: function (expression) {
        var builder = Container.createqueryBuilder();
        builder.modelBinderConfig['$type'] = $data.Array;
        if (this._isoDataProvider) {
            builder.modelBinderConfig['$selector'] = ['json:d.results', 'json:d', 'json:results'];
        }
        builder.modelBinderConfig['$item'] = {};
        builder.selectModelBinderProperty('$item');

        this.VisitExpression(expression, builder);

        builder.resetModelBinderProperty();
        this._query.modelBinderConfig = builder.modelBinderConfig;
    },
    _addPropertyToModelBinderConfig: function (elementType, builder) {
        var storageModel = this._query.context._storageModel.getStorageModel(elementType);
        if (elementType.memberDefinitions) {
            elementType.memberDefinitions.getPublicMappedProperties().forEach(function (prop) {
                if ((!storageModel) || (storageModel && !storageModel.Associations[prop.name] && !storageModel.ComplexTypes[prop.name])) {

                    var type = Container.resolveType(prop.dataType);
                    if (!storageModel && this._query.context.storageProvider.supportedDataTypes.indexOf(type) < 0) {
                        //complex type
                        builder.selectModelBinderProperty(prop.name);
                        builder.modelBinderConfig['$type'] = type;
                        if (this._isoDataProvider) {
                            builder.modelBinderConfig['$selector'] = ['json:' + prop.name + '.results', 'json:' + prop.name];
                        } else {
                            builder.modelBinderConfig['$selector'] = 'json:' + prop.name;
                        }
                        this._addPropertyToModelBinderConfig(type, builder);
                        builder.popModelBinderProperty();
                    } else {
                        if (prop.key) {
                            builder.addKeyField(prop.name);
                        }
                        if (prop.concurrencyMode === $data.ConcurrencyMode.Fixed) {
                            builder.modelBinderConfig[prop.name] = { $selector: 'json:__metadata', $source: 'etag' }
                        } else if (type === $data.Array && prop.elementType) {
                            builder.selectModelBinderProperty(prop.name);
                            builder.modelBinderConfig['$type'] = type;
                            if (this._isoDataProvider) {
                                builder.modelBinderConfig['$selector'] = ['json:' + prop.name + '.results', 'json:' + prop.name];
                            } else {
                                builder.modelBinderConfig['$selector'] = 'json:' + prop.name;
                            }
                            builder.selectModelBinderProperty('$item');
                            var arrayElementType = Container.resolveType(prop.elementType);
                            builder.modelBinderConfig['$type'] = arrayElementType;
                            this._addPropertyToModelBinderConfig(arrayElementType, builder);
                            builder.popModelBinderProperty();
                            builder.popModelBinderProperty();
                        } else {
                            builder.modelBinderConfig[prop.name] = prop.name;
                        }
                    }
                }
            }, this);
        } else {
            /*builder._binderConfig = {
                $selector: ['json:results'],
                $type: $data.Array,
                $item:{
                    $type: elementType,
                    $value: function (meta, data) { return data; }
                }
            }*/
            builder._binderConfig.$item = builder._binderConfig.$item || {};
            builder.modelBinderConfig = builder._binderConfig.$item;


            
        }
        if (storageModel) {
            this._addComplexTypeProperties(storageModel.ComplexTypes, builder);
        }
    },
    _addComplexTypeProperties: function (complexTypes, builder) {
        complexTypes.forEach(function (ct) {
            if (ct.ToType !== $data.Array){
                builder.selectModelBinderProperty(ct.FromPropertyName);
                builder.modelBinderConfig['$type'] = ct.ToType;
                if (this._isoDataProvider) {
                    builder.modelBinderConfig['$selector'] = ['json:' + ct.FromPropertyName + '.results', 'json:' + ct.FromPropertyName];
                } else {
                    builder.modelBinderConfig['$selector'] = 'json:' + ct.FromPropertyName;
                }
                this._addPropertyToModelBinderConfig(ct.ToType, builder);

                builder.popModelBinderProperty();
            }else{
                var dt = ct.ToType;
                var et = Container.resolveType(ct.FromType.memberDefinitions.getMember(ct.FromPropertyName).elementType);
                if (dt === $data.Array && et && et.isAssignableTo && et.isAssignableTo($data.Entity)){
                    config = {
                        $type: $data.Array,
                        $selector: 'json:' + ct.FromPropertyName,
                        $item: {
                            $type: et
                        }
                    };
                    var md = et.memberDefinitions.getPublicMappedProperties();
                    for (var i = 0; i < md.length; i++){
                        config.$item[md[i].name] = { $type: md[i].type, $source: md[i].name };
                    }
                    builder.modelBinderConfig[ct.FromPropertyName] = config;
                }else{
                    builder.modelBinderConfig[ct.FromPropertyName] = {
                        $type: ct.ToType,
                        $source: ct.FromPropertyName
                    };
                }
            }
        }, this);
    },
    DefaultSelection: function (builder, type, allIncludes) {
        //no projection, get all item from entitySet
        builder.modelBinderConfig['$type'] = type;

        var storageModel = this._query.context._storageModel.getStorageModel(type);
        this._addPropertyToModelBinderConfig(type, builder);
        if (allIncludes) {
            allIncludes.forEach(function (include) {
                var includes = include.name.split('.');
                var association = null;
                var tmpStorageModel = storageModel;
                var itemCount = 0;
                for (var i = 0; i < includes.length; i++) {
                    if (builder.modelBinderConfig.$item) {
                        builder.selectModelBinderProperty('$item');
                        itemCount++;
                    }
                    builder.selectModelBinderProperty(includes[i]);
                    association = tmpStorageModel.Associations[includes[i]];
                    tmpStorageModel = this._query.context._storageModel.getStorageModel(association.ToType);
                }
                if (this._isoDataProvider) {
                    builder.modelBinderConfig['$selector'] = ['json:' + includes[includes.length - 1] + '.results', 'json:' + includes[includes.length - 1]];
                } else {
                    builder.modelBinderConfig['$selector'] = 'json:' + includes[includes.length - 1];
                }
                if (association.ToMultiplicity === '*') {
                    builder.modelBinderConfig['$type'] = $data.Array;
                    builder.selectModelBinderProperty('$item');
                    builder.modelBinderConfig['$type'] = include.type;
                    this._addPropertyToModelBinderConfig(include.type, builder);
                    builder.popModelBinderProperty();
                } else {
                    builder.modelBinderConfig['$type'] = include.type;
                    this._addPropertyToModelBinderConfig(include.type, builder);
                }

                for (var i = 0; i < includes.length + itemCount; i++) {
                    builder.popModelBinderProperty();
                }
            }, this);
        }
    },
    VisitProjectionExpression: function (expression, builder) {
        this.hasProjection = true;
        this.Visit(expression.selector, builder);

        if (expression.selector && expression.selector.expression instanceof $data.Expressions.ObjectLiteralExpression) {
            builder.modelBinderConfig['$type'] = expression.projectionAs || builder.modelBinderConfig['$type'] || $data.Object;
        }
    },
    VisitParametricQueryExpression: function (expression, builder) {
        if (expression.expression instanceof $data.Expressions.EntityExpression || expression.expression instanceof $data.Expressions.EntitySetExpression) {
            this.VisitEntityAsProjection(expression, builder);
        } else {
            this.Visit(expression.expression, builder);
        }

    },
    VisitEntityAsProjection: function (expression, builder) {
        this.mapping = '';
        this.Visit(expression.expression, builder);
        var includes;
        if (this.mapping && this._includes instanceof Array) {
            includes = this._includes.filter(function (inc) {
                return inc.name.indexOf(this.mapping + '.') === 0
            }, this);
            includes = includes.map(function (inc) {
                return { name: inc.name.replace(this.mapping + '.', ''), type: inc.type };
            }, this);

            if (includes.length > 0){
                this.DefaultSelection(builder, expression.expression.entityType, includes);
                //console.warn('WARN: include for mapped properties is not supported!');
            }
        }

        if (expression.expression instanceof $data.Expressions.EntityExpression) {
            this.DefaultSelection(builder, expression.expression.entityType/*, includes*/)
        } else if (expression.expression instanceof $data.Expressions.EntitySetExpression) {
            builder.modelBinderConfig.$type = $data.Array;
            builder.modelBinderConfig.$item = {};
            builder.selectModelBinderProperty('$item');
            this.DefaultSelection(builder, expression.expression.elementType /*, includes*/)
            builder.popModelBinderProperty();
        }

    },

    VisitEntityFieldExpression: function (expression, builder) {
        this.Visit(expression.source, builder);
        this.Visit(expression.selector, builder);
    },
    VisitMemberInfoExpression: function (expression, builder) {
        builder.modelBinderConfig['$type'] = expression.memberDefinition.type;
        if (expression.memberDefinition.storageModel && expression.memberName in expression.memberDefinition.storageModel.ComplexTypes) {
            this._addPropertyToModelBinderConfig(Container.resolveType(expression.memberDefinition.type), builder);
        } else {
            if (!(builder.modelBinderConfig.$type && Container.resolveType(builder.modelBinderConfig.$type).isAssignableTo && Container.resolveType(builder.modelBinderConfig.$type).isAssignableTo($data.Entity)))
                builder.modelBinderConfig['$source'] = expression.memberName;
        }
    },
    VisitEntitySetExpression: function (expression, builder) {
        if (expression.source instanceof $data.Expressions.EntityExpression) {
            this.Visit(expression.source, builder);
            this.Visit(expression.selector, builder);
        }

    },
    VisitComplexTypeExpression: function (expression, builder) {
        this.Visit(expression.source, builder);
        this.Visit(expression.selector, builder);


        if (('$selector' in builder.modelBinderConfig) && (builder.modelBinderConfig.$selector.length > 0)) {
            if (builder.modelBinderConfig.$selector instanceof $data.Array) {
                var temp = builder.modelBinderConfig.$selector[1];
                builder.modelBinderConfig.$selector[0] = temp + '.' + expression.selector.memberName + '.results';
                builder.modelBinderConfig.$selector[1] = temp + '.' + expression.selector.memberName;
            } else {
                builder.modelBinderConfig.$selector += '.' + expression.selector.memberName;
            }

        } else {
            if (this._isoDataProvider) {
                builder.modelBinderConfig['$selector'] = ['json:' + expression.selector.memberName + '.results', 'json:' + expression.selector.memberName];
            } else {
                builder.modelBinderConfig['$selector'] = 'json:' + expression.selector.memberName;
            }
        }
    },
    VisitEntityExpression: function (expression, builder) {
        this.Visit(expression.source, builder);
    },
    VisitAssociationInfoExpression: function (expression, builder) {
        if (('$selector' in builder.modelBinderConfig) && (builder.modelBinderConfig.$selector.length > 0)) {
            if (builder.modelBinderConfig.$selector instanceof $data.Array) {
                var temp = builder.modelBinderConfig.$selector[1];
                builder.modelBinderConfig.$selector[0] = temp + '.' + expression.associationInfo.FromPropertyName + '.results';
                builder.modelBinderConfig.$selector[1] = temp + '.' + expression.associationInfo.FromPropertyName;
            } else {
                builder.modelBinderConfig.$selector += '.' + expression.associationInfo.FromPropertyName;
            }

        } else {
            if (this._isoDataProvider) {
                builder.modelBinderConfig['$selector'] = ['json:' + expression.associationInfo.FromPropertyName + '.results', 'json:' + expression.associationInfo.FromPropertyName];
            } else {
                builder.modelBinderConfig['$selector'] = 'json:' + expression.associationInfo.FromPropertyName;
            }
        }

        if (this.mapping && this.mapping.length > 0) { this.mapping += '.'; }
        this.mapping += expression.associationInfo.FromPropertyName;
    },
    VisitObjectLiteralExpression: function (expression, builder) {
        builder.modelBinderConfig['$type'] = $data.Object;
        expression.members.forEach(function (of) {
            this.Visit(of, builder);
        }, this);
    },
    VisitObjectFieldExpression: function (expression, builder) {
        builder.selectModelBinderProperty(expression.fieldName);
        if (expression.expression instanceof $data.Expressions.EntityExpression || expression.expression instanceof $data.Expressions.EntitySetExpression) {
            this.VisitEntityAsProjection(expression, builder);
        } else {
            this.Visit(expression.expression, builder);
        }
        builder.popModelBinderProperty();
    }
});
$data.Class.define("$data.Authentication.AuthenticationBase", null, null, {
    constructor: function (cfg) {
        this.configuration = cfg || {};
        this.Authenticated = false;
    },
    /// { error:, abort:, pending:, success: }
    Login: function (callbacks) {
         Guard.raise("Pure class");
    },
    Logout: function () {
        Guard.raise("Pure class");
    },
    CreateRequest: function (cfg) {
        Guard.raise("Pure class");
    }

}, null);$data.Class.define("$data.Authentication.Anonymous", $data.Authentication.AuthenticationBase, null, {
    constructor: function (cfg) {
        this.configuration = cfg || {};
        this.Authenticated = false;
    },
    /// { error:, abort:, pending:, success: }
    Login: function (callbacks) {
    },
    Logout: function () {
    },
    CreateRequest: function (cfg) {
        $data.ajax(cfg);
    }

}, null);$data.Class.define("$data.Authentication.FacebookAuth", $data.Authentication.AuthenticationBase, null, {
    constructor: function (cfg) {
        this.configuration = $data.typeSystem.extend({
            Url_code: '',
            type_code: '',
            scope: '',
            Url_token: '',
            type_token: '',
            access_token: '',
            app_id: ''
        }, cfg);
    },
    Login: function (callbacks) {
        if (this.Authenticated) {
            return;
        }

        var provider = this;
        provider.configuration.stateCallbacks = callbacks || {};

        $data.ajax({
            url: this.configuration.Url_code,
            data: 'type=' + provider.configuration.type_code + '&client_id=' + provider.configuration.app_id + '&scope=' + provider.configuration.scope,
            type: 'POST',
            dataType: 'json',
            success: function (data) {
                if (typeof provider.configuration.stateCallbacks.pending == "function")
                    provider.configuration.stateCallbacks.pending(data);
                provider._processRequestToken(data);
                provider.Authenticated = true;
            },
            error: function () {
                if (typeof provider.configuration.stateCallbacks.error == "function")
                    provider.configuration.stateCallbacks.error(arguments);
            }
        });
    },
    Logout: function () {
        this.Authenticated = false;
    },
    CreateRequest: function (cfg) {
        if (!cfg)
            return;
        var _this = this;

        if (cfg.url.indexOf('access_token=') === -1) {
            if (cfg.url && this.Authenticated) {
                var andChar = '?';
                if (cfg.url.indexOf(andChar) > 0)
                    andChar = '&';

                if (this.configuration.access_token)
                    cfg.url = cfg.url + andChar + 'access_token=' + this.configuration.access_token;
            }
        }

        $data.ajax(cfg);
    },
    _processRequestToken: function (verification_data) {
        var provider = this;

        $data.ajax({
            url: provider.configuration.Url_token,
            data: 'type=' + provider.configuration.type_token + '&client_id=' + provider.configuration.app_id + '&code=' + verification_data.code,
            type: 'POST',
            dataType: 'json',
            success: function(result) {
                provider.configuration.access_token = result.access_token;
                if (typeof provider.configuration.stateCallbacks.success == "function")
                    provider.configuration.stateCallbacks.success(result);
            },
            error: function(obj) {
                var data = eval('(' + obj.responseText + ')');
                if (data.error) {
                    if (data.error.message == "authorization_pending") {
                        setTimeout(function() {
                            provider._processRequestToken(verification_data);
                        }, 2000);
                    } else if ("authorization_declined") {
                        if (typeof provider.configuration.stateCallbacks.abort == "function")
                            provider.configuration.stateCallbacks.abort(arguments);
                    }
                }
            }
        });
    }
}, null);$data.Class.define("$data.Authentication.BasicAuth.BasicAuth", $data.Authentication.AuthenticationBase, null, {
    constructor: function (cfg) {
        this.configuration = $data.typeSystem.extend({
            Username: '',
            Password: ''
        }, cfg);
    },
    Login: function (callbacks) {
        if (callbacks && typeof callbacks.pending == "function")
            callbacks.pending();
    },
    Logout: function () {
    },
    CreateRequest: function (cfg) {
        if (!cfg)
            return;
        var _this = this;

        var origBeforeSend = cfg.beforeSend;
        cfg.beforeSend = function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic  " + _this.__encodeBase64(_this.configuration.Username + ":" + _this.configuration.Password));

            if(typeof origBeforeSend == "function")
                origBeforeSend(xhr);
        };
        
        $data.ajax(cfg);
    },
    __encodeBase64: function (val) {
        var b64array = "ABCDEFGHIJKLMNOP" +
                           "QRSTUVWXYZabcdef" +
                           "ghijklmnopqrstuv" +
                           "wxyz0123456789+/" +
                           "=";

        input = val;
        var base64 = "";
        var hex = "";
        var chr1, chr2, chr3 = "";
        var enc1, enc2, enc3, enc4 = "";
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            base64 = base64 +
                        b64array.charAt(enc1) +
                        b64array.charAt(enc2) +
                        b64array.charAt(enc3) +
                        b64array.charAt(enc4);
            chr1 = chr2 = chr3 = "";
            enc1 = enc2 = enc3 = enc4 = "";
        } while (i < input.length);

        return base64;
    }
}, null);
$data.Class.define('$data.MetadataLoaderClass', null, null, {
    load: function (metadataUri, callBack, config) {
        
        var cnf = {
            EntityBaseClass: '$data.Entity',
            ContextBaseClass: '$data.EntityContext',
            AutoCreateContext: false,
            DefaultNamespace: ('ns' + Math.random()).replace('.', '') + metadataUri.replace(/[^\w]/g, "_"),
            ContextInstanceName: 'context',
            EntitySetBaseClass: '$data.EntitySet',
            CollectionBaseClass: 'Array',
            url: metadataUri,
            user: undefined,
            password: undefined,
            withCredentials: undefined,
            httpHeaders: undefined,

            typeFilter: '',
            navigation: true,
            generateKeys: true,
            dependentRelationsOnly: false
        };

        $data.typeSystem.extend( cnf, config || {});

        if (cnf.DefaultNamespace && cnf.DefaultNamespace.lastIndexOf('.') !== (cnf.DefaultNamespace.length - 1))
            cnf.DefaultNamespace += '.';

        this.factoryCache = this.factoryCache || {};
        callBack = $data.typeSystem.createCallbackSetting(callBack);

        if (metadataUri in this.factoryCache) {

            /*console.log("served from cache");
            console.dir(this.factoryCache[metadataUri]);*/
            callBack.success.apply({}, this.factoryCache[metadataUri]);
            return;
        }




        var metadataUri;
        if (cnf.url) {
            cnf.SerivceUri = cnf.url.replace('/$metadata', '');
            if (cnf.url.indexOf('/$metadata') === -1) {
                cnf.metadataUri = cnf.url.replace(/\/+$/, '') + '/$metadata';
            } else {
                cnf.metadataUri = cnf.url;
            }
        } else {
            callBack.error('metadata url is missing');
        }

        var self = this;
        self._loadXMLDoc(cnf, function (xml, response) {
            if (response.statusCode < 200 || response.statusCode > 299) {
                callBack.error(response);
                return;
            }

            var versionInfo = self._findVersion(xml);
            if (self.xsltRepoUrl) {
                console.log('XSLT: ' + self.xsltRepoUrl + self._supportedODataVersionXSLT)
                self._loadXMLDoc({ 
                    metadataUri: self.xsltRepoUrl + self._supportedODataVersionXSLT,
                    user: cnf.user,
                    password: cnf.password,
                    httpHeaders: cnf.httpHeaders
                }, function (xsl, response) {
                    if (response.statusCode < 200 || response.statusCode > 299) {
                        callBack.error(response);
                        return;
                    }
                    var text = response.responseText;
                    text = text.replace('xmlns:edm="@@VERSIONNS@@"', 'xmlns:edm="' + versionInfo.ns + '"');
                    text = text.replace('@@VERSION@@', versionInfo.version);

                    if (typeof ActiveXObject === 'undefined') {
                        var parser = new DOMParser();
                        xsl = parser.parseFromString(text, "text/xml");
                    } else {
                        xsl = new ActiveXObject("Microsoft.XMLDOM");
                        xsl.async = false;
                        xsl.loadXML(text);
                    }

                    self._transform(callBack, versionInfo, xml, xsl, cnf);
                });
            } else {
                self._transform(callBack, versionInfo, xml, undefined, cnf);
            }

        });
    },
    debugMode: { type: 'bool', value: false },
    xsltRepoUrl: { type: 'string', value: '' },

    createFactoryFunc: function (ctxType, cnf, versionInfo) {
        var self = this;
        return function (config) {
            if (ctxType) {
                var cfg = $data.typeSystem.extend({
                    name: 'oData',
                    oDataServiceHost: cnf.SerivceUri,
                    //maxDataServiceVersion: '',
                    user: cnf.user,
                    password: cnf.password,
                    withCredentials: cnf.withCredentials,
                    maxDataServiceVersion: versionInfo.maxVersion || '3.0'
                }, config)


                return new ctxType(cfg);
            } else {
                return null;
            }
        }
    },

    _transform: function (callBack, versionInfo, xml, xsl, cnf) {
        var self = this;
        var codeText = self._processResults(cnf.url, versionInfo, xml, xsl, cnf);

        try {
            eval(codeText);
        } catch (e) {
            callBack.error(new Exception('SyntaxError', 'Unexpected model', [e, codeText]));
            return;
        }

        var ctxType;
        if (!$data.generatedContexts || !(ctxType = $data.generatedContexts.pop())) {
            callBack.error(new Exception('No context found in service', 'Not found', [cnf, codeText]));
            return;
        }

        var factoryFn = self.createFactoryFunc(ctxType, cnf, versionInfo);
        this.factoryCache[cnf.url] = [factoryFn, ctxType];

        factoryFn.type = ctxType;

        if (self.debugMode) {
            factoryFn.codeText = codeText;
            callBack.success(factoryFn, ctxType, codeText);
        }
        else {
            callBack.success(factoryFn, ctxType);
        }
    },
    _loadXMLDoc: function (cnf, callback) {
        var that = this;
        if ($data.postMessageODataHandler) {

            if (cnf.user && cnf.password && (!cnf.httpHeaders || (cnf.httpHeaders && !cnf.httpHeaders['Authorization']))) {
                httpHeader = httpHeader || {};
                httpHeader["Authorization"] = "Basic " + this.__encodeBase64(cnf.user + ":" + cnf.password);
            }

            $data.postMessageODataHandler.requestProxy({
                url: cnf.metadataUri,
                httpHeaders: cnf.httpHeaders,
                success: function (response) {
                    var doc;
                    if (typeof module !== 'undefined' && typeof require !== 'undefined') {
                        doc = response.responseText;
                    } else if (window.ActiveXObject) {
                        doc = new ActiveXObject('Microsoft.XMLDOM');
                        doc.async = 'false';
                        doc.loadXML(response.responseText);
                    } else {
                        var parser = new DOMParser();
                        doc = parser.parseFromString(response.responseText, 'text/xml');
                    }

                    callback(doc, response);
                },
                error: function (e) {
                    that._loadXHTTP_XMLDoc(cnf, callback);
                }

            });

        } else {
            this._loadXHTTP_XMLDoc(cnf, callback);
        }
    },
    _loadXHTTP_XMLDoc: function (cnf, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", cnf.metadataUri, true);
        if (cnf.httpHeaders) {
            Object.keys(cnf.httpHeaders).forEach(function (header) {
                xhttp.setRequestHeader(header, cnf.httpHeaders[header]);
            });
        }
        xhttp.onreadystatechange = function () {
            if (xhttp.readyState === 4) {
                var response = { requestUri: cnf.metadataUri, statusCode: xhttp.status, statusText: xhttp.statusText, responseText: xhttp.responseText };
                callback(xhttp.responseXML || xhttp.responseText, response);
            }
        };

        if (cnf.user && cnf.password && (!cnf.httpHeaders || (cnf.httpHeaders && !cnf.httpHeaders['Authorization'])))
            xhttp.setRequestHeader("Authorization", "Basic " + this.__encodeBase64(cnf.user + ":" + cnf.password));

        xhttp.send("");
    },
    _processResults: function (metadataUri, versionInfo, metadata, xsl, cnf) {
        var transformXslt = this.getCurrentXSLTVersion(versionInfo, metadata);
        cnf.typeFilter = this._prepareTypeFilter(metadata, versionInfo, cnf);

        if (window.ActiveXObject) {
            var xslt = new ActiveXObject("Msxml2.XSLTemplate.6.0");
            var xsldoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument.6.0");
            var xslproc;
            xsldoc.async = false;
            if (xsl)
                xsldoc.load(xsl);
            else
                xsldoc.loadXML(transformXslt);
            if (xsldoc.parseError.errorCode != 0) {
                var myErr = xsldoc.parseError;
            } else {
                xslt.stylesheet = xsldoc;
                var xmldoc = new ActiveXObject("Msxml2.DOMDocument.6.0");
                xmldoc.async = false;
                xmldoc.load(metadata);
                if (xmldoc.parseError.errorCode != 0) {
                    var myErr = xmldoc.parseError;
                } else {
                    xslproc = xslt.createProcessor();
                    xslproc.input = xmldoc;

                    xslproc.addParameter('SerivceUri', cnf.SerivceUri);
                    xslproc.addParameter('EntityBaseClass', cnf.EntityBaseClass);
                    xslproc.addParameter('ContextBaseClass', cnf.ContextBaseClass);
                    xslproc.addParameter('AutoCreateContext', cnf.AutoCreateContext);
                    xslproc.addParameter('ContextInstanceName', cnf.ContextInstanceName);
                    xslproc.addParameter('EntitySetBaseClass', cnf.EntitySetBaseClass);
                    xslproc.addParameter('CollectionBaseClass', cnf.CollectionBaseClass);
                    xslproc.addParameter('DefaultNamespace', cnf.DefaultNamespace);
                    xslproc.addParameter('MaxDataserviceVersion', versionInfo.maxVersion || '3.0');
                    xslproc.addParameter('AllowedTypesList', cnf.typeFilter);
                    xslproc.addParameter('GenerateNavigationProperties', cnf.navigation);

                    xslproc.transform();
                    return xslproc.output;
                }
            }
            return '';
        } else if (typeof document !== 'undefined' && document.implementation && document.implementation.createDocument) {
            var xsltStylesheet;
            if (xsl) {
                xsltStylesheet = xsl;
            } else {
                var parser = new DOMParser();
                xsltStylesheet = parser.parseFromString(transformXslt, "text/xml");
            }

            var xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xsltStylesheet);
            xsltProcessor.setParameter(null, 'SerivceUri', cnf.SerivceUri);
            xsltProcessor.setParameter(null, 'EntityBaseClass', cnf.EntityBaseClass);
            xsltProcessor.setParameter(null, 'ContextBaseClass', cnf.ContextBaseClass);
            xsltProcessor.setParameter(null, 'AutoCreateContext', cnf.AutoCreateContext);
            xsltProcessor.setParameter(null, 'ContextInstanceName', cnf.ContextInstanceName);
            xsltProcessor.setParameter(null, 'EntitySetBaseClass', cnf.EntitySetBaseClass);
            xsltProcessor.setParameter(null, 'CollectionBaseClass', cnf.CollectionBaseClass);
            xsltProcessor.setParameter(null, 'DefaultNamespace', cnf.DefaultNamespace);
            xsltProcessor.setParameter(null, 'MaxDataserviceVersion', versionInfo.maxVersion || '3.0');
            xsltProcessor.setParameter(null, 'AllowedTypesList', cnf.typeFilter);
            xsltProcessor.setParameter(null, 'GenerateNavigationProperties', cnf.navigation);
            resultDocument = xsltProcessor.transformToFragment(metadata, document);

            return resultDocument.textContent;
        } else if (typeof module !== 'undefined' && typeof require !== 'undefined') {
            var xslt = require('node_xslt');

            return xslt.transform(xslt.readXsltString(transformXslt), xslt.readXmlString(metadata), [
                'SerivceUri', "'" + cnf.SerivceUri + "'",
                'EntityBaseClass', "'" + cnf.EntityBaseClass + "'",
                'ContextBaseClass', "'" + cnf.ContextBaseClass + "'",
                'AutoCreateContext', "'" + cnf.AutoCreateContext + "'",
                'ContextInstanceName', "'" + cnf.ContextInstanceName + "'",
                'EntitySetBaseClass', "'" + cnf.EntitySetBaseClass + "'",
                'CollectionBaseClass', "'" + cnf.CollectionBaseClass + "'",
                'DefaultNamespace', "'" + cnf.DefaultNamespace + "'",
                'MaxDataserviceVersion', "'" + (versionInfo.maxVersion || '3.0') + "'",
                'AllowedTypesList', "'" + cnf.typeFilter + "'",
                'GenerateNavigationProperties', "'" + cnf.navigation + "'"
            ]);
        }
    },
    _prepareTypeFilter: function (doc, versionInfo, cnf) {
        var result = '';
        if (!(typeof doc === 'object' && "querySelector" in doc && "querySelectorAll" in doc))
            return result;

        var config = [];
        if (typeof cnf.typeFilter === 'object' && cnf.typeFilter) {
            var types = Object.keys(cnf.typeFilter);
            for (var i = 0; i < types.length; i++) {
                var cfg = cnf.typeFilter[types[i]];
                var typeData = {};
                if (typeof cfg === 'object' && cfg) {
                    if (Array.isArray(cfg)) {
                        typeData.Name = types[i];
                        typeData.Fields = cfg;
                    } else {
                        typeData.Name = cfg.name || types[i];
                        typeData.Fields = cfg.members || [];
                    }
                } else if (cfg) {
                    typeData.Name = types[i];
                    typeData.Fields = [];
                } else {
                    continue;
                }

                var typeShortName = typeData.Name;
                var containerName = "";
                if (typeData.Name.lastIndexOf('.') > 0)
                {
                    containerName = typeData.Name.substring(0, typeData.Name.lastIndexOf('.'));
                    typeShortName = typeData.Name.substring(typeData.Name.lastIndexOf('.') + 1);
                }

                var conainers = doc.querySelectorAll("EntityContainer[Name = '" + containerName + "']");
                for (var j = 0; j < conainers.length; j++) {
                    var entitySetDef = conainers[j].querySelector("EntitySet[Name = '" + typeShortName + "']");
                    if (entitySetDef != null)
                    {
                        typeData.Name = entitySetDef.attributes["EntityType"].value;
                        break;
                    }

                }

                config.push(typeData);
            }

            var discoveredData;
            if (cnf.dependentRelationsOnly) {
                discoveredData = this._discoverProperyDependencies(config, doc, cnf.navigation, cnf.generateKeys);
            } else {
                discoveredData = this._discoverTypeDependencies(config, doc, cnf.navigation, cnf.generateKeys);
            }

            var complex = doc.querySelectorAll("ComplexType");
            for (var i = 0; i < complex.length; i++)
            {
                var cns = complex[i].parentNode.attributes["Namespace"].value;
                var data = !cns ? complex[i].attributes["Name"].value : (cns + "." + complex[i].attributes["Name"].value);
                discoveredData.push({ Name: data, Fields: [] });
            }

            for (var i = 0; i < discoveredData.length; i++)
            {
                var row = discoveredData[i];
                if (row.Fields.length > 0) {
                    result += row.Name + ":" + row.Fields.join(",") + ";";
                }
                else {
                    result += row.Name + ";";
                }
            }

        }

        return result;
    },
    _discoverTypeDependencies: function (types, doc, withNavPropertis, withKeys) {
        var allowedTypes = [];
        var allowedTypeNames = [];
        var collect = [];

        for (var i = 0; i < types.length; i++)
        {
            var idx = collect.indexOf(types[i].Name);
            if(idx >= 0){
                collect.splice(idx, 1);
            }
            this._discoverType(types[i], doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys, true, collect);
        }

        for (var i = 0; i < collect.length; i++)
        {
            this._discoverType({ Name: collect[i], Fields: [] }, doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys, false, []);
        }

        return allowedTypes;
    },
    _discoverType: function(typeData, doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys, collectTypes, collectedTypes) {
        var typeName = typeData.Name;

        if (allowedTypeNames.indexOf(typeName) >= 0)
        {
            return;
        }
        console.log("Discover: " + typeName);

        var typeShortName = typeName;
        var typeNamespace = '';
        if (typeName.lastIndexOf('.') > 0)
        {
            typeNamespace = typeName.substring(0, typeName.lastIndexOf('.'));
            typeShortName = typeName.substring(typeName.lastIndexOf('.') + 1);
        }

        var schemaNode = doc.querySelector("Schema[Namespace = '" + typeNamespace + "']");
        if (schemaNode != null)
        {
            var typeNode = schemaNode.querySelector("EntityType[Name = '" + typeShortName + "'], ComplexType[Name = '" + typeShortName + "']");
            if (typeNode != null)
            {
                allowedTypes.push(typeData);
                allowedTypeNames.push(typeName);

                if (withKeys && typeData.Fields.length > 0) {
                    var keys = typeNode.querySelectorAll("Key PropertyRef");
                    if (keys != null)
                    {
                        for (var j = 0; j < keys.length; j++)
                        {
                            var keyField = keys[j].attributes["Name"].value;
                            if (typeData.Fields.indexOf(keyField) < 0)
                                typeData.Fields.splice(j, 0, keyField);
                        }
                    }
                }

                if (withNavPropertis)
                {
                    var navPropNodes = typeNode.querySelectorAll("NavigationProperty");
                    for (var j = 0; j < navPropNodes.length; j++)
                    {
                        var navProp = navPropNodes[j];
                        if (typeData.Fields.length == 0 || typeData.Fields.indexOf(navProp.attributes["Name"].value) >=0)
                        {

                            var FromRole = navProp.attributes["FromRole"].value;
                            var ToRole = navProp.attributes["ToRole"].value;

                            var association = schemaNode.querySelector("Association End[Role = '" + FromRole + "']:not([Type = '" + typeName + "'])");
                            if (association == null)
                            {
                                association = schemaNode.querySelector("Association End[Role = '" + ToRole + "']:not([Type = '" + typeName + "'])");
                            }

                            if (association != null)
                            {
                                var nav_type = association.attributes["Type"].value;

                                if (collectTypes)
                                {
                                    if (collectedTypes.indexOf(nav_type) < 0 && allowedTypeNames.indexOf(nav_type) < 0)
                                        collectedTypes.push(nav_type);
                                }
                                else
                                {
                                    this._discoverType({ Name: nav_type, Fields: [] }, doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys, false, collectedTypes);
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    _discoverProperyDependencies: function (types, doc, withNavPropertis, withKeys) {
        var allowedTypes = [];
        var allowedTypeNames = types.map(function(t) { return t.Name; });

        for (var i = 0; i < types.length; i++)
        {
            this._discoverProperties(types[i], doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys);
        }

        return allowedTypes;
    },
    _discoverProperties: function(typeData, doc, allowedTypes, allowedTypeNames, withNavPropertis, withKeys) {
        var typeName = typeData.Name;
        console.log("Discover: " + typeName);

        var hasProperty = typeData.Fields.length != 0;
        var typeShortName = typeName;
        var typeNamespace = '';
        if (typeName.lastIndexOf('.') > 0)
        {
            typeNamespace = typeName.substring(0, typeName.lastIndexOf('.'));
            typeShortName = typeName.substring(typeName.lastIndexOf('.') + 1);
        }

        var schemaNode = doc.querySelector("Schema[Namespace = '" + typeNamespace + "']");
        if (schemaNode != null)
        {
            var typeNode = schemaNode.querySelector("EntityType[Name = '" + typeShortName + "'], ComplexType[Name = '" + typeShortName + "']");
            if (typeNode != null)
            {
                allowedTypes.push(typeData);

                if (!hasProperty)
                {
                    var properties = typeNode.querySelectorAll("Property");
                    if (properties != null)
                    {
                        for (var j = 0; j < properties.length; j++)
                        {
                            var field = properties[j].attributes["Name"].value;
                            typeData.Fields.push(field);
                        }
                    }

                    if (withNavPropertis)
                    {
                        var navPropNodes = typeNode.querySelectorAll("NavigationProperty");
                        for (var j = 0; j < navPropNodes.length; j++)
                        {
                            var navProp = navPropNodes[j];
                            var nav_name = navProp.attributes["Name"].value;
                            var types = [ navProp.attributes["FromRole"].value, navProp.attributes["ToRole"].value ];

                            var nav_type = '';
                            for (var t = 0; t < types.length; t++)
                            {
                                var association = schemaNode.querySelector("Association End[Role = '" + types[t] + "']");
                                if (association != null)
                                {
                                    nav_type = association.attributes["Type"].value;
                                    if (nav_type != typeName || t == 1)
                                        break;
                                }
                            }

                            if (allowedTypeNames.indexOf(nav_type) >= 0)
                            {
                                typeData.Fields.push(nav_name);
                            }
                        }
                    }
                }
                else if (withKeys)
                {
                    var keys = typeNode.querySelectorAll("Key PropertyRef");
                    if (keys != null)
                    {
                        for (var j = 0; j < keys.length; j++)
                        {
                            var keyField = keys[j].attributes["Name"].value;
                            if (typeData.Fields.indexOf(keyField) < 0)
                                typeData.Fields.splice(j, 0, keyField);
                        }
                    }
                }
            }
        }
    },

    _findVersion: function (metadata) {
        var maxDSVersion = '';

        if (typeof metadata === 'object' && "getElementsByTagName" in metadata){
            var version = 'http://schemas.microsoft.com/ado/2008/09/edm';
            var item = metadata.getElementsByTagName('Schema');
            if (item)
                item = item[0];
            if (item)
                item = item.attributes;
            if (item)
                item = item.getNamedItem('xmlns');
            if (item)
                version = item.value;

            var maxDSVersion = metadata.getElementsByTagName('edmx:DataServices')[0] || metadata.getElementsByTagName('DataServices')[0];
            if (maxDSVersion)
                maxDSVersion = maxDSVersion.attributes.getNamedItem('m:MaxDataServiceVersion');
            if (maxDSVersion && version)
                maxDSVersion = maxDSVersion.value;


            var versionNum = this._supportedODataVersions[version];
            return {
                ns: version,
                version: versionNum || 'unknown',
                maxVersion: maxDSVersion || this._maxDataServiceVersions[version || 'unknown']
            };
        }else if (typeof module !== 'undefined' && typeof require !== 'undefined'){
            var schemaXml = metadata;
            
            var schemaNamespace = 'http://schemas.microsoft.com/ado/2008/09/edm';
            var version = 'nodejs';
            for (var i in this._supportedODataVersions){
                if (schemaXml.search(new RegExp('<Schema.+xmlns=\"' + i + '\"', 'gi')) >= 0){
                    schemaNamespace = i;
                    version = this._supportedODataVersions[i];
                    break;
                }
            }

            return {
                ns: schemaNamespace,
                version: version,
                maxVersion: this._maxDataServiceVersions[version || 'unknown']
            }
        }
    },
    _supportedODataVersions: {
        value: {
            "http://schemas.microsoft.com/ado/2006/04/edm": "V1",
            "http://schemas.microsoft.com/ado/2008/09/edm": "V2",
            "http://schemas.microsoft.com/ado/2009/11/edm": "V3",
            "http://schemas.microsoft.com/ado/2007/05/edm": "V11",
            "http://schemas.microsoft.com/ado/2009/08/edm": "V22"
        }
    },
    _maxDataServiceVersions: {
        value: {
            "http://schemas.microsoft.com/ado/2006/04/edm": "2.0",
            "http://schemas.microsoft.com/ado/2008/09/edm": "2.0",
            "http://schemas.microsoft.com/ado/2009/11/edm": "3.0",
            "http://schemas.microsoft.com/ado/2007/05/edm": "2.0",
            "http://schemas.microsoft.com/ado/2009/08/edm": "2.0"
        }
    },
    _supportedODataVersionXSLT: {
        value: "JayDataContextGenerator.xslt"
    },
    getCurrentXSLTVersion: function (versionInfo, metadata) {
        return this._metadataConverterXSLT.replace('@@VERSIONNS@@', versionInfo.ns).replace('@@VERSION@@', versionInfo.version);
    },
    __encodeBase64: function (val) {
        var b64array = "ABCDEFGHIJKLMNOP" +
                           "QRSTUVWXYZabcdef" +
                           "ghijklmnopqrstuv" +
                           "wxyz0123456789+/" +
                           "=";

        var input = val;
        var base64 = "";
        var hex = "";
        var chr1, chr2, chr3 = "";
        var enc1, enc2, enc3, enc4 = "";
        var i = 0;

        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            base64 = base64 +
                        b64array.charAt(enc1) +
                        b64array.charAt(enc2) +
                        b64array.charAt(enc3) +
                        b64array.charAt(enc4);
            chr1 = chr2 = chr3 = "";
            enc1 = enc2 = enc3 = enc4 = "";
        } while (i < input.length);

        return base64;
    },
    _metadataConverterXSLT: {
        type: 'string',
        value:
            "<xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" \r\n" +
            "                xmlns:edm=\"@@VERSIONNS@@\" \r\n" +
            "                xmlns:m=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\" \r\n" +
            "                xmlns:metadata=\"http://schemas.microsoft.com/ado/2007/08/dataservices/metadata\" \r\n" +
            "                xmlns:annot=\"http://schemas.microsoft.com/ado/2009/02/edm/annotation\" \r\n" +
            "                xmlns:exsl=\"http://exslt.org/common\" \r\n" +
            "                xmlns:msxsl=\"urn:schemas-microsoft-com:xslt\" exclude-result-prefixes=\"msxsl\">\r\n" +
            "\r\n" +
            "  <xsl:key name=\"entityType\" match=\"edm:EntityType\" use=\"concat(string(../@Namespace),'.', string(@Name))\"/>\r\n" +
            "  <xsl:key name=\"associations\" match=\"edm:Association\" use=\"concat(string(../@Namespace),'.', string(@Name))\"/>\r\n" +
            "\r\n" +
            "  <xsl:strip-space elements=\"property item unprocessed\"/>\r\n" +
            "  <xsl:output method=\"text\" indent=\"no\"  />\r\n" +
            "  <xsl:param name=\"contextNamespace\" />\r\n" +
            "\r\n" +
            "  <xsl:param name=\"SerivceUri\" />\r\n" +
            "  <xsl:param name=\"EntityBaseClass\"/>\r\n" +
            "  <xsl:param name=\"ContextBaseClass\"/>\r\n" +
            "  <xsl:param name=\"AutoCreateContext\"/>\r\n" +
            "  <xsl:param name=\"ContextInstanceName\"/>\r\n" +
            "  <xsl:param name=\"EntitySetBaseClass\"/>\r\n" +
            "  <xsl:param name=\"CollectionBaseClass\"/>\r\n" +
            "  <xsl:param name=\"DefaultNamespace\"/>\r\n" +
            "  <xsl:param name=\"MaxDataserviceVersion\"/>\r\n" +
            "  <xsl:param name=\"AllowedTypesList\" />\r\n" +
            "  <xsl:param name=\"GenerateNavigationProperties\" />\r\n" +
            "\r\n" +
            "  <xsl:param name=\"AllowedTypesListX\">Microsoft.Crm.Sdk.Data.Services.Product;Microsoft.Crm.Sdk.Data.Services.LeadAddress:Telephone1,City,UTCOffset;</xsl:param>\r\n" +
            "\r\n" +
            "  <xsl:variable name=\"fullmetadata\" select=\"/\" />\r\n" +
            "  \r\n" +
            "  <xsl:template name=\"createFieldsList\">\r\n" +
            "    <xsl:param name=\"fields\" />\r\n" +
            "    <!--<xsl:message terminate=\"no\">\r\n" +
            "      create field: @<xsl:value-of select=\"$fields\"/>@\r\n" +
            "    </xsl:message>-->\r\n" +
            "      <xsl:variable name=\"thisField\">\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"contains($fields,',')\">\r\n" +
            "            <xsl:value-of select=\"substring-before($fields, ',')\"/>\r\n" +
            "          </xsl:when>\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <xsl:value-of select=\"$fields\"/>\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:variable>\r\n" +
            "      <xsl:element name=\"field\">\r\n" +
            "        <xsl:attribute name=\"name\">\r\n" +
            "          <xsl:value-of select=\"$thisField\"/>\r\n" +
            "        </xsl:attribute> \r\n" +
            "      </xsl:element>\r\n" +
            "      <xsl:variable name=\"remaining\" select=\"substring($fields, string-length($thisField) + 2)\" />\r\n" +
            "      <xsl:if test=\"string-length($remaining) > 0\">\r\n" +
            "        <xsl:call-template name=\"createFieldsList\">\r\n" +
            "          <xsl:with-param name=\"fields\" select=\"$remaining\" />\r\n" +
            "        </xsl:call-template>\r\n" +
            "      </xsl:if>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template name=\"createType\">\r\n" +
            "    <xsl:param name=\"typeFull\" />\r\n" +
            "    <!--<xsl:message terminate=\"no\">\r\n" +
            "      create type: <xsl:value-of select=\"$typeFull\"/>\r\n" +
            "    </xsl:message>-->\r\n" +
            "    <xsl:variable name=\"typeName\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"contains($typeFull,':')\">\r\n" +
            "          <xsl:value-of select=\"substring-before($typeFull, ':') \"/>\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:value-of select=\"$typeFull\"/>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </xsl:variable>\r\n" +
            "    <xsl:variable name=\"fields\" select=\"substring($typeFull, string-length($typeName) + 2)\" />\r\n" +
            "    <xsl:element name=\"type\">\r\n" +
            "      <xsl:attribute name=\"name\">\r\n" +
            "        <xsl:value-of select=\"$typeName\"/>\r\n" +
            "      </xsl:attribute>\r\n" +
            "      <xsl:if test=\"string-length($fields) > 0\">\r\n" +
            "        <xsl:call-template name=\"createFieldsList\">\r\n" +
            "          <xsl:with-param name=\"fields\" select=\"$fields\" />\r\n" +
            "        </xsl:call-template>\r\n" +
            "      </xsl:if>\r\n" +
            "    </xsl:element>\r\n" +
            "  </xsl:template>\r\n" +
            "  \r\n" +
            "  <xsl:template name=\"createTypeList\">\r\n" +
            "    <xsl:param name=\"types\" />\r\n" +
            "    <!--<xsl:message terminate=\"no\">\r\n" +
            "      createTypeList: <xsl:value-of select=\"$types\"/>\r\n" +
            "    </xsl:message>-->\r\n" +
            "        \r\n" +
            "    <xsl:variable name=\"thisTypeFull\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"contains($types, ';')\">\r\n" +
            "          <xsl:value-of select=\"substring-before($types, ';')\"/>\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:value-of select=\"$types\"/>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </xsl:variable>\r\n" +
            "\r\n" +
            "    <xsl:if test=\"string-length($thisTypeFull) > 0\">\r\n" +
            "      <xsl:call-template name=\"createType\">\r\n" +
            "        <xsl:with-param name=\"typeFull\" select=\"$thisTypeFull\" />\r\n" +
            "      </xsl:call-template>\r\n" +
            "    </xsl:if>\r\n" +
            "    \r\n" +
            "    <xsl:variable name=\"remaining\" select=\"substring($types, string-length($thisTypeFull) + 2)\" />\r\n" +
            "    <!--<xsl:message terminate=\"no\">\r\n" +
            "      rem: @<xsl:value-of select=\"$remaining\"/>@  \r\n" +
            "    </xsl:message>-->\r\n" +
            "    \r\n" +
            "    <xsl:if test=\"string-length($remaining) > 0\">\r\n" +
            "      <xsl:call-template name=\"createTypeList\">\r\n" +
            "        <xsl:with-param name=\"types\" select=\"$remaining\" />\r\n" +
            "      </xsl:call-template>\r\n" +
            "    </xsl:if>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:variable name=\"allowedTypes\">\r\n" +
            "    <xsl:call-template name=\"createTypeList\">\r\n" +
            "      <xsl:with-param name=\"types\" select=\"$AllowedTypesList\" />\r\n" +
            "    </xsl:call-template>\r\n" +
            "  </xsl:variable>\r\n" +
            "  \r\n" +
            "\r\n" +
            "<!-- TODO EXSLT node-set -->\r\n" +
            "  <!--<xsl:variable name=\"hasTypeFilter\" select=\"boolean(count(msxsl:node-set($allowedTypes)/type) > 0)\"/>-->\r\n" +
            "  <xsl:variable name=\"hasTypeFilter\">\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"function-available('msxsl:node-set')\"><xsl:value-of select=\"boolean(count(msxsl:node-set($allowedTypes)/type) > 0)\"/></xsl:when>\r\n" +
            "      <xsl:otherwise><xsl:value-of select=\"boolean(count(exsl:node-set($allowedTypes)/type) > 0)\"/></xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:variable>\r\n" +
            "  <xsl:template match=\"/\">\r\n" +
            "\r\n" +
            "/*//////////////////////////////////////////////////////////////////////////////////////\r\n" +
            "////// Autogenerated by JaySvcUtil.exe http://JayData.org for more info        /////////\r\n" +
            "//////                             oData @@VERSION@@                                    /////////\r\n" +
            "//////////////////////////////////////////////////////////////////////////////////////*/\r\n" +
            "(function(global, $data, undefined) {\r\n" +
            "\r\n" +
            "    \r\n" +
            "<xsl:for-each select=\"//edm:EntityType | //edm:ComplexType\" xml:space=\"default\">\r\n" +
            "  <xsl:variable name=\"thisName\" select=\"concat(../@Namespace, '.', @Name)\" />\r\n" +
            "  <!-- TODO EXSLT node-set-->\r\n" +
            "  <!--<xsl:variable name=\"thisTypeNode\" select=\"msxsl:node-set($allowedTypes)/type[@name = $thisName]\" />-->\r\n" +
            "  <xsl:variable name=\"thisTypeNode\">\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "        <xsl:copy-of select=\"msxsl:node-set($allowedTypes)/type[@name = $thisName]\"/>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:copy-of select=\"exsl:node-set($allowedTypes)/type[@name = $thisName]\"/>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:variable>\r\n" +
            "  <xsl:variable name=\"thisTypeNodeExists\">\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "        <xsl:copy-of select=\"(count(msxsl:node-set($allowedTypes)/type[@name = $thisName]) > 0)\"/>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:copy-of select=\"(count(exsl:node-set($allowedTypes)/type[@name = $thisName]) > 0)\"/>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:variable>\r\n" +
            "  <!--<xsl:variable name=\"filterFields\" select=\"(count($thisTypeNode/field) > 0)\" />-->\r\n" +
            "  <xsl:variable name=\"filterFields\">\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "        <xsl:copy-of select=\"(count(msxsl:node-set($thisTypeNode)/type/field) > 0)\"/>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:copy-of select=\"(count(exsl:node-set($thisTypeNode)/type/field) > 0)\"/>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:variable>\r\n" +
            "  <xsl:if test=\"($hasTypeFilter = 'false') or ($thisTypeNodeExists = 'true')\">\r\n" +
            "\r\n" +
            "      <xsl:message terminate=\"no\">Info: generating type <xsl:value-of select=\"concat(../@Namespace, '.', @Name)\"/></xsl:message>\r\n" +
            "    \r\n" +
            "      <xsl:variable name=\"BaseType\">\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"@BaseType\">\r\n" +
            "            <xsl:value-of select=\"concat($DefaultNamespace,@BaseType)\"/>\r\n" +
            "          </xsl:when>\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <xsl:value-of select=\"$EntityBaseClass\"  />\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:variable>\r\n" +
            "\r\n" +
            "\r\n" +
            "     <xsl:variable name=\"props\">\r\n" +
            "       <xsl:for-each select=\"*[local-name() != 'NavigationProperty' or ($GenerateNavigationProperties = 'true' and local-name() = 'NavigationProperty')]\">\r\n" +
            "         <xsl:variable name=\"fname\" select=\"@Name\" />\r\n" +
            "         <xsl:variable name=\"isAllowedField\">\r\n" +
            "           <xsl:choose>\r\n" +
            "             <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "               <xsl:copy-of select=\"(count(msxsl:node-set($thisTypeNode)/type/field[@name = $fname]) > 0)\"/>\r\n" +
            "             </xsl:when>\r\n" +
            "             <xsl:otherwise>\r\n" +
            "               <xsl:copy-of select=\"(count(exsl:node-set($thisTypeNode)/type/field[@name = $fname]) > 0)\"/>\r\n" +
            "             </xsl:otherwise>\r\n" +
            "           </xsl:choose>\r\n" +
            "         </xsl:variable>\r\n" +
            "         <xsl:if test=\"($filterFields = 'false') or ($isAllowedField = 'true')\">\r\n" +
            "           <xsl:apply-templates select=\".\" />\r\n" +
            "         </xsl:if> \r\n" +
            "       </xsl:for-each>\r\n" +
            "      </xsl:variable>\r\n" +
            "    \r\n" +
            "      <xsl:text xml:space=\"preserve\">  </xsl:text><xsl:value-of select=\"$BaseType\"  />.extend('<xsl:value-of select=\"concat($DefaultNamespace,../@Namespace)\"/>.<xsl:value-of select=\"@Name\"/>', {\r\n" +
            "     <xsl:choose>\r\n" +
            "        <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "          <xsl:for-each select=\"msxsl:node-set($props)/*\">\r\n" +
            "            <xsl:value-of select=\".\"/>\r\n" +
            "            <xsl:if test=\"position() != last()\">\r\n" +
            "            <xsl:text>,&#10;     </xsl:text>  \r\n" +
            "            </xsl:if>\r\n" +
            "          </xsl:for-each>\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:for-each select=\"exsl:node-set($props)/*\">\r\n" +
            "            <xsl:value-of select=\".\"/>\r\n" +
            "            <xsl:if test=\"position() != last()\">,&#10;     </xsl:if>\r\n" +
            "          </xsl:for-each>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "      <xsl:variable name=\"currentName\"><xsl:value-of select=\"concat(../@Namespace,'.',@Name)\"/></xsl:variable>\r\n" +
            "      <xsl:for-each select=\"//edm:FunctionImport[@IsBindable and edm:Parameter[1]/@Type = $currentName]\"><xsl:if test=\"position() = 1\">,\r\n" +
            "      </xsl:if>\r\n" +
            "        <xsl:apply-templates select=\".\"></xsl:apply-templates><xsl:if test=\"position() != last()\">,\r\n" +
            "      </xsl:if>\r\n" +
            "      </xsl:for-each>\r\n" +
            "  });\r\n" +
            "\r\n" +
            "</xsl:if>\r\n" +
            "</xsl:for-each>\r\n" +
            "\r\n" +
            "<xsl:for-each select=\"//edm:EntityContainer\">\r\n" +
            "  <xsl:text xml:space=\"preserve\">  </xsl:text><xsl:value-of select=\"$ContextBaseClass\"  />.extend('<xsl:value-of select=\"concat(concat($DefaultNamespace,../@Namespace), '.', @Name)\"/>', {\r\n" +
            "     <!--or (@IsBindable = 'true' and (@IsAlwaysBindable = 'false' or @m:IsAlwaysBindable = 'false' or @metadata:IsAlwaysBindable = 'false'))-->\r\n" +
            "\r\n" +
            "   <xsl:variable name=\"subset\">\r\n" +
            "    <xsl:for-each select=\"edm:EntitySet | edm:FunctionImport\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "          <xsl:if test=\"($hasTypeFilter = 'false') or msxsl:node-set($allowedTypes)/type[@name = current()/@EntityType]\">\r\n" +
            "            <xsl:copy-of select=\".\"/>\r\n" +
            "          </xsl:if>\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:if test=\"($hasTypeFilter = 'false') or exsl:node-set($allowedTypes)/type[@name = current()/@EntityType]\">\r\n" +
            "            <xsl:copy-of select=\".\"/>\r\n" +
            "          </xsl:if>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </xsl:for-each>\r\n" +
            "  </xsl:variable>\r\n" +
            "\r\n" +
            "  \r\n" +
            "  <xsl:choose>\r\n" +
            "    <xsl:when test=\"function-available('msxsl:node-set')\">\r\n" +
            "      <xsl:for-each select=\"msxsl:node-set($subset)/*[local-name() != 'FunctionImport' or not(@IsBindable) or @IsBindable = 'false']\">\r\n" +
            "        <xsl:apply-templates select=\".\"></xsl:apply-templates>\r\n" +
            "        <xsl:if test=\"position() != last()\">,\r\n" +
            "     </xsl:if>\r\n" +
            "      </xsl:for-each>\r\n" +
            "    </xsl:when>\r\n" +
            "    <xsl:otherwise>\r\n" +
            "      <xsl:for-each select=\"exsl:node-set($subset)/*[local-name() != 'FunctionImport' or not(@IsBindable) or @IsBindable = 'false']\">\r\n" +
            "        <xsl:apply-templates select=\".\"></xsl:apply-templates>\r\n" +
            "        <xsl:if test=\"position() != last()\">,\r\n" +
            "     </xsl:if>\r\n" +
            "      </xsl:for-each>\r\n" +
            "    </xsl:otherwise>\r\n" +
            "  </xsl:choose>\r\n" +
            "  });\r\n" +
            "\r\n" +
            "  $data.generatedContexts = $data.generatedContexts || [];\r\n" +
            "  $data.generatedContexts.push(<xsl:value-of select=\"concat(concat($DefaultNamespace,../@Namespace), '.', @Name)\" />);\r\n" +
            "  <xsl:if test=\"$AutoCreateContext = 'true'\">\r\n" +
            "  /*Context Instance*/\r\n" +
            "  <xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\"$ContextInstanceName\" /> = new <xsl:value-of select=\"concat(concat($DefaultNamespace,../@Namespace), '.', @Name)\" />({ name:'oData', oDataServiceHost: '<xsl:value-of select=\"$SerivceUri\" />', maxDataServiceVersion: '<xsl:value-of select=\"$MaxDataserviceVersion\" />' });\r\n" +
            "</xsl:if>\r\n" +
            "\r\n" +
            "</xsl:for-each>\r\n" +
            "      \r\n" +
            "})(window, $data);\r\n" +
            "      \r\n" +
            "    </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"edm:Key\"></xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"edm:FunctionImport\">\r\n" +
            "    <xsl:text>'</xsl:text>\r\n" +
            "    <xsl:value-of select=\"@Name\"/>\r\n" +
            "    <xsl:text>': { type: </xsl:text>\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"@IsBindable = 'true'\">\r\n" +
            "        <xsl:text>$data.ServiceAction</xsl:text>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:text>$data.ServiceOperation</xsl:text>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "\r\n" +
            "    <xsl:apply-templates select=\"@*\" mode=\"FunctionImport-mode\"/>\r\n" +
            "\r\n" +
            "    <xsl:variable name=\"IsBindable\">\r\n" +
            "      <xsl:value-of select=\"@IsBindable\"/>\r\n" +
            "    </xsl:variable>\r\n" +
            "    <xsl:text>, params: [</xsl:text>\r\n" +
            "    <xsl:for-each select=\"edm:Parameter[($IsBindable = 'true' and position() > 1) or (($IsBindable = 'false' or $IsBindable = '') and position() > 0)]\">\r\n" +
            "      <xsl:text>{ name: '</xsl:text>\r\n" +
            "      <xsl:value-of select=\"@Name\"/>\r\n" +
            "      <xsl:text>', type: '</xsl:text>\r\n" +
            "      <xsl:variable name=\"curr\" select=\"@Type\"/>\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"$fullmetadata//edm:Schema[starts-with($curr, @Namespace)]\">\r\n" +
            "          <xsl:value-of select=\"concat($DefaultNamespace,$curr)\" />\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:value-of select=\"$curr\" />\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "      <xsl:text>' }</xsl:text>\r\n" +
            "      <xsl:if test=\"position() != last()\">, </xsl:if>\r\n" +
            "    </xsl:for-each>    \r\n" +
            "    <xsl:text>]</xsl:text>\r\n" +
            "\r\n" +
            "    <xsl:text> }</xsl:text>\r\n" +
            "  </xsl:template>\r\n" +
            "  \r\n" +
            "  <xsl:template match=\"@ReturnType\" mode=\"FunctionImport-mode\">\r\n" +
            "    <xsl:text>, returnType: </xsl:text>\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"not(.)\">null</xsl:when>\r\n" +
            "      <xsl:when test=\"starts-with(., 'Collection')\">$data.Queryable</xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:text>'</xsl:text>\r\n" +
            "        <xsl:variable name=\"curr\" select=\".\"/>\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"$fullmetadata//edm:Schema[starts-with($curr, @Namespace)]\">\r\n" +
            "            <xsl:value-of select=\"concat($DefaultNamespace,$curr)\" />\r\n" +
            "          </xsl:when>\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <xsl:value-of select=\"$curr\" />\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "        <xsl:text>'</xsl:text>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "\r\n" +
            "    <xsl:if test=\"starts-with(., 'Collection')\">\r\n" +
            "      <xsl:variable name=\"len\" select=\"string-length(.)-12\"/>\r\n" +
            "      <xsl:variable name=\"curr\" select=\"substring(.,12,$len)\"/>\r\n" +
            "      <xsl:variable name=\"ElementType\" >\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"$fullmetadata//edm:Schema[starts-with($curr, @Namespace)]\">\r\n" +
            "            <xsl:value-of select=\"concat($DefaultNamespace,$curr)\" />\r\n" +
            "          </xsl:when>\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <xsl:value-of select=\"$curr\" />\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:variable>\r\n" +
            "      <xsl:text>, elementType: '</xsl:text>\r\n" +
            "      <xsl:value-of select=\"$ElementType\"/>\r\n" +
            "      <xsl:text>'</xsl:text>\r\n" +
            "    </xsl:if>\r\n" +
            "  </xsl:template>\r\n" +
            "  <xsl:template match=\"@Name\" mode=\"FunctionImport-mode\"></xsl:template>\r\n" +
            "  <xsl:template match=\"@m:HttpMethod\" mode=\"FunctionImport-mode\">\r\n" +
            "    <xsl:text>, method: '</xsl:text>\r\n" +
            "    <xsl:value-of select=\".\"/>\r\n" +
            "    <xsl:text>'</xsl:text>\r\n" +
            "  </xsl:template>\r\n" +
            "  <xsl:template match=\"@IsBindable | @IsSideEffecting | @IsAlwaysBindable | @m:IsAlwaysBindable | @metadata:IsAlwaysBindable | @IsComposable\" mode=\"FunctionImport-mode\">\r\n" +
            "    <xsl:text>, </xsl:text>\r\n" +
            "    <xsl:call-template name=\"GetAttributeName\">\r\n" +
            "      <xsl:with-param name=\"Name\" select=\"name()\" />\r\n" +
            "    </xsl:call-template>\r\n" +
            "    <xsl:text>: </xsl:text>\r\n" +
            "    <xsl:value-of select=\".\"/>\r\n" +
            "  </xsl:template>\r\n" +
            "  <xsl:template match=\"@*\" mode=\"FunctionImport-mode\">\r\n" +
            "    <xsl:text>, '</xsl:text>\r\n" +
            "    <xsl:call-template name=\"GetAttributeName\">\r\n" +
            "      <xsl:with-param name=\"Name\" select=\"name()\" />\r\n" +
            "    </xsl:call-template>\r\n" +
            "    <xsl:text>': '</xsl:text>\r\n" +
            "    <xsl:value-of select=\".\"/>        \r\n" +
            "    <xsl:text>'</xsl:text>\r\n" +
            "  </xsl:template>\r\n" +
            "  <xsl:template name=\"GetAttributeName\">\r\n" +
            "    <xsl:param name=\"Name\" />\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"contains($Name, ':')\">\r\n" +
            "        <xsl:value-of select=\"substring-after($Name, ':')\"/>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <xsl:value-of select=\"$Name\"/>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"edm:EntitySet\">'<xsl:value-of select=\"@Name\"/>': { type: <xsl:value-of select=\"$EntitySetBaseClass\"  />, elementType: <xsl:value-of select=\"concat($DefaultNamespace,@EntityType)\"/><xsl:text> </xsl:text><xsl:apply-templates select=\".\" mode=\"Collection-Actions\" />}</xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"edm:EntitySet\" mode=\"Collection-Actions\">\r\n" +
            "    <xsl:variable name=\"CollectionType\" select=\"concat('Collection(', @EntityType, ')')\" />\r\n" +
            "    <xsl:for-each select=\"//edm:FunctionImport[edm:Parameter[1]/@Type = $CollectionType]\">\r\n" +
            "      <xsl:if test=\"position() = 1\">\r\n" +
            "        <xsl:text>, actions: { \r\n" +
            "        </xsl:text>\r\n" +
            "      </xsl:if>\r\n" +
            "        <xsl:apply-templates select=\".\"></xsl:apply-templates><xsl:if test=\"position() != last()\">,\r\n" +
            "        </xsl:if>\r\n" +
            "      <xsl:if test=\"position() = last()\">\r\n" +
            "        <xsl:text>\r\n" +
            "      }</xsl:text>\r\n" +
            "      </xsl:if>\r\n" +
            "    </xsl:for-each>\r\n" +
            "  </xsl:template>\r\n" +
            "  \r\n" +
            "  <xsl:template match=\"edm:Property | edm:NavigationProperty\">\r\n" +
            "    <property>\r\n" +
            "    <xsl:variable name=\"memberDefinition\">\r\n" +
            "      <xsl:if test=\"parent::edm:EntityType/edm:Key/edm:PropertyRef[@Name = current()/@Name]\"><attribute name=\"key\">true</attribute></xsl:if>\r\n" +
            "      <xsl:apply-templates select=\"@*[local-name() != 'Name']\" mode=\"render-field\" />\r\n" +
            "    </xsl:variable>'<xsl:value-of select=\"@Name\"/>': { <xsl:choose><xsl:when test=\"function-available('msxsl:node-set')\"><xsl:for-each select=\"msxsl:node-set($memberDefinition)/*\">'<xsl:if test=\"@extended = 'true'\">$</xsl:if><xsl:value-of select=\"@name\"/>':<xsl:value-of select=\".\"/>\r\n" +
            "      <xsl:if test=\"position() != last()\">,<xsl:text> </xsl:text>\r\n" +
            "    </xsl:if> </xsl:for-each></xsl:when>\r\n" +
            "  <xsl:otherwise><xsl:for-each select=\"exsl:node-set($memberDefinition)/*\">'<xsl:if test=\"@extended = 'true'\">$</xsl:if><xsl:value-of select=\"@name\"/>':<xsl:value-of select=\".\"/>\r\n" +
            "      <xsl:if test=\"position() != last()\">,<xsl:text> </xsl:text>\r\n" +
            "    </xsl:if> </xsl:for-each></xsl:otherwise>\r\n" +
            "    </xsl:choose> }</property>\r\n" +
            "</xsl:template>\r\n" +
            "  \r\n" +
            "  <xsl:template match=\"@Name\" mode=\"render-field\">\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@Type\" mode=\"render-field\">\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"starts-with(., 'Collection')\">\r\n" +
            "        <attribute name=\"type\">'Array'</attribute>\r\n" +
            "        <xsl:variable name=\"len\" select=\"string-length(.)-12\"/>\r\n" +
            "        <xsl:variable name=\"currType\" select=\"substring(.,12,$len)\"/>\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"starts-with($currType, ../../../@Namespace)\">\r\n" +
            "            <attribute name=\"elementType\">'<xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\"$currType\" />'</attribute>\r\n" +
            "          </xsl:when>\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <attribute name=\"elementType\">'<xsl:value-of select=\"$currType\" />'</attribute>\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:when test=\"starts-with(., ../../../@Namespace)\">\r\n" +
            "        <attribute name=\"type\">'<xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\".\"/>'</attribute>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:otherwise>\r\n" +
            "        <attribute name=\"type\">'<xsl:value-of select=\".\"/>'</attribute>\r\n" +
            "      </xsl:otherwise>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@ConcurrencyMode\" mode=\"render-field\">\r\n" +
            "    <attribute name=\"concurrencyMode\">$data.ConcurrencyMode.<xsl:value-of select=\".\"/></attribute>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@Nullable\" mode=\"render-field\">\r\n" +
            "    <attribute name=\"nullable\"><xsl:value-of select=\".\"/></attribute>\r\n" +
            "    \r\n" +
            "    <xsl:if test=\". = 'false'\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"parent::edm:Property/@annot:StoreGeneratedPattern = 'Identity' or parent::edm:Property/@annot:StoreGeneratedPattern = 'Computed'\"></xsl:when>\r\n" +
            "        <xsl:otherwise><attribute name=\"required\">true</attribute></xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </xsl:if>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@annot:StoreGeneratedPattern\" mode=\"render-field\">\r\n" +
            "    <xsl:if test=\". != 'None'\"><attribute name=\"computed\">true</attribute></xsl:if>    \r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@MaxLength\" mode=\"render-field\">\r\n" +
            "    <attribute name=\"maxLength\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"string(.) = 'Max'\">Number.POSITIVE_INFINITY</xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:value-of select=\".\"/>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </attribute>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@FixedLength | @Unicode | @Precision | @Scale\" mode=\"render-field\">\r\n" +
            "  </xsl:template>\r\n" +
            "  <xsl:template match=\"@*\" mode=\"render-field\">\r\n" +
            "    <xsl:variable name=\"nameProp\">\r\n" +
            "      <xsl:choose>\r\n" +
            "        <xsl:when test=\"substring-after(name(), ':') != ''\">\r\n" +
            "          <xsl:value-of select=\"substring-after(name(), ':')\"/>\r\n" +
            "        </xsl:when>\r\n" +
            "        <xsl:otherwise>\r\n" +
            "          <xsl:value-of select=\"name()\"/>\r\n" +
            "        </xsl:otherwise>\r\n" +
            "      </xsl:choose>\r\n" +
            "    </xsl:variable>\r\n" +
            "    <xsl:element name=\"attribute\"><xsl:attribute name=\"extended\">true</xsl:attribute><xsl:attribute name=\"name\"><xsl:value-of select=\"$nameProp\"/></xsl:attribute>'<xsl:value-of select=\".\"/>'</xsl:element>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@Relationship\" mode=\"render-field\">\r\n" +
            "    <xsl:variable name=\"relationName\" select=\"string(../@ToRole)\"/>\r\n" +
            "    <xsl:variable name=\"relationshipName\" select=\"string(.)\" />\r\n" +
            "    <xsl:variable name=\"relation\" select=\"key('associations',string(.))/edm:End[@Role = $relationName]\" />\r\n" +
            "    <xsl:variable name=\"otherName\" select=\"../@FromRole\" />\r\n" +
            "    <xsl:variable name=\"otherProp\" select=\"//edm:NavigationProperty[@ToRole = $otherName and @Relationship = $relationshipName]\" />\r\n" +
            "    <xsl:variable name=\"m\" select=\"$relation/@Multiplicity\" />\r\n" +
            "    <xsl:choose>\r\n" +
            "      <xsl:when test=\"$m = '*'\">\r\n" +
            "        <attribute name=\"type\">'<xsl:value-of select=\"$CollectionBaseClass\"/>'</attribute>\r\n" +
            "        <attribute name=\"elementType\">'<xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\"$relation/@Type\"/>'</attribute>\r\n" +
            "        <xsl:if test=\"not($otherProp/@Name)\">\r\n" +
            "          <attribute name=\"inverseProperty\">'$$unbound'</attribute></xsl:if>\r\n" +
            "        <xsl:if test=\"$otherProp/@Name\">\r\n" +
            "          <attribute name=\"inverseProperty\">'<xsl:value-of select=\"$otherProp/@Name\"/>'</attribute></xsl:if>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:when test=\"$m = '0..1'\">\r\n" +
            "        <attribute name=\"type\">'<xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\"$relation/@Type\"/>'</attribute>\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"$otherProp\">\r\n" +
            "            <attribute name=\"inverseProperty\">'<xsl:value-of select=\"$otherProp/@Name\"/>'</attribute>\r\n" +
            "          </xsl:when >\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <attribute name=\"inverseProperty\">'$$unbound'</attribute>\r\n" +
            "            <xsl:message terminate=\"no\">  Warning: inverseProperty other side missing: <xsl:value-of select=\".\"/>\r\n" +
            "          </xsl:message>\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:when>\r\n" +
            "      <xsl:when test=\"$m = '1'\">\r\n" +
            "        <attribute name=\"type\">'<xsl:value-of select=\"$DefaultNamespace\"/><xsl:value-of select=\"$relation/@Type\"/>'</attribute>\r\n" +
            "        <attribute name=\"required\">true</attribute>\r\n" +
            "        <xsl:choose>\r\n" +
            "          <xsl:when test=\"$otherProp\">\r\n" +
            "            <attribute name=\"inverseProperty\">'<xsl:value-of select=\"$otherProp/@Name\"/>'</attribute>\r\n" +
            "          </xsl:when >\r\n" +
            "          <xsl:otherwise>\r\n" +
            "            <attribute name=\"inverseProperty\">'$$unbound'</attribute>\r\n" +
            "            <xsl:message terminate=\"no\">\r\n" +
            "              Warning: inverseProperty other side missing: <xsl:value-of select=\".\"/>\r\n" +
            "            </xsl:message>\r\n" +
            "          </xsl:otherwise>\r\n" +
            "        </xsl:choose>\r\n" +
            "      </xsl:when>\r\n" +
            "    </xsl:choose>\r\n" +
            "  </xsl:template>\r\n" +
            "\r\n" +
            "\r\n" +
            "  <xsl:template match=\"@FromRole | @ToRole\" mode=\"render-field\"></xsl:template>\r\n" +
            "\r\n" +
            "  <xsl:template match=\"*\" mode=\"render-field\">\r\n" +
            "    <!--<unprocessed>!!<xsl:value-of select=\"name()\"/>!!</unprocessed>-->\r\n" +
            "    <xsl:message terminate=\"no\">  Warning: <xsl:value-of select=\"../../@Name\"/>.<xsl:value-of select=\"../@Name\"/>:<xsl:value-of select=\"name()\"/> is an unknown/unprocessed attribued</xsl:message>\r\n" +
            "  </xsl:template>\r\n" +
            "  <!--<xsl:template match=\"*\">\r\n" +
            "    !<xsl:value-of select=\"name()\"/>!\r\n" +
            "  </xsl:template>-->\r\n" +
            "</xsl:stylesheet>\r\n"
    }

});

$data.MetadataLoader = new $data.MetadataLoaderClass();
$data.service = function (serviceUri, config, cb) {
    var _url, _config, _callback;
    function getParam(paramValue) {
        switch (typeof paramValue) {
            case 'object':
                if (typeof paramValue.success === 'function' || typeof paramValue.error === 'function') {
                    _callback = paramValue;
                } else {
                    _config = paramValue;
                }
                break;
            case 'function':
                _callback = paramValue;
                break;
            default:
                break;
        }
    }
    getParam(config);
    getParam(cb);

    if (typeof serviceUri === 'object') {
        _config = $data.typeSystem.extend(serviceUri, _config);
        serviceUri = serviceUri.url;
        delete _config.url;
    }

    var pHandler = new $data.PromiseHandler();
    _callback = pHandler.createCallback(_callback);

    $data.MetadataLoader.load(serviceUri, {
        success: function (factory) {
            var type = factory.type;
            //register to local store
            if (_config) {
                var storeAlias = _config.serviceName || _config.storeAlias;
                if (storeAlias && 'addStore' in $data) {
                    $data.addStore(storeAlias, factory, _config.isDefault === undefined || _config.isDefault)
                }
            }

            _callback.success(factory, type);
        },
        error: _callback.error
    }, _config);

    return pHandler.getPromise();
};
(function ($data) {
    if (typeof jQuery !== 'undefined') {
        $data.Class.define('$data.Deferred', $data.PromiseHandlerBase, null, {
            constructor: function () {
                this.deferred = new $.Deferred();
            },
            deferred: {},
            createCallback: function (callBack) {
                callBack = $data.typeSystem.createCallbackSetting(callBack);
                var self = this;

                return cbWrapper = {
                    success: function () {
                        callBack.success.apply(self.deferred, arguments);
                        self.deferred.resolve.apply(self.deferred, arguments);
                    },
                    error: function () {
                        Array.prototype.push.call(arguments, self.deferred);
                        callBack.error.apply(self.deferred, arguments);
                    },
                    notify: function () {
                        callBack.notify.apply(self.deferred, arguments);
                        self.deferred.notify.apply(self.deferred, arguments);
                    }
                };
            },
            getPromise: function () {
                return this.deferred.promise();
            }
        }, null);

        $data.PromiseHandler = $data.Deferred;
    }
})($data);
(function ($data) {

    $data.initService = function (apiKey, options) {
        var d = new $data.PromiseHandler();
        var cfg;

        if (typeof apiKey === 'object') {
            //appId, serviceName, ownerid, isSSL, port, license, url
            cfg = apiKey;
            var protocol = cfg.isSSL || cfg.isSSL === undefined ? 'https' : 'http';
            var port = cfg.port ? (':' + cfg.port) : '';

            if (typeof cfg.license === 'string' && cfg.license.toLowerCase() === 'business') {
                if (cfg.appId && cfg.serviceName) {
                    apiKey = protocol + '://' + cfg.appId + '.jaystack.net' + port + '/' + cfg.serviceName;
                } else {
                    apiKey = cfg.url;
                }
            } else {
                if (cfg.ownerId && cfg.appId && cfg.serviceName) {
                    apiKey = protocol + '://open.jaystack.net/' + cfg.ownerId + '/' + cfg.appId + '/api/' + cfg.serviceName;
                } else {
                    apiKey = cfg.url;
                }
            }

            delete cfg.url;
            cfg = $data.typeSystem.extend(cfg, options);
        } else {
            cfg = options;
        }

        $data.service(apiKey, cfg).then(function (factory) {
            var ctx = factory();
            return ctx.onReady()
                .then(function (context) {
                    context.serviceFactory = factory;
                    d.deferred.resolve(context, factory, factory.type);
                }).fail(function () {
                    d.deferred.reject.apply(d.deferred, arguments);
                });
        }).fail(function(){
            d.deferred.reject.apply(d.deferred, arguments);
        });

        return d.getPromise();
    };

})($data);

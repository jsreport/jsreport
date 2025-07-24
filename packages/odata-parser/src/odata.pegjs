/*
 * OData query expression grammar.
 * Note: use this gramar with pegjs:
 *  - http://pegjs.majda.cz/
 *  - https://github.com/dmajda/pegjs
 */

{
  function filterExprHelper(left, right){
    if (right) {
        return {
            type: right.type,
            left: left,
            right: right.value
        }
    } else {
        return left;
    }
  }
}

start                       = query

/*
 * Basic cons.
 */

WSP                         =  ' '  //Whitespace
DIGIT                       = [0-9]
INT                         = a:DIGIT+ { return a.join(''); }
HEXDIG                      =   [0-9a-fA-F]
//peg does not support repetition (ie: [a]{4})
HEXDIG2                     =   HEXDIG HEXDIG
HEXDIG4                     =   HEXDIG2 HEXDIG2
HEXDIG8                     =   HEXDIG4 HEXDIG8


SQUOTE                      =   "%x27" / "'"

// end: Basic cons

/*
 * OData literals - adapted from OData ABNF:
 *  - http://www.odata.org/media/30002/OData%20ABNF.html
 */
primitiveLiteral            =   null /
                                binary /
                                dateTime /
                                dateTimeOffset /
                                guid /
                                double /
                                decimal /
                                single /
                                int32 /
                                int64 /
                                byte /
                                sbyte /
                                boolean /
                                string


null                        =   "null" ( "'" identifier "'" )?
                                // The optional qualifiedTypeName is used to specify what type this null value should be considered.
                                // Knowing the type is useful for function overload resolution purposes.

binary                      =   ( "%d88" / "binary" )
                                SQUOTE
                                HEXDIG HEXDIG
                                SQUOTE
                                // note: "X" is case sensitive "binary" is not hence using the character code.

boolean                     =   "true" { return true; } /
                                "1" { return true; } /
                                "false" { return false; } /
                                "0" { return false; }

byte                        =   DIGIT DIGIT DIGIT
                                // numbers in the range from 0 to 257

dateTime                    =   "datetime" SQUOTE a:dateTimeBody SQUOTE { return new Date(a); }

dateTimeOffset              =   "datetimeoffset" SQUOTE a:dateTimeOffsetBody SQUOTE { return new Date(a); }

dateTimeBodyA               =  a:year "-" b:month "-" c:day "T" d:hour ":" e:minute {
                                    return a + '-' + b + '-' + c + "T" + d + ":" + e;
                                }
dateTimeBodyB               =  a:dateTimeBodyA ":" b:second { return a + ":" + b; }
dateTimeBodyC               =  a:dateTimeBodyB "." b:nanoSeconds { return a + "." + b; }
dateTimeBodyD               =  a:dateTimeBodyC "-" b:zeroToTwentyFour ":" c:zeroToSixty {
                                    return a + "-" + b + ":" + c;
                                }
dateTimeBody                =
                               dateTimeBodyD
                             / dateTimeBodyC
                             / dateTimeBodyB
                             / dateTimeBodyA

dateTimeOffsetBody          =   a:dateTimeBody "Z" { return a + "Z"; } /
                                a:dateTimeBody b:sign c:zeroToThirteen ":00" { return a + b + c + ":00"; } /
                                a:dateTimeBody b:sign c:zeroToThirteen { return a + b + c; } /
                                a:dateTimeBody b:sign c:zeroToTwelve ":" d:zeroToSixty { return a + b + c + ":" + d; } /
                                a:dateTimeBody b:sign c:zeroToTwelve { return a + b + c; }

decimal                     =  sign:sign? digit:DIGIT+ "." decimal:DIGIT+ ("M"/"m")? { return sign + digit.join('') + '.' + decimal.join(''); } /
                               sign:sign? digit:DIGIT+ ("M"/"m") { return sign + digit.join(''); }

double                      =  sign:sign? digit:DIGIT "." decimal:DIGIT+ ("e" / "E") signexp:sign? exp:DIGIT+ ("D" / "d")? { return sign + digit + '.' + decimal.join('') + 'e' + signexp + exp.join(''); } /
                               sign:sign? digit:DIGIT+ "." decimal:DIGIT+ ("D" / "d") { return sign + digit.join('') + '.' + decimal.join(''); } /
                               sign:sign? digit:DIGIT+ ("D" / "d") { return sign + digit.join(''); } /
                               nanInfinity ("D" / "d")?

guid                        =   "guid" SQUOTE HEXDIG8 "-" HEXDIG4 "-" HEXDIG4 "-" HEXDIG8 HEXDIG4 SQUOTE

int32                       =   sign:sign? digit:DIGIT+ { return parseInt(digit.join('')) * (sign === '-' ? -1 : 1); }
                                // numbers in the range from -2147483648 to 2147483647

int64                       =   sign? DIGIT+ ( "L" / "l" )?
                                // numbers in the range from -9223372036854775808 to 9223372036854775807

sbyte                       =   sign? DIGIT DIGIT? DIGIT?
                                // numbers in the range from -128 to 127

single                      =   (
                                    sign DIGIT "." DIGIT+ ( "e" / "E" ) sign DIGIT+ /
                                    sign DIGIT* "." DIGIT+ /
                                    sign DIGIT+
                                ) ("F" / "f") /
                                nanInfinity ( "F" / "f" )?

string                      =   l:SQUOTE v:validstring  r:SQUOTE { return v; }


oneToNine                   =   [1-9]

zeroToTwelve                =   a:"0" b:[1-9] { return a + b;} / a:"1" b:[0-2] { return a + b; }

zeroToThirteen              =   zeroToTwelve / "13"

zeroToSixty                 =   "60" / a:[0-5] b:DIGIT { return a + b; }

zeroToThirtyOne             =   "3" a:[0-1] { return "3" + a; } / a:[0-2] b:DIGIT { return a + b; }

zeroToTwentyFour            =   "2" a:[0-4] { return "2" + a; } / a:[0-1] b:DIGIT { return a + b; }

year                        =  a:DIGIT b:DIGIT c:DIGIT d:DIGIT { return a + b + c + d; }

month                       =   zeroToTwelve

day                         =   zeroToThirtyOne

hour                        =   zeroToTwentyFour

minute                      =   zeroToSixty

second                      =   zeroToSixty

nanoSeconds                 =  INT

sign                        =   "+" / "-"

nan                         =   "NaN"

negativeInfinity            =   "-INF"

positiveInfinity            =   "INF"

nanInfinity                 =   nan / negativeInfinity / positiveInfinity

// end: OData literals

/*
 * OData identifiers
 */

unreserved                  = a:[a-zA-Z0-9-_]+ { return a.join(''); }
validstring                 = a:([^']/escapedQuote)* { return a.join('').replace(/('')/g, "'"); }
escapedQuote                = a:"''" { return a; }
identifierPart              = a:[_a-zA-Z] b:unreserved? { return a + b; }
identifier                  =
                                a:identifierPart list:("." i:identifier {return i;})? {
                                    if (list === "") list = [];
                                    if (require('util').isArray(list[0])) {
                                        list = list[0];
                                    }
                                    list.unshift(a);
                                    return list.join('.');
                                }


// --

/*
 * OData query options
 */

// callback
callback                    =   "$callback=" a:identifier { return { '$callback': a }; }

// $top
top                         =   "$top=" a:INT { return { '$top': ~~a }; }
                            /   "$top=" .* { return {"error": 'invalid $top parameter'}; }

// $expand
expand                      =   "$expand=" list:expandList { return { "$expand": list }; }
                            /   "$expand=" .* { return {"error": 'invalid $expand parameter'}; }

expandList                  =   i:identifierPath list:("," WSP? l:expandList {return l;})? {
                                    if (list === "") list = [];
                                    if (require('util').isArray(list[0])) {
                                        list = list[0];
                                    }
                                    list.unshift(i);
                                    return list;
                                }

//$skip
skip                        =   "$skip=" a:INT {return {'$skip': ~~a }; }
                            /   "$skip=" .* { return {"error": 'invalid $skip parameter'}; }

//$format
format                      =   "$format=" v:.+ { return {'$format': v.join('') }; }
                            /   "$format=" .* { return {"error": 'invalid $format parameter'}; }
//$inlinecount
inlinecount                 =   "$inlinecount=" v:("allpages" / "none") { return {'$inlinecount': v }; }
                            /   "$inlinecount=" .* { return {"error": 'invalid $inlinecount parameter'}; }

// $orderby
orderby                     =   "$orderby=" list:orderbyList {
                                    return { "$orderby": list }; }
                            /   "$orderby=" .* { return {"error": 'invalid $orderby parameter'}; }

orderbyList                 = i:(id:identifier ord:(WSP ("asc"/"desc"))? {
                                    var result = {};
                                    result[id] = ord[1] || 'asc';
                                    return result;
                                })
                              list:("," WSP? l:orderbyList{return l;})? {

                                    if (list === "") list = [];
                                    if (require('util').isArray(list[0])) {
                                        list = list[0];
                                    }
                                    list.unshift(i);
                                    return list;
                                }

//$select
select                      =   "$select=" list:selectList { return { "$select":list }; }
                            /   "$select=" .* { return {"error": 'invalid $select parameter'}; }

identifierPathParts         =   "/" i:identifierPart list:identifierPathParts? {
                                    if (require('util').isArray(list[0])) {
                                        list = list[0];
                                    }
                                    return "/" + i + list;
                                }
identifierPath              =   a:identifier b:identifierPathParts? { return a + b; }
selectList                  =
                                i:(a:identifierPath b:".*"?{return a + b;}/"*") list:("," WSP? l:selectList {return l;})? {
                                    if (list === "") list = [];
                                    if (require('util').isArray(list[0])) {
                                        list = list[0];
                                    }
                                    list.unshift(i);
                                    return list;
                                }

//filter
filter                      =   "$filter=" list:filterExpr {
                                    return {
                                        "$filter": list
                                    };
                                }
                            /   "$filter=" .* { return {"error": 'invalid $filter parameter'}; }

filterExpr                  = 
                              left:("(" WSP? filter:filterExpr WSP? ")"{return filter}) right:( WSP type:("and"/"or") WSP value:filterExpr{
                                    return { type: type, value: value}
                              })? {
                                return filterExprHelper(left, right);
                              } / 
                              left:cond right:( WSP type:("and"/"or") WSP value:filterExpr{
                                    return { type: type, value: value}
                              })? {
                                return filterExprHelper(left, right);
                              }

booleanFunctions2Args       = "substringof" / "endswith" / "startswith" / "IsOf"

booleanFunc                 =  f:booleanFunctions2Args "(" arg0:part "," WSP? arg1:part ")" {
                                    return {
                                        type: "functioncall",
                                        func: f,
                                        args: [arg0, arg1]
                                    }
                                } /
                                "IsOf(" arg0:part ")" {
                                    return {
                                        type: "functioncall",
                                        func: "IsOf",
                                        args: [arg0]
                                    }
                                }

otherFunctions1Arg          = "tolower" / "toupper" / "trim" / "length" / "year" /
                              "month" / "day" / "hour" / "minute" / "second" /
                              "round" / "floor" / "ceiling"

otherFunc1                  = f:otherFunctions1Arg "(" arg0:part ")" {
                                  return {
                                      type: "functioncall",
                                      func: f,
                                      args: [arg0]
                                  }
                              }

otherFunctions2Arg         = "indexof" / "concat" / "substring" / "replace"

otherFunc2                 = f:otherFunctions2Arg "(" arg0:part "," WSP? arg1:part ")" {
                                  return {
                                      type: "functioncall",
                                      func: f,
                                      args: [arg0, arg1]
                                  }
                              } /
                              "substring" "(" arg0:part "," WSP? arg1:part "," WSP? arg2:part ")" {
                                  return {
                                      type: "functioncall",
                                      func: "substring",
                                      args: [arg0, arg1, arg2]
                                  }
                              } /
                              "replace" "(" arg0:part "," WSP? arg1:part "," WSP? arg2:part ")" {
                                  return {
                                      type: "functioncall",
                                      func: "replace",
                                      args: [arg0, arg1, arg2]
                                  }
                              }

cond                        = a:part WSP op:op WSP b:part {
                                    return {
                                        type: op,
                                        left: a,
                                        right: b
                                    };
                                } / booleanFunc

part                        =   booleanFunc /
                                otherFunc2 /
                                otherFunc1 /
                                l:primitiveLiteral {
                                    return {
                                        type: 'literal',
                                        value: l
                                    };
                                } /
                                (u:identifierPath {
                                    return {
                                        type: 'property', name: u
                                    };
                                })

op                          =
                                "eq" /
                                "ne" /
                                "lt" /
                                "le" /
                                "gt" /
                                "ge" /
                                "add" /
                                "sub" /
                                "mul" /
                                "div" /
                                "mod"

unsupported                 =   "$" er:.* { return { error: "unsupported method: " + er }; }

//end: OData query options

/*
 * OData query
 */

expList                     = e:exp "&" el:expList { return [e].concat(el); } /
                              e:exp { return [e]; }


exp                         =
                                expand /
                                filter /
                                orderby /
                                skip /
                                top /
                                format /
                                inlinecount /
                                select /
                                callback /
                                unsupported

query                       = list:expList {
                                    //turn the array into an object like:
                                    // { $top: 5, $skip: 10 }
                                    var result = {};
                                    list = list || [];
                                    for(var i in list){

                                        if (list[i] !== "") {
                                            var paramName = Object.keys(list[i])[0]; //ie: $top
                                            result[paramName] = list[i][paramName];
                                        }
                                    }
                                    return result;
                                }

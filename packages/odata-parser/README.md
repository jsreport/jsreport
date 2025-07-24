OData query string parser for node.js based on [pegjs](http://pegjs.majda.cz/).

[![Build Status](https://travis-ci.org/auth0/node-odata-parser.svg)](https://travis-ci.org/auth0/node-odata-parser)

## Installation

```
npm install odata-parser
```

## Usage

```javascript
var parser = require("odata-parser");

var ast = parser.parse("$top=10&$skip=5&$select=foo")

util.inspect(ast)
```

will result in:

```javascript
{
  '$top': 10,
  '$skip': 5,
  '$select': [ 'foo' ]
}
```

Filters like:

```javascript
parser.parse("$filter=Name eq 'John' and LastName lt 'Doe'")
```
results in:

```javascript

{
    $filter: {
        type: 'and',
        left: {
            type: 'eq',
            left: {
                type: 'property',
                name: 'Name'
            },
            right: {
                type: 'literal',
                value: 'John'
            }
        },
        right: {
            type: 'lt',
            left: {
                type: 'property',
                name: 'LastName'
            },
            right: {
                type: 'literal',
                value: 'Doe'
            }
        }
    }
}
```

Using functions in filters

```javascript
parser.parse("$filter=substringof('nginx', Servers)")
```

restuls in:

```javascript
{
    $filter: {
        type: 'functioncall',
        func: 'substringof',
        args: [{
            type: 'literal',
            value: 'nginx'
        }, {
            type: 'property',
            name: 'Servers'
        }]
    }
}
```

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.

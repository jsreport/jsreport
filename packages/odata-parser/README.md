OData query string parser for node.js based on [pegjs](http://pegjs.majda.cz/).

## Installation

```
npm install @jsreport/odata-parser
```

## Usage

```javascript
var parser = require("@jsreport/odata-parser");

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

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.

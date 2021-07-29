const moment = require('moment')
const rowOffset = 6

function nowStr () {
    return moment().format('YYYY-MM-DD')
}

function generateEmptyCell (repeat, className) {
    const cells = []

    for (let i = 0; i < repeat; i++) {
        cells.push(`<td class="empty-cell ${className || ''}"></td>`)
    }

    return new Handlebars.SafeString(cells.join(''))
}

function oddClassName (index) {
    return (index + 1) % 2 !== 0 ? 'odd' : ''
}

function sum (a, b) {
    return a + b
}

function getDetailRowIndex (index) {
    return (index + 1) + rowOffset
}
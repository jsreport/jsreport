const jsreport = require('jsreport-proxy')
const Handlebars = require('handlebars')
const commonHelpers = await jsreport.assets.require('../shared/common helpers.js')

commonHelpers(Handlebars)

function nowPlus20Days() {
    var date = new Date()
    date.setDate(date.getDate() + 20);
    return date.toLocaleDateString();
}

function total(items) {
    var sum = 0
    items.forEach(function (i) {
        console.log('Calculating item ' + i.name + '; you should see this message in debug run')
        sum += i.price
    })
    return sum
}

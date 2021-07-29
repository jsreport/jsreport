
module.exports = function (Handlebars) {
    Handlebars.registerHelper('nowLocalStr', function () {
        return new Date().toLocaleDateString()
    })
}
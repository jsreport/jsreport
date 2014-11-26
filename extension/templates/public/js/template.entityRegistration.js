define([], function() {
    return function(context) {
        var templateAttributes = {
            '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String'},
            'name': { 'type': 'Edm.String' },
            'modificationDate': { 'type': 'Edm.DateTime' },
            'engine': { 'type': 'Edm.String' },
            'recipe': { 'type': 'Edm.String' },
            'content': { 'type': 'Edm.String' },
            'shortid': { 'type': 'Edm.String' },
            'helpers': { 'type': 'Edm.String' }
        };

        $data.Entity.extend('$entity.Template', templateAttributes);
        $entity.Template.prototype.toString = function () {
            return "Template " + (this.name || "");
        };

        context["templates"] = { type: $data.EntitySet, elementType: $entity.Template };
    };
})
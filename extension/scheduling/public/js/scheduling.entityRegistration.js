define([], function() {
    return function(context) {

        $data.Class.define("$entity.Schedule", $data.Entity, null, {
            _id: { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
            cron: {type: "string"},
            name: {type: "string"},
            templateShortid: {type: "string"},
            creationDate: {type: "date"},
            nextRun: {type: "date"},
            enabled: {type: "boolean"},
            shortid: {type: "string"},
            modificationDate: {type: "date"}
        }, null);

        $entity.Schedule.prototype.toString = function () {
            return "Schedule " + (this.name || "");
        };

        $data.Class.define("$entity.Task", $data.Entity, null, {
            _id: { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
            scheduleShortid: {type: "string"},
            creationDate: {type: "date"},
            finishDate: {type: "date"},
            state: {type: "string"},
            error: {type: "string"},
            ping: {type: "date"}
        });

        $entity.Task.prototype.toString = function () {
            return "Task";
        };

        $entity.Report.addMember("taskId", { type: "string" });
        context["schedules"] = { type: $data.EntitySet, elementType: $entity.Schedule };
        context["tasks"] = { type: $data.EntitySet, elementType: $entity.Task };
    };
});
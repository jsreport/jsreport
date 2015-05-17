/* globals jsreport, jsreportOptions */

$(function () {


    function renderTemplate(shortid) {
        var template = window.templates[shortid];
        document.title = template.name + " - jsreport";
        $("#title").text(template.name);
        $("#title").attr("href", "");
        $("#page").data("shortid", shortid);
        $(".list-command").hide();
        $(".template-command").show();

        window.template = template;

        jsreport.render($("#page"), {shortid: shortid});
    }

    function renderTemplateReports(shortid) {
        document.title = window.templates[shortid].name + " - jsreport";
        $("#title").text(window.templates[shortid].name);
        $("#title").attr("href", "");
        $("#page").data("shortid", shortid);
        $(".list-command").hide();
        $("#goToList").show();

        $.getJSON("/odata/reports?$orderby=creationDate desc&$filter=templateShortid eq '" + shortid + "'", function (data) {
            window.reports = {};
            for (var i = 0; i < data.value.length; ++i) {
                data.value[i].creationDate = new Date(Date.parse(data.value[i].creationDate)).toLocaleString();
                window.reports[data.value[i]._id] = data.value[i];
            }

            $("#page").html($.templates("#reports-template").render({items: data.value}));
        });
    }

    function renderReport(id) {
        $(".template-command").hide();
        $(".list-command").hide();
        document.title = window.reports[id].name + " - jsreport";
        $("#title").text(window.reports[id].name);
        $("#title").attr("href", "#/template-reports/" + $("#page").data("shortid"));
        $("#page").data("_id", id);
        $("#goToList").show();

        $("#page").html($.templates("#report-template").render({_id: id}));
    }

    function renderList() {
        $(".template-command").hide();
        $(".list-command").show();

        if (jsreportOptions.mode === "templates")
            $("#switchMixedMode").removeClass("mixed-mode-reports");
        else
            $("#switchMixedMode").addClass("mixed-mode-reports");

        document.title = "jsreport";
        $("#title").text("");
        $("#title").attr("href", "");
        $("#page").html($.templates("#list-template").render({
            items: window.templatesList,
            mode: jsreportOptions.mode
        }));
    }

    function refresh() {
        if (!window.location.hash) {
            window.location.hash = "#/";
            return;
        }

        if (window.location.hash.indexOf("#/template/") === 0) {
            renderTemplate(window.location.hash.replace("#/template/", ""));
            return;
        }

        if (window.location.hash.indexOf("#/template-reports/") === 0) {
            renderTemplateReports(window.location.hash.replace("#/template-reports/", ""));
            return;
        }

        if (window.location.hash.indexOf("#/template-reports/") === 0) {
            renderTemplateReports(window.location.hash.replace("#/template-reports/", ""));
            return;
        }

        if (window.location.hash.indexOf("#/report/") === 0) {
            renderReport(window.location.hash.replace("#/report/", ""));
            return;
        }

        if (window.location.hash.indexOf("#/list") === 0) {
            renderList();
            return;
        }

        if (window.defaultTemplate) {
            window.location.hash = "#/template/" + window.defaultTemplate;
        }
        else {
            renderList();
        }
    }

    $("#logout").click(function () {
        $("#logoutBtn").click();
    });

    $(".home").click(function () {
        window.location.href = window.location.href.split("#")[0] + "#/";
    });

    $("#openStudio").click(function () {
        var shortid = $("#page").data("shortid");
        var url = "";

        if (window.location.pathname !== "/client/") {
            url += "?skip=true";
        } else {
            url += "../";
        }

        window.location = url + "#extension/templates/" + shortid;
    });

    $("#switchMixedMode").click(function () {
        if (jsreportOptions.mode === "templates")
            jsreportOptions.mode = "reports";
        else
            jsreportOptions.mode = "templates";

        renderList();
    });


    $.getJSON("odata/templates?$select=name,shortid,isClientDefault,modificationDate", function (data) {
        window.templates = {};
        window.templatesList = data.value;
        for (var i = 0; i < data.value.length; ++i) {
            data.value[i].modificationDate = new Date(Date.parse(data.value[i].modificationDate)).toLocaleString();
            window.templates[data.value[i].shortid] = data.value[i];
            if (data.value[i].isClientDefault && !window.defaultTemplate) {//take the first one
                window.defaultTemplate = data.value[i].shortid;
            }
        }

        refresh();
    });

    if (!jsreportOptions.isAuthEnabled) {
        $("#logout").hide();
    }

    $(window).on('hashchange', refresh);
});
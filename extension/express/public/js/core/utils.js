define(["jquery"], function($) {
    var Utils = {};

    Utils.decodeBase64 = function(s) {
        var e = {}, i, k, v = [], r = '', w = String.fromCharCode;
        var n = [[65, 91], [97, 123], [48, 58], [43, 44], [47, 48]];

        for (z in n) {
            for (i = n[z][0]; i < n[z][1]; i++) {
                v.push(w(i));
            }
        }
        for (i = 0; i < 64; i++) {
            e[v[i]] = i;
        }

        for (i = 0; i < s.length; i += 72) {
            var b = 0, c, x, l = 0, o = s.substring(i, i + 72);
            for (x = 0; x < o.length; x++) {
                c = e[o.charAt(x)];
                b = (b << 6) + c;
                l += 6;
                while (l >= 8) {
                    r += w((b >>> (l -= 8)) % 256);
                }
            }
        }
        return r;
    };

    Utils.liveDropdowns = function(view) {
        var model = view.model;

        $(view.el).find('.dropdown-toggle').dropdown();
        
        $(view.el).find(".dropdown-toggle").next().find("li a").click(function (e) {
            var $dd = $(this).parent().parent().parent();
            var $btn = $dd.find('.dropdown-button');
            $btn.text($(this).text());
            $btn.attr("data-value", $(this).attr("data-value"));
            $btn.trigger("change");

            if ($dd.attr("data-binding") != null) {
                var path = $dd.attr("data-binding");
                model.set(path, $(this).attr("data-value"));
            }
        });


        $(view.el).find(".dropdown").each(function (index, dd) {
            var $dd = $(dd);
            if ($dd.attr("data-binding") != null) {
                var path = $dd.attr("data-binding");

                model.bind("change:" + path, function() {
                    var btn = $dd.find('.dropdown-button');
                    btn.text(model.get(path));
                    btn.attr("data-value", model.get(path));
                    btn.trigger("change");
                });
            }
        });

        $(view.el).find('.expandable-header').unbind();
        $(view.el).find('.expandable-header').on("click", function () {
            $(this).next().slideToggle({
                easing: "linear"
            });
        });
    };

    String.prototype.decodeBase64 = function() {
        return Utils.decodeBase64(this);
    };

    return Utils;
});
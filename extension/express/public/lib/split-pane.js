/*!

Split Pane v0.3

Copyright (c) 2012 Simon Hagström

Released under the MIT license
https://raw.github.com/shagstrom/split-pane/master/LICENSE

*/
(function ($) {

    $.fn.splitPane = function () {
        var $splitPanes = this;
        $splitPanes.each(setMinHeightAndMinWidth);
        $splitPanes.append('<div class="split-pane-resize-shim">');
        $splitPanes.children('.split-pane-divider').bind('mousedown', mousedownHandler);
        setTimeout(function () {
            // Doing this later because of an issue with Chrome (v23.0.1271.64) returning split-pane width = 0
            // and triggering multiple resize events when page is being opened from an <a target="_blank"> .
            $splitPanes.bind('_splitpaneparentresize', parentresizeHandler);
            $(window).trigger('resize');
        }, 100);
    };

    var SPLITPANERESIZE_HANDLER = '_splitpaneparentresizeHandler';

    /**
	 * A special event that will "capture" a resize event from the parent split-pane or window.
	 * The event will NOT propagate to grandchildren.
	 */
    jQuery.event.special._splitpaneparentresize = {
        setup: function (data, namespaces) {
            var element = this,
				parent = $(this).parent().closest('.split-pane')[0] || window;
            $(this).data(SPLITPANERESIZE_HANDLER, function (event) {
                var target = event.target === document ? window : event.target;
                if (target === parent) {
                    event.type = "_splitpaneparentresize";
                    jQuery.event.dispatch.apply(element, arguments);
                } else {
                    event.stopPropagation();
                }
            });
            $(parent).bind('resize', $(this).data(SPLITPANERESIZE_HANDLER));
        },
        teardown: function (namespaces) {
            var parent = $(this).parent().closest('.split-pane')[0] || window;
            $(parent).unbind('resize', $(this).data(SPLITPANERESIZE_HANDLER));
            $(this).removeData(SPLITPANERESIZE_HANDLER);
        }
    };

    function setMinHeightAndMinWidth() {
        var $splitPane = $(this),
			$firstComponent = $splitPane.children('.split-pane-component:first'),
			$divider = $splitPane.children('.split-pane-divider'),
			$lastComponent = $splitPane.children('.split-pane-component:last');
        if ($splitPane.is('.fixed-top, .fixed-bottom, .horizontal-percent')) {
            $splitPane.css('min-height', (minHeight($firstComponent) + minHeight($lastComponent) + $divider.height()) + 'px');
        } else {
            $splitPane.css('min-width', (minWidth($firstComponent) + minWidth($lastComponent) + $divider.width()) + 'px');
        }
    }

    function mousedownHandler(event) {
        event.preventDefault();
        var $resizeShim = $(this).siblings('.split-pane-resize-shim').show(),
			mousemove = createMousemove($(this).parent(), event.pageX, event.pageY);
        $(document).mousemove(mousemove);
        $(document).one('mouseup', function (event) {
            $(document).unbind('mousemove', mousemove);
            $resizeShim.hide();
        });
    }

    function parentresizeHandler() {
        var $splitPane = $(this),
			$firstComponent = $splitPane.children('.split-pane-component:first'),
			$divider = $splitPane.children('.split-pane-divider'),
			$lastComponent = $splitPane.children('.split-pane-component:last');
        if ($splitPane.is('.fixed-top')) {
            var maxfirstComponentHeight = $splitPane.height() - minHeight($lastComponent) - $divider.height();
            if ($firstComponent.height() > maxfirstComponentHeight) {
                setTop($splitPane, $firstComponent, $divider, $lastComponent, maxfirstComponentHeight + 'px');
            } else {
                $splitPane.resize();
            }
        } else if ($splitPane.is('.fixed-bottom')) {
            var maxLastComponentHeight = $splitPane.height() - minHeight($firstComponent) - $divider.height();
            if ($lastComponent.height() > maxLastComponentHeight) {
                setBottom($splitPane, $firstComponent, $divider, $lastComponent, maxLastComponentHeight + 'px')
            } else {
                $splitPane.resize();
            }
        } else if ($splitPane.is('.horizontal-percent')) {
            var maxLastComponentHeight = $splitPane.height() - minHeight($firstComponent) - $divider.height();
            if ($lastComponent.height() > maxLastComponentHeight) {
                setBottom($splitPane, $firstComponent, $divider, $lastComponent, (maxLastComponentHeight / $splitPane.height() * 100) + '%');
            } else {
                var lastComponentMinHeight = minHeight($lastComponent);
                if ($splitPane.height() - $firstComponent.height() - $divider.height() < lastComponentMinHeight) {
                    setBottom($splitPane, $firstComponent, $divider, $lastComponent, (lastComponentMinHeight / $splitPane.height() * 100) + '%');
                } else {
                    $splitPane.resize();
                }
            }
        } else if ($splitPane.is('.fixed-left')) {
            var maxFirstComponentWidth = $splitPane.width() - minWidth($lastComponent) - $divider.width();
            if ($firstComponent.width() > maxFirstComponentWidth) {
                setLeft($splitPane, $firstComponent, $divider, $lastComponent, maxFirstComponentWidth + 'px');
            } else {
                $splitPane.resize();
            }
        } else if ($splitPane.is('.fixed-right')) {
            var maxLastComponentWidth = $splitPane.width() - minWidth($firstComponent) - $divider.width();
            if ($lastComponent.width() > maxLastComponentWidth) {
                setRight($splitPane, $firstComponent, $divider, $lastComponent, maxLastComponentWidth + 'px')
            } else {
                $splitPane.resize();
            }
        } else if ($splitPane.is('.vertical-percent')) {
            var maxLastComponentWidth = $splitPane.width() - minWidth($firstComponent) - $divider.width();
            if ($lastComponent.width() > maxLastComponentWidth) {
                setRight($splitPane, $firstComponent, $divider, $lastComponent, (maxLastComponentWidth / $splitPane.width() * 100) + '%');
            } else {
                var lastComponentMinWidth = minWidth($lastComponent);
                if ($splitPane.width() - $firstComponent.width() - $divider.width() < lastComponentMinWidth) {
                    setRight($splitPane, $firstComponent, $divider, $lastComponent, (lastComponentMinWidth / $splitPane.width() * 100) + '%');
                } else {
                    $splitPane.resize();
                }
            }
        }
    }

    function createMousemove($splitPane, pageX, pageY) {
        var $firstComponent = $splitPane.children('.split-pane-component:first'),
			$divider = $splitPane.children('.split-pane-divider'),
			$lastComponent = $splitPane.children('.split-pane-component:last');
        if ($splitPane.is('.fixed-top')) {
            var firstComponentMinHeight = minHeight($firstComponent),
				maxFirstComponentHeight = $splitPane.height() - minHeight($lastComponent) - $divider.height(),
				topOffset = $divider.position().top - pageY;
            return function (event) {
                event.preventDefault();
                var top = Math.min(Math.max(firstComponentMinHeight, topOffset + event.pageY), maxFirstComponentHeight);
                setTop($splitPane, $firstComponent, $divider, $lastComponent, top + 'px')
            };
        } else if ($splitPane.is('.fixed-bottom')) {
            var lastComponentMinHeight = minHeight($lastComponent),
				maxLastComponentHeight = $splitPane.height() - minHeight($firstComponent) - $divider.height(),
				bottomOffset = $lastComponent.height() + pageY;
            return function (event) {
                event.preventDefault();
                var bottom = Math.min(Math.max(lastComponentMinHeight, bottomOffset - event.pageY), maxLastComponentHeight);
                setBottom($splitPane, $firstComponent, $divider, $lastComponent, bottom + 'px');
            };
        } else if ($splitPane.is('.horizontal-percent')) {
            var splitPaneHeight = $splitPane.height(),
				lastComponentMinHeight = minHeight($lastComponent),
				maxLastComponentHeight = splitPaneHeight - minHeight($firstComponent) - $divider.height(),
				bottomOffset = $lastComponent.height() + pageY;
            return function (event) {
                event.preventDefault();
                var bottom = Math.min(Math.max(lastComponentMinHeight, bottomOffset - event.pageY), maxLastComponentHeight);
                setBottom($splitPane, $firstComponent, $divider, $lastComponent, (bottom / splitPaneHeight * 100) + '%');
            };
        } else if ($splitPane.is('.fixed-left')) {
            var firstComponentMinWidth = minWidth($firstComponent),
				maxFirstComponentWidth = $splitPane.width() - minWidth($lastComponent) - $divider.width(),
				leftOffset = $divider.position().left - pageX;
            return function (event) {
                event.preventDefault();
                var left = Math.min(Math.max(firstComponentMinWidth, leftOffset + event.pageX), maxFirstComponentWidth);
                setLeft($splitPane, $firstComponent, $divider, $lastComponent, left + 'px')
            };
        } else if ($splitPane.is('.fixed-right')) {
            var lastComponentMinWidth = minWidth($lastComponent),
				maxLastComponentWidth = $splitPane.width() - minWidth($firstComponent) - $divider.width(),
				rightOffset = $lastComponent.width() + pageX;
            return function (event) {
                event.preventDefault();
                var right = Math.min(Math.max(lastComponentMinWidth, rightOffset - event.pageX), maxLastComponentWidth);
                setRight($splitPane, $firstComponent, $divider, $lastComponent, right + 'px');
            };
        } else if ($splitPane.is('.vertical-percent')) {
            var splitPaneWidth = $splitPane.width(),
				lastComponentMinWidth = minWidth($lastComponent),
				maxLastComponentWidth = splitPaneWidth - minWidth($firstComponent) - $divider.width(),
				rightOffset = $lastComponent.width() + pageX;
            return function (event) {
                event.preventDefault();
                var right = Math.min(Math.max(lastComponentMinWidth, rightOffset - event.pageX), maxLastComponentWidth);
                setRight($splitPane, $firstComponent, $divider, $lastComponent, (right / splitPaneWidth * 100) + '%');
            };
        }
    }

    function minHeight($element) {
        return parseInt($element.css('min-height')) || 0;
    }

    function minWidth($element) {
        return parseInt($element.css('min-width')) || 0;
    }

    function setTop($splitPane, $firstComponent, $divider, $lastComponent, top) {
        $firstComponent.css('height', top);
        $divider.css('top', top);
        $lastComponent.css('top', top);
        $splitPane.resize();
    }

    function setBottom($splitPane, $firstComponent, $divider, $lastComponent, bottom) {
        $firstComponent.css('bottom', bottom);
        $divider.css('bottom', bottom);
        $lastComponent.css('height', bottom);
        $splitPane.resize();
    }

    function setLeft($splitPane, $firstComponent, $divider, $lastComponent, left) {
        $firstComponent.css('width', left);
        $divider.css('left', left);
        $lastComponent.css('left', left);
        $splitPane.resize();
    }

    function setRight($splitPane, $firstComponent, $divider, $lastComponent, right) {
        $firstComponent.css('right', right);
        $divider.css('right', right);
        $lastComponent.css('width', right);
        $splitPane.resize();
    }

})(jQuery);

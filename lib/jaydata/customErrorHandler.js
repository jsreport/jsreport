module.exports = function (err, req, res, next) {
    /*var accept = req.headers.accept || '';
    if (~accept.indexOf('json')) {
        if (err.status) res.statusCode = err.status;
        if (res.statusCode < 400) res.statusCode = 500;

        var error = { message: { value: err.message, lang: err.lang || 'en-US' }, stack: err.stack };
        for (var prop in err) { if (prop !== 'message') error[prop] = err[prop]; }
        var json = JSON.stringify({ error: error });

        res.setHeader('Content-Type', 'application/json');
        res.end(json);
    } else {
        next(err);
    }*/

    if (err.name === 'CancelEvent') {
        if (process.domain.req && process.domain.req.customError) {
            return next(process.domain.req.customError)
        };
        err.message = "Unauthorized for this action.";
    }
    next(err);
}
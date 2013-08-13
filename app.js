var bogart = require('bogart'),
    Draft2GitHub = require('./lib/draft2github.js').Draft2GitHub;

var draft2GitHub = new Draft2GitHub(require('./settings.json'));

var router     = bogart.router();
router.post('/', function (req) {
    return draft2GitHub.newPost(JSON.parse(req.body.payload));
});

var app = bogart.app();

// Include batteries, a default JSGI stack.
app.use(bogart.batteries);

// Include our router, it is significant that this is included after batteries.
app.use(router);

var port = process.env.PORT || 5000;
app.start(port);

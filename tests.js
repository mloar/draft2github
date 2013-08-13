var vows = require('vows')
,assert = require('assert')
,bogart = require('bogart')
,events = require('events')
,gh = require('github3')
,Draft2GitHub = require('./lib/draft2github.js').Draft2GitHub
;

// These tests assume you have forked the draft2github repo in your GitHub account.
var settings = require('./settings.json');
settings.repo_name = "draft2github";
settings.branch = "test";

gh.setAccessToken(settings.access_token);

var updateRefHead = bogart.promisify(gh.updateRefHead, gh);

updateRefHead(settings.repo_name, settings.user_name, settings.branch, '9538fe33f2d409e630b4ada221fc447bad6b87d1', true
).then(function () {
    var post = {
        name: 'Hi',
        content: "Hello, world!",
        created_at: new Date(),
        user: {
            email: 'matt@loar.name'
        }
    };
    vows.describe('Create Post').addBatch({
        'Draft2GitHub': {
            topic: new Draft2GitHub(settings),
            'calling newPost': {
                topic: function (draft2GitHub) {
                    var emitter = new(events.EventEmitter);

                    draft2GitHub.newPost(post).then(function (ret) {
                        emitter.emit('success', ret);
                    }, function (err) {
                        emitter.emit('error', err);
                    });

                    return emitter;
                },
                'returns correct Location': function (ret) {
                    assert.equal(
                        ret.headers.Location,
                        'http://matt.loar.name/'
                        + post.created_at.toISOString().substr(0, 10).replace(/-/g, '/')
                        + '/hi.html'
                    );
                }
            }
        }
    }).run();
});

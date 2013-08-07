var bogart  = require('bogart');

var getPostPath = function (draft_data) {
    return new Date(draft_data.created_at).toISOString().substr(0, 10) + '-'
        + draft_data.name.replace(/ /g, '-').replace(/[\/\\%&?:]/g, '').toLowerCase();
};

var getPostUrl = function (draft_data) {
    return new Date(draft_data.created_at).toISOString().substr(0, 10).replace(/-/g, '/') + '/'
        + draft_data.name.replace(/ /g, '-').replace(/[\/\\%&?:]/g, '').toLowerCase() + '.html';
};

var getContentForPost = function (draft_data) {
    return "---\n" +
        "layout: post\n" +
        "title: \"" + draft_data.name + "\"\n" +
        "date: " + draft_data.created_at +"\n" +
        "---\n\n" +
        draft_data.content;
};

var newGitHubPagesPost = function (draft_data) {
    var settings = require('./settings.json');
    var gh     = require('github3');
    gh.setAccessToken(settings.access_token);
    var getRef = bogart.promisify(gh.getLastCommitRef, gh);
    var getTree= bogart.promisify(gh.getTree, gh);
    var createTreeAndAddFile= bogart.promisify(gh.createTreeAndAddFile, gh);
    var updateRefHead= bogart.promisify(gh.updateRefHead, gh);
    var createCommit= bogart.promisify(gh.createCommit, gh);
    var last_commit;

    return getRef(settings.repo_name, settings.user_name, settings.branch).then(function (ref) {
        last_commit = ref.object.sha;
        return getTree(settings.repo_name, settings.user_name, ref.object.sha);
    }).then(function (oldTree) {
        var post_date = new Date(draft_data.created_at);
        return createTreeAndAddFile(settings.repo_name, settings.user_name, '_posts/' + getPostPath(draft_data) + '.markdown',
        getContentForPost(draft_data), oldTree.sha).then(function (newTree) {
            return createCommit(settings.repo_name, settings.user_name, "New post from Draft", newTree.sha, last_commit,
                {'email': draft_data.user.email, 'date': new Date().toISOString()});
        });
    }).then(function (commit) {
        return updateRefHead(settings.repo_name, settings.user_name, settings.branch, commit.sha, false);
    }).then(function (result) {
        var str = JSON.stringify(result);
        return {
            status: 200,
            body: [str],
            headers: {
                "Location": "http://" + settings.repo_name + "/" + getPostUrl(draft_data),
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(str, "utf-8")
            }
        };
    });
};

var router     = bogart.router();
router.post('/', function (req) {
    return newGitHubPagesPost(JSON.parse(req.body.payload));
});

var app = bogart.app();

// Include batteries, a default JSGI stack.
app.use(bogart.batteries);

// Include our router, it is significant that this is included after batteries.
app.use(router);

var port = process.env.PORT || 5000;
app.start(port);

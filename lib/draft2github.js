var bogart  = require('bogart');

var getPostPath = function (draft_data) {
    return new Date(draft_data.created_at).toISOString().substr(0, 10) + '-'
        + draft_data.name.replace(/ /g, '-').replace(/[\/\\%&?@'":]/g, '').toLowerCase();
};

var getPostUrl = function (draft_data) {
    return new Date(draft_data.created_at).toISOString().substr(0, 10).replace(/-/g, '/') + '/'
        + draft_data.name.replace(/ /g, '-').replace(/[\/\\%&?@'":]/g, '').toLowerCase() + '.html';
};

var getContentForPost = function (draft_data) {
    return new Buffer("---\n" +
        "layout: post\n" +
        "title: \"" + draft_data.name + "\"\n" +
        "date: " + draft_data.created_at +"\n" +
        "---\n\n" +
        draft_data.content, 'utf8');
};

exports.Draft2GitHub = function (settings) {
    this.newPost = function (draft_data) {
        var gh     = require('github3');
        gh.setAccessToken(settings.access_token);
        var getRef = bogart.promisify(gh.getLastCommitRef, gh);
        var getTree = bogart.promisify(gh.getTree, gh);
        var createBlob = bogart.promisify(gh.createBlob, gh);
        var createTreeWithBlob = bogart.promisify(gh.createTreeWithBlob, gh);
        var updateRefHead = bogart.promisify(gh.updateRefHead, gh);
        var getBlobText = bogart.promisify(gh.getBlobText, gh);
        var createCommit = bogart.promisify(gh.createCommit, gh);
        var last_commit;
        var old_tree;

        return getRef(settings.repo_name, settings.user_name, settings.branch).then(function (ref) {
            last_commit = ref.object.sha;
            return getTree(settings.repo_name, settings.user_name, ref.object.sha);
        }).then(function (oldTree) {
            old_tree = oldTree;
            var post_date = new Date(draft_data.created_at);
            return createBlob(settings.repo_name, settings.user_name, getContentForPost(draft_data)).then(function (blob) {
                return createTreeWithBlob(settings.repo_name, settings.user_name, '_posts/' + getPostPath(draft_data) + '.markdown',
                blob.sha, oldTree.sha); });
        }).then(function (newTree) {
            return createCommit(settings.repo_name, settings.user_name, "New post from Draft", newTree.sha, last_commit,
                {'email': draft_data.user.email, 'date': new Date().toISOString()});
        }).then(function (commit) {
            return updateRefHead(settings.repo_name, settings.user_name, settings.branch, commit.sha, false);
        }).then(function (result) {
            var str = JSON.stringify(result);
            var returning = function (host_name) {
                return {
                    status: 200,
                    body: [str],
                    headers: {
                        "Location": "http://" + host_name + "/" + getPostUrl(draft_data),
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(str, "utf-8")
                    }
                };
            };

            var cname_item = old_tree.tree.filter(function (item) { return item.path == 'CNAME'; } );
            if (cname_item.length == 1) {
                return getBlobText(settings.repo_name, settings.user_name, cname_item[0].sha).then(function (data) {
                    return returning(data.content.trim());
                });
            } else {
                return returning(settings.repo_name);
            }
        });
    };
};

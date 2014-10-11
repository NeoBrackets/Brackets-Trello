define(function (require, exports, module) {
    'use strict';

    var Comment = require('modules/objects/comment'),
        // TODO trello Support html next step
        commentRegexp = {
            'javascript': {
                prefix: '(?:\\/\\/)+\\s*(',
                suffix: '\\s*)\\s*\\bTrello\\b[:\\s]\\s*(.*?)(?=\\n|\\r\\n|\\r|$)'
            }
        };

    function parseText(content, tags, type) {
        var commentExp = null,
            tagExp = '',
            matchArray = null,
            trelloMatchArray = null,
            trelloComment = null,
            otherTrelloComments = [],
            allTrelloComments = [];

        if (commentRegexp[type] === undefined) {
            return allTrelloComments;
        }

        if (tags !== undefined && tags !== null || tags.length > 0) {
            tags.forEach( function(tag){
                tagExp = tagExp + tag + '|';
            });
        }

        commentExp = new RegExp(commentRegexp[type].prefix + tagExp + commentRegexp[type].suffix, 'gi');
        while ((matchArray = commentExp.exec(content)) !== null) {
            trelloComment = new Comment();
            trelloComment.tag(matchArray[1]);
            trelloComment.content(matchArray[2]);
            trelloComment.lineNumber(matchArray.index);
            trelloComment.lineCh(matchArray.index - content.lastIndexOf( '\n' , matchArray.index ) - 1);
            allTrelloComments.push(trelloComment);
        }

        // find comments using /**/to comment.
        if (type === 'javascript') {
            otherTrelloComments = parseTrelloCommentsOfAnotherJSSyntax(content, tags);
            otherTrelloComments.forEach(function(comment){
               allTrelloComments.push(comment);
            });
            if (otherTrelloComments.length > 0) {
                allTrelloComments = sortAndFilterSameComments(allTrelloComments);
            }
        }

        return allTrelloComments;
    }

    // find trello comment annotated by /**/
    function parseTrelloCommentsOfAnotherJSSyntax(content, tags) {
        var commentRegex = new RegExp('\\/\\*(?!\\/\\*)((\\w|\\W)*?)\\*\\/', 'gi'),
            tagExp = '',
            trelloRegex = null,
            lastIndex = 0,
            matchCommentArray = null,
            matchTrelloArray = null,
            trelloComment = null,
            trelloComments = [];

        if (tags !== null && tags !== undefined && tags.length > 0) {
            tags.forEach( function(tag){
                tagExp = tagExp + tag + '|';
            });
        }

        trelloRegex = new RegExp('\\s*(' + tagExp + '\\s*)\\s*\\bTrello\\b[:\\s]\\s*(.*?)(?=\\n|\\r\\n|\\r|$)', 'gi');

        while ((matchCommentArray = commentRegex.exec(content)) !== null) {

            lastIndex = 0;
            while ((matchTrelloArray = trelloRegex.exec(matchCommentArray[1])) !== null) {
                // we check trello prefix manually, because js does no support reverse look expression.
                if (isTrelloCommentPrefix(matchCommentArray[1].substr(lastIndex, matchTrelloArray.index - lastIndex))) {
                    trelloComment = new Comment();
                    trelloComment.tag(matchTrelloArray[1]);
                    trelloComment.content(matchTrelloArray[2]);
                    trelloComment.lineNumber(matchCommentArray.index + matchTrelloArray.index);
                    trelloComments.push(trelloComment);
                }
                lastIndex = matchTrelloArray.index + matchTrelloArray[0].length;
            }
        }

        return trelloComments;
    }

    /**
     * trello: comment prefix is composed of * or // and all space
     * */
    function isTrelloCommentPrefix(str) {
        var regex = new RegExp('^[\\s\\*\\/\\/]*$', 'gi');
        return str.match(regex) !== null;
    }

    /**
     * sort comments by line num in ascending order, and remove duplicate comment.
     * return sorted comments
     * */
    function sortAndFilterSameComments(comments) {
        var index = 0,
            len = 0;

        comments.sort( function(comment1, comment2){
            return comment1.lineNumber() > comment2.lineNumber() ? 1 : -1;
        } );

        // remove duplicate comment
        for (index = 1; index < comments.length; index++) {
            if (comments[index].equals(comments[index-1])) {
                comments.splice(index, 1);
                index--;
            }
        }

        return comments;
    }

    function isSupported(fileType) {
        return commentRegexp[fileType] !== undefined;
    }

    // export public APIs
    exports.parseText = parseText;
    exports.sortAndFilterSameComments = sortAndFilterSameComments;
    exports.isSupported = isSupported;
});

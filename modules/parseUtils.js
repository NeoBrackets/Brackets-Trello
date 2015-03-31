define(function (require, exports, module) {
    'use strict';

    var Comment = require('modules/objects/comment'),
        commentRegexp = {
            'javascript': {
                prefix: '(?:\\/\\/)+\\s*\\bTrello\\b',
                suffix: '\\s*([^:].*?)?\\s*:\\s*(.*?)\\s*(?:\\[([a-f0-9]{24})\\])?\\s*(?:$|\\n|\\r\\n|\\r)'
            },
            'html': {
                prefix: '(?:<!--)+\\s*\\bTrello\\b',
                suffix: '\\s*([^:].*?)?\\s*:\\s*(.*?)\\s*(?:\\[([a-f0-9]{24})\\])?\\s*-->'
            },
            'php': {
				prefix: '(?:\\/\\/|#)+\\s*\\bTrello\\b',
                suffix: '\\s*([^:].*?)?\\s*:\\s*(.*?)\\s*(?:\\[([a-f0-9]{24})\\])?\\s*(?:$|\\n|\\r\\n|\\r)'
            }
        };

    function parseText(content, type) {
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
        
        if (type === 'php') {
            commentExp = new RegExp(commentRegexp.html.prefix + tagExp + commentRegexp.html.suffix, 'gi');
            while ((matchArray = commentExp.exec(content)) !== null) {
                trelloComment = new Comment();
				trelloComment.fullContent(matchArray[0]);
                trelloComment.tag(matchArray[1]);
                trelloComment.content(matchArray[2]);
				trelloComment.cardId(matchArray[3]);
                trelloComment.lineNumber(matchArray.index);
				trelloComment.endLineNumber(matchArray.index + matchArray[0].lastIndexOf(matchArray[2]) + matchArray[2].length);
                trelloComment.lineCh(matchArray.index - content.lastIndexOf( '\n' , matchArray.index ) - 1);
				trelloComment.endLineCh(trelloComment.endLineNumber() - content.lastIndexOf( '\n' , trelloComment.endLineNumber() - 1 ) - 1);
                allTrelloComments.push(trelloComment);
            }
            
            otherTrelloComments = parsePhpTrelloComments(content);
            otherTrelloComments.forEach(function(comment){
               allTrelloComments.push(comment);
            });
            if (otherTrelloComments.length > 0) {
                allTrelloComments = sortAndFilterSameComments(allTrelloComments);
            }
        } else {
            commentExp = new RegExp(commentRegexp[type].prefix + tagExp + commentRegexp[type].suffix, 'gi');
            while ((matchArray = commentExp.exec(content)) !== null) {
                trelloComment = new Comment();
				trelloComment.fullContent(matchArray[0]);
                trelloComment.tag(matchArray[1]);
                trelloComment.content(matchArray[2]);
				trelloComment.cardId(matchArray[3]);
                trelloComment.lineNumber(matchArray.index);
				trelloComment.endLineNumber(matchArray.index + matchArray[0].lastIndexOf(matchArray[2]) + matchArray[2].length);
                trelloComment.lineCh(matchArray.index - content.lastIndexOf( '\n' , matchArray.index ) - 1);
				trelloComment.endLineCh(trelloComment.endLineNumber() - content.lastIndexOf( '\n' , trelloComment.endLineNumber() - 1 ) - 1);
                allTrelloComments.push(trelloComment);
            }

            // don't find comments using /**/to comment. Because of efficiency
//            if (type === 'javascript') {
//                otherTrelloComments = parseTrelloCommentsOfMultiLineJSSynta(content);
//                otherTrelloComments.forEach(function(comment){
//                   allTrelloComments.push(comment);
//                });
//                if (otherTrelloComments.length > 0) {
//                    allTrelloComments = sortAndFilterSameComments(allTrelloComments);
//                }
//            }
        }

        return allTrelloComments;
    }

    // find trello comment annotated by /**/
    function parseTrelloCommentsOfMultiLineJSSynta(content, tags) {
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
					trelloComment.fullContent(matchArray[0]);
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
    
    // find trello comment annotated by /**/
    function parsePhpTrelloComments(content) {
        var commentRegex = new RegExp('(?:<\\?|<\\?php)(?!(?:<\\?|<\\?php))((\\w|\\W)*?)\\?>', 'gi'),
            tagExp = '',
            trelloRegex = null,
            lastIndex = 0,
            matchCommentArray = null,
            matchTrelloArray = null,
            trelloComment = null,
            trelloComments = [];

        trelloRegex = new RegExp(commentRegexp.php.prefix + tagExp + commentRegexp.php.suffix, 'gi');
        while ((matchCommentArray = commentRegex.exec(content)) !== null) {

            lastIndex = 0;
            while ((matchTrelloArray = trelloRegex.exec(matchCommentArray[0])) !== null) {
                trelloComment = new Comment();
				trelloComment.fullContent(matchTrelloArray[0]);
                trelloComment.tag(matchTrelloArray[1]);
                trelloComment.content(matchTrelloArray[2]);
				trelloComment.cardId(matchTrelloArray[3]);
                trelloComment.lineNumber(matchCommentArray.index + matchTrelloArray.index);
				trelloComment.endLineNumber(trelloComment.lineNumber() + matchTrelloArray[0].lastIndexOf(matchTrelloArray[2]) + matchTrelloArray[2].length);
                trelloComment.lineCh(trelloComment.lineNumber() - content.lastIndexOf( '\n', trelloComment.lineNumber() ) - 1);
				trelloComment.endLineCh(trelloComment.endLineNumber() - content.lastIndexOf( '\n' , trelloComment.endLineNumber() -1 ) - 1);
                trelloComments.push(trelloComment);
                lastIndex = matchTrelloArray.index + matchTrelloArray[0].length;
            }
            
            // don't parse multiple line comment now because of efficiency
//            parseTrelloCommentsOfMultiLineJSSynta(matchCommentArray[0]).forEach( pushPhpMultiLineComment );
        }
        
        function pushPhpMultiLineComment(comment){
            comment.lineNumber(matchCommentArray.index + comment.lineNumber());
            trelloComments.push(comment);
        }

        return trelloComments;
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

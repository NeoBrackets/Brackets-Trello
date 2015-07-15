define(function (require, exports, module) {
    'use strict';

    var Async = brackets.getModule('utils/Async'),
        ProjectManager = brackets.getModule('project/ProjectManager'),
        DocumentManager = brackets.getModule('document/DocumentManager'),
        LanguageManager = brackets.getModule('language/LanguageManager'),
        FileSystem = brackets.getModule('filesystem/FileSystem'),
        StringUtils = brackets.getModule('utils/StringUtils'),

        FileManager = require('modules/fileManager'),
        ParseUtils = require('modules/parseUtils'),
        Events = require('modules/events'),

        newestComments = [];

    /**
     * setup parser on startup
     * */
    function setup() {
        // parsing will spend a lot of time, so do it asynchronously
        asynFindTrelloComments();
        registerFileChangeListener();
    }

    /**
     * Listen on all file change event to update trello comments.
     * */
    function registerFileChangeListener() {

        var $documentManager = DocumentManager;
        var $projectManager = ProjectManager;
        FileSystem.on('change', function (event, file) {
            // Bail if not a file or file is outside current project root.
            if (file === null || file.isFile !== true || file.fullPath.indexOf(ProjectManager.getProjectRoot().fullPath) === -1) {
                return false;
            }

            //TODO trello anzhihun update trello comments on file change.
//            console.log('Brackets-Trello: change file ' + file.fullPath + ', event = ' + event);
            if (ParseUtils.isSupported(LanguageManager.getLanguageForPath(file.fullPath).getId())) {
                // Just find again now
                asynFindTrelloComments();
            }

        });

        FileSystem.on('rename', function (event, oldName, newName) {
            //TODO trello anzhihun update trello comments on file name change.
//            console.log('Brackets-Trello: rename old file ' + oldName + ' to ' + newName + ', event = ' + event);
            if (ParseUtils.isSupported(LanguageManager.getLanguageForPath(oldName).getId()) ||
                ParseUtils.isSupported(LanguageManager.getLanguageForPath(newName).getId())) {
                // Just find again now
                asynFindTrelloComments();
            }
        });
        
        $projectManager.on('projectOpen', function(event, directory){
           // reparse 
            asynFindTrelloComments();
        });
    }

    function asynFindTrelloComments() {
        window.setTimeout(function () {
            findTrelloComments();
        }, 1000);
    }

    /**
     * parse all support files in current project to find trello comment.
     * return all trello comments
     * */
    function findTrelloComments() {
        //TODO Trello Find trello comment in all files now.
        var filesPromise = FileManager.getFiles(),
            trelloComments = [],
            startTime = new Date().getTime();

        filesPromise.done(function (files) {

            if (files.length === 0) {
                console.log('[Brackets-Trello] parse file use time ' + (new Date().getTime() - startTime) + ' ms');
                updateTrelloComments(trelloComments);
                return;
            }

            // Go through each file asynchronously.
            Async.doInParallel(files, function (file) {
                var result = new $.Deferred();

                DocumentManager.getDocumentText(file).done(function (content) {

                    var oneFileComments = parseFile(file, content);
                    oneFileComments.forEach(function (comment) {
                        trelloComments.push(comment);
                    });
                }).always(function () {
                    // Move on to next file.
                    result.resolve();
                });

                return result.promise();
            }).always(function () {

                console.log('[Brackets-Trello] parse file use time ' + (new Date().getTime() - startTime) + ' ms');
                updateTrelloComments(trelloComments);
            });
        });
    }

    /**
     * parse trello comments in one file.
     * return trello comment array, if there is no trello comment, then return empty array.
     * */
    function parseFile(file, content) {
        var trelloComments = [],
            lines = StringUtils.getLines(content),
            languageId = LanguageManager.getLanguageForPath(file.fullPath).getId();

        trelloComments = ParseUtils.parseText(content, languageId);

        // add path and process line num
        trelloComments.forEach(function (comment) {
            comment.filePath(file.fullPath);
            comment.lineNumber(StringUtils.offsetToLineNum(lines, comment.lineNumber()) + 1);
			comment.endLineNumber(StringUtils.offsetToLineNum(lines, comment.endLineNumber()) + 1);
        });

        return trelloComments;
    }

    function updateTrelloComments(comments) {
        newestComments = comments;
        Events.publish('comments:updated');
    }

    function onTrelloCommentsChange(callback) {
        Events.subscribe('comments:updated', function () {
            if ($.isFunction(callback)) {
                callback(newestComments);
            }
        });
    }

    function getTrelloComments() {
        return newestComments;
    }

    exports.setup = setup;
    exports.onTrelloCommentsChange = onTrelloCommentsChange;
    exports.getTrelloComments = getTrelloComments;

});

/*!
 * This file is modified from Brackets Todo 0.8.0
 *
 * @author Mikael Jorhult
 * @license http://mikaeljorhult.mit-license.org MIT
 */
define(function (require, exports) {
    'use strict';

    // Get dependencies.
    var LanguageManager = brackets.getModule('language/LanguageManager'),
        ProjectManager = brackets.getModule('project/ProjectManager'),

        ParseUtils = require('modules/parseUtils');

    /**
     * Return all files to be parsed.
     */
    function getFiles() {
        return ProjectManager.getAllFiles(getFilter());
    }

    /**
     * Return function with logic to getAllFiles() to exclude folders and files.
     */
    function getFilter() {
        return function filterFunction(file) {
            var languageID = LanguageManager.getLanguageForPath(file.fullPath).getId();

            // Don't parse files not recognized by Brackets.
            if (['unknown', 'binary', 'image'].indexOf(languageID) > -1) {
                return false;
            }

            // TODO Trello anzhihun Exculde some files next step.
            if (!ParseUtils.isSupported(languageID)) {
                return false;
            }
            return true;
        };
    }

    // export public APIs
    exports.getFiles = getFiles;
});

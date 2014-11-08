define(function(require, exports, module){
    'use strict';

    var comment = function(){
        this._filePath = '';
        this._lineNum = -1;
        this._content = '';
        this._tag = '';
        this._lineCh = 0;
        this._cardId = false;
    };

    comment.prototype.filePath = function(filePath) {
        if (filePath === undefined) {
            return this._filePath;
        }

        this._filePath = filePath;
    };

    comment.prototype.lineNumber = function(lineNum) {
        if (lineNum === undefined) {
            return this._lineNum;
        }

        this._lineNum = lineNum;
    };

    comment.prototype.content = function(content) {
        if (content === undefined) {
            return this._content;
        }
        this._content = content;
    };

    comment.prototype.tag = function(tag) {
        if (tag === undefined) {
            return this._tag;
        }
        this._tag = tag;
    };

    comment.prototype.lineCh = function(ch) {
        if (ch === undefined) {
            return this._lineCh;
        }

        this._lineCh = ch;
    };

	comment.prototype.cardId = function(cardId) {
        if (cardId === undefined) {
            return this._cardId;
        }

        this._cardId = cardId;
    };

    comment.prototype.equals = function(otherComment) {
        return this._lineNum === otherComment.lineNumber() && this._filePath === otherComment.filePath() && this._content === otherComment.content();
    };

    return comment;

});

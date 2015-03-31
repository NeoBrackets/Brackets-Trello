define(function (require, exports, module) {
	'use strict';

	var comment = function () {
		this._filePath = '';
		this._lineNum = -1;
		this._endLineNum = -1;
		this._content = '';
		this._tag = '';
		this._lineCh = 0;
		this._endLineCh = 0;
		this._cardId = false;
		this._fullContent = '';
	};

	comment.prototype.filePath = function (filePath) {
		if (filePath === undefined) {
			return this._filePath;
		}

		this._filePath = filePath;
	};

	comment.prototype.lineNumber = function (lineNum) {
		if (lineNum === undefined) {
			return this._lineNum;
		}

		this._lineNum = lineNum;
	};

	comment.prototype.endLineNumber = function (lineNum) {
		if (lineNum === undefined) {
			return this._endLineNum;
		}

		this._endLineNum = lineNum;
	};

	comment.prototype.content = function (content) {
		if (content === undefined) {
			return this._content;
		}
		this._content = content;
	};

	comment.prototype.fullContent = function (fullContent) {
		if (fullContent === undefined) {
			return this._fullContent;
		}
		this._fullContent = fullContent;
	};

	comment.prototype.tag = function (tag) {
		if (tag === undefined) {
			return this._tag;
		}
		this._tag = tag;
	};

	comment.prototype.lineCh = function (ch) {
		if (ch === undefined) {
			return this._lineCh;
		}

		this._lineCh = ch;
	};

	comment.prototype.endLineCh = function (ch) {
		if (ch === undefined) {
			return this._endLineCh;
		}

		this._endLineCh = ch;
	};

	comment.prototype.cardId = function (cardId) {
		if (cardId === undefined) {
			return this._cardId;
		}

		this._cardId = cardId;
	};

	comment.prototype.equals = function (otherComment) {
		return this._filePath === otherComment.filePath() &&
			this._lineNum === otherComment.lineNumber() &&
			this._lineCh === otherComment.lineCh() &&
			this._endLineNum === otherComment.endLineNumber() &&
			this._endLineCh === otherComment.endLineCh();
	};

	return comment;

});
/*global define, brackets */

define(function (require, exports, module) {
	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');

	// Return User Boards
	function _getUserBoards() {
		var result = $.Deferred();
		var data = {
			boards: [
				{
					name: 'Brackets QuickDocsJS',
					id: 'a'
				},
				{
					name: 'Brackets Trello',
					id: 'b'
				}
			]
		};
		result.resolve(data);
		return result.promise();
	}

	function _getBoardLists() {
		var result = $.Deferred();
		var data = {
			name: 'Brackets QuickDocsJS',
			lists: [
				{
					name: 'Release',
					id: 'aa',
					totalCards: 9
				},
				{
					name: 'Todo',
					id: 'ab',
					totalCards: 3
				},
				{
					name: 'Doing',
					id: 'ac',
					totalCards: 4
				},
				{
					name: 'Done',
					id: 'ad',
					totalCards: 3
				}
			]
		};
		result.resolve(data);
		return result.promise();
	}

	function _getListCards() {
		var result = $.Deferred();

		var data = {
			boardName: 'Brackets QuickDocsJS',
			listName: 'Release',
			cards: [
				{
					name: 'Create a github Repo',
					id: 'aaa',
					totalTasks: 10,
					completedTasks: 4
				},
				{
					name: 'Create a release branch',
					id: 'aab',
					totalTasks: 5,
					completedTasks: 3
				},
				{
					name: 'Create documentation',
					id: 'aac',
					totalTasks: 13,
					completedTasks: 11
				}
			]
		};
		result.resolve(data);
		return result.promise();
	}

	function _getCardTasks() {
		var result = $.Deferred();

		var data = {
			boardName: 'Brackets QuickDocsJS',
			listName: 'Doing',
			cardName: 'Create a github Repo',
			desc: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Porro harum ipsa natus dolore provident consequatur magnam, consectetur voluptatem repellat expedita officia officiis cum eaque vitae, architecto et, quas cumque accusantium',
			tasks: [
				{
					name: 'Register a github username',
					id: 'aea',
					checked: true
				},
				{
					name: 'Create an organization',
					id: 'aeb',
					checked: 'true'
				},
				{
					name: 'Create a new repo',
					id: 'aec',
					checked: false
				}
			],
			members: [
				{
					name: 'Member 1', path: '/1.png'
				},
				{
					name: 'Member 2', path: '/2.png'
				}
			]
		};

		result.resolve(data);
		return result.promise();
	}

	function _createNewBoard(name) {
		alert('Created ' + name + ' card!');
	}

	function _createNewList(name) {
		alert('Created' + name + ' list');
	}

	function _createNewTasks(names) {

	}
	
	exports._getUserBoards = _getUserBoards;
	exports._getBoardLists = _getBoardLists;
	exports._getListCards = _getListCards;
	exports._getCardTasks = _getCardTasks;
	exports._createNewBoard = _createNewBoard;
	exports._createNewList = _createNewList;
	exports._createNewTasks = _createNewTasks;
});
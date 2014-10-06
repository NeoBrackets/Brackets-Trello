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
					totalCards: 3,
					cards: [
						{
							name: 'Create a github Repo',
							id: 'aaa',
							taskCount: ''
						},
						{
							name: 'Create a release branch',
							id: 'aab',
							taskCount: '3/5'
						},
						{
							name: 'Create documentation',
							id: 'aac',
							taskCount: '10/14'
						}
					]
				},
				{
					name: 'Todo',
					id: 'ab',
					totalCards: 3,
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
				},
				{
					name: 'Doing',
					id: 'ac',
					totalCards: 4
				},
				{
					name: 'Done',
					id: 'ad',
					totalCards: 3,
					cards: [
						{
							name: 'Create a github Repo',
							id: 'aaa',
							totalTasks: 0,
							completedTasks: 0
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
			name: 'Create a github Repo',
			desc: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Porro harum ipsa natus dolore provident consequatur magnam, consectetur voluptatem repellat expedita officia officiis cum eaque vitae, architecto et, quas cumque accusantium',
			activeUsername: 'member1',
			activeUserRole: 'user',
			checklists: [
				{
					id: "aaaa",
					name: "Main Checklist",
					checkItems: [
						{
							name: 'Register a github username',
							id: 'aea',
							checked: true
						},
						{
							name: 'Create an organization',
							id: 'aeb',
							checked: true
						},
						{
							name: 'Create a new repo',
							id: 'aec',
							checked: false
						},
						{
							name: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore odit omnis molestiae temporibus nesciunt',
							id: 'aad',
							checked: false
						}
					]
				},
				{
					id: "aaab",
					name: "Release Tasks",
					checkItems: [
						{
							name: "Create builds for Win/Mac/Linux",
							id: "dafsda",
							checked: false
						},
						{
							name: "Release the build via github",
							id: "dasdasdass",
							checked: false
						}
					]
				}
			],
			members: [
				{
					avatarHash: "fdfadfas", fullName: 'Member 1', username: 'member1'
				},
				{
					avatarHash: "dfadsfas", fullName: 'Member 2', username: 'member2'
				}
			],
			comments: [
				{
					id: "aaaaa",
					avatarHash: "fdfadfas",
					fullName: "Member 1",
					username: "member1",
					comment: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Et accusantium ab, eligendi neque, voluptatum, magni possimus laudantium sit nam dolorem veniam eum labore, soluta impedit? Sunt dignissimos temporibus, obcaecati recusandae."
				},
				{
					id: "bbbbb",
					avatarHash: "dfadsfas",
					fullName: "Member 2",
					username: "member2",
					comment: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Et accusantium ab, eligendi neque, voluptatum, magni possimus laudantium sit nam dolorem veniam eum labore."
				},
				{
					id: "ccccc",
					avatarHash: "dfadsfas",
					fullName: "Member 3",
					username: "member1",
					comment: "Lorem ipsum dolor sit amet, consectetur adipisicing elit."
				}
			]
		};

		result.resolve(data);
		return result.promise();
	}

	function _getBoardMembers() {
		var result = $.Deferred();
		return result.resolve({
			members: [
				{
					fullName: "Member 1", username: "member1", avatarHash: "fdfadfas"
				},
				{
					fullName: "Member 2", username: "member2", avatarHash: "dfadsfas"
				},
				{
					fullName: "Member 3", username: "member3", avatarHash: "dfadsfas"
				}
			]
		}).promise();
	}
	
	function _createNewBoard(name) {
		var result = $.Deferred();
		result.resolve('Created new Board');
		return result.promise();
	}
	
	function _createNewList(name) {
		var result = $.Deferred();
		result.resolve('Created new list');
		return result.promise();
	}

	function _createNewCard(name, desc) {
		var result = $.Deferred();
		result.resolve('Created new card');
		return result.promise();
	}

	function _createNewTasks(tasks) {
		var result = $.Deferred();
		result.resolve('Created new tasks');
		return result.promise();
	}
	
	function _createNewChecklist(name, tasks) {
		var result = $.Deferred();
		result.resolve('Created new Checklist');
		return result.promise();
	}
	
	function _addNewMembers(members) {
		return $.Deferred().resolve("members were added to active card").promise();
	}
	
	function _performSync(tasks) {
		var result = $.Deferred();
		result.resolve('Sync was performed');
		return result.promise();
	}
	
	function _updateBoardName(name) {
		var result = $.Deferred();
		result.resolve('Board was updated');
		return result;
	}
	
	function _updateListName(id, name) {
		var result = $.Deferred();
		result.resolve('List was updated');
		return result;
	}
	
	function _updateCardName(name) {
		var result = $.Deferred();
		result.resolve('Card was Updated');
		return result.promise();
	}
	
	function _updateCardDesc(desc) {
		var result = $.Deferred();
		result.resolve('Card Was Updated');
		return result.promise(); 
	}
	
	function _updateChecklistName(id, name) {
		var result = $.Deferred();
		result.resolve('Checklist was updated');
		return result.promise();
	}
	
	function _updateTaskName(id, name) {
		var result = $.Deferred();
		result.resolve('Task was updated');
		return result.promise();
	}
	
	function _deleteBoard(boardId) {
		var result = $.Deferred();
		result.resolve("Board was deleted.");
		return result.promise();
	}
	
	function _deleteList(listId) {
		var result = $.Deferred();
		result.resolve("list was deleted.");
		return result.promise();
	}
	
	function _deleteCard(cardId) {
		var result = $.Deferred();
		result.resolve("card was deleted.");
		return result.promise();
	}
	
	function _deleteChecklist(checklistId) {
		var result = $.Deferred();
		result.resolve("checklist was deleted.");
		return result.promise();
	}
	
	function _deleteTask(taskId) {
		var result = $.Deferred();
		result.resolve('Task was deleted');
		return result;
	}
	
	function _deleteMember(username) {
		var result = $.Deferred();
		return result.resolve('Member ' + username + ' was removed from this card').promise();
	}
	
	function _deleteComment(commentId) {
		var result = $.Deferred();
		result.resolve("Comment was deleted!");
		return result;
	}
	
	function _addComment(commentText) {
		var result = $.Deferred();
		result.resolve("Comment was added!");
		return result;
	}
	
	function _updateComment(commentId, commentText) {
		var result = $.Deferred();
		result.resolve("Comment was updated!");
		return result;
	}
	
	function _transferCard(fromListId, toListId, cardId) {
		return $.Deferred().resolve("Card was moved").promise();
	}
	
	exports._getUserBoards			= _getUserBoards;
	exports._getBoardLists			= _getBoardLists;
	exports._getCardTasks			= _getCardTasks;
	exports._getBoardMembers		= _getBoardMembers;
	exports._createNewBoard			= _createNewBoard;
	exports._createNewList			= _createNewList;
	exports._createNewCard			= _createNewCard;
	exports._createNewTasks			= _createNewTasks;
	exports._performSync			= _performSync;
	exports._createNewChecklist 	= _createNewChecklist;
	exports._addNewMembers			= _addNewMembers;
	exports._updateBoardName		= _updateBoardName;
	exports._updateListName			= _updateListName;
	exports._updateCardName			= _updateCardName;
	exports._updateCardDesc			= _updateCardDesc;
	exports._updateChecklistName	= _updateChecklistName;
	exports._updateTaskName			= _updateTaskName;
	exports._deleteBoard			= _deleteBoard;
	exports._deleteList				= _deleteList;
	exports._deleteCard				= _deleteCard;
	exports._deleteChecklist		= _deleteChecklist;
	exports._deleteTask				= _deleteTask;
	exports._deleteMember			= _deleteMember;
	exports._deleteComment			= _deleteComment;
	exports._addComment				= _addComment;
	exports._updateComment			= _updateComment;
	exports._transferCard			= _transferCard;
});
/*jslint vars: true, plusplus: true, eqeq: true, devel: true, nomen: true,  regexp: true, indent: 4 */
/*global define, brackets, $, Mustache, document, window */

define(function (require, exports, module) {
	"use strict";

	var ExtensionUtils				= brackets.getModule('utils/ExtensionUtils'),
		AppInit						= brackets.getModule('utils/AppInit'),
		PreferencesManager			= brackets.getModule('preferences/PreferencesManager'),
		CommandManager				= brackets.getModule('command/CommandManager'),
		Commands            		= brackets.getModule( 'command/Commands' ),
        EditorManager       		= brackets.getModule( 'editor/EditorManager' ),
		Dialogs						= brackets.getModule('widgets/Dialogs'),
		Menus						= brackets.getModule('command/Menus'),
		Parser		              	= require('modules/parser'),
		Trello						= require('Trello'),
		strings						= require('i18n!nls/strings');

	var mainPanel					= require('text!html/mainPanel.html'),
		prefDialogHTML				= require('text!html/prefsDialog.html'),
		newBoardHTML				= require('text!html/templates/newBoard.html'),
		newListHTML					= require('text!html/templates/newList.html'),
		newCardHTML					= require('text!html/templates/newCard.html'),
		newTasksHTML				= require('text!html/templates/newTasks.html'),
		newTaskTemplate				= require('text!html/templates/newTaskTemplate.html'),
		newMembersTemplate			= require('text!html/templates/newMembers.html'),
		newCommentTemplate			= require('text!html/templates/newComment.html'),
		boardsTemplate				= require('text!html/templates/boardsTemplate.html'),
		listsTemplate				= require('text!html/templates/listsTemplate.html'),
		checklistTemplate			= require('text!html/templates/newChecklist.html'),
		tasksTemplate				= require('text!html/templates/tasksTemplate.html'),
		editCardDescTemplate		= require('text!html/templates/editCardDesc.html'),
		editCardNameTemplate		= require('text!html/templates/editCardName.html'),
		editListNameTemplate		= require('text!html/templates/editListName.html'),
		editBoardNameTemplate		= require('text!html/templates/editBoardName.html'),
		editChecklistNameTemplate	= require('text!html/templates/editChecklistName.html'),
		editTaskNameTemplate		= require('text!html/templates/editTaskName.html'),
		editCommentsTemplate		= require('text!html/templates/editCommentsTemplate.html'),
		deleteConfirmationTemplate	= require('text!html/templates/deleteConfirmationTemplate.html'),
		changesListTemplate = require('text!html/templates/changesListTemplate.html'),
        commentTemplate     = require('text!html/templates/commentTemplate.html');

	var partTemplates 				= {};
	partTemplates.lists 			= require('text!html/templates/parts/lists.html');
	partTemplates.cardsInList		= require('text!html/templates/parts/cardsInList.html');
	partTemplates.checklists		= require('text!html/templates/parts/checklists.html');
	partTemplates.checkitems		= require('text!html/templates/parts/checkitems.html');
	partTemplates.comments			= require('text!html/templates/parts/comments.html');
	partTemplates.members			= require('text!html/templates/parts/members.html');

	// Extension Info.
	var _ExtensionID		= 'brackets-trello',
		_ExtensionLabel		= 'Brackets Trello',
		_ExtensionShortcut	= 'Alt-B';

	// Item Type Enums
	var ITEM_TYPE = {
		BOARDS: 1, LISTS: 2, CARDS: 3, TASKS: 4, CHECKLISTS: 5, COMMENT: 6, MEMBER: 7
	};

	// Define preferences.
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');
	_prefs.definePreference('width', 'integer', 260);
	_prefs.definePreference('apitoken', 'string', '');
	_prefs.definePreference('autosynctime', 'integer', 30);
	_prefs.definePreference('useautosync', 'boolean', false);
	_prefs.definePreference('storagepref', 'boolean', false);
	_prefs.definePreference('show-comments', 'boolean', true);
	_prefs.definePreference('selected-board', 'string', '');
	_prefs.definePreference('selected-board-name', 'string', '');
	_prefs.definePreference('selected-list', 'string', '');
	_prefs.definePreference('selected-list-name', 'string', '');
	_prefs.definePreference('selected-card', 'string', '');
	_prefs.definePreference('selected-checklist', 'string', '');

	// Prefs that will be saved in .brackets.json
	var _projectPrefs = ['selected-board', 'selected-board-name', 'selected-list', 'selected-list-name', 'selected-card', 'selected-checklist'];

	var realVisibility, isVisible, isMenuVisible, autoSyncIntervalId, $icon, $panel;

	var _taskChanges = {};

	// save the state of expanded list and checklists
	var _expandedLists = {},
		_expandedChecklists = {},
		_checkedTasksHidden = {};

	var activeUserRole = "user";
	var activeUserId = '';

	/**
	 * Save Preferences either in project or global
	 *
	 * @param {String} name
	 * @param {Number} value
	 */
	function _savePrefs(name, value) {
		if (_prefs.get('storagepref') && _projectPrefs.indexOf(name) >= 0) {
			return _prefs.set(name, value, {
				location: {
					scope: 'project'
				}
			});
		}
		return _prefs.set(name, value);
	}

	/**
	 * Open Preferences dialog and change preferences
	 */
	function _openPreferencesDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(prefDialogHTML, strings)),
			$dialog	= dialog.getElement(),
			tempPrefs = {};

		$dialog.find('.trello-api-token').val(_prefs.get('apitoken')).on('change', function (e) {
			tempPrefs.apitoken = $(this).val();
		});
		$dialog.find('.autosync-time').val(_prefs.get('autosynctime')).on('change', function (e) {
			tempPrefs.autosynctime = ($(this).val() < 2) ? 2 : $(this).val();
		});
		$dialog.find('.use-autosync').attr('checked', _prefs.get('useautosync')).on('change', function(e) {
			tempPrefs.useautosync = e.target.checked;
		});
		$dialog.find('.storage-pref').attr('checked', _prefs.get('storagepref')).on('change', function(e) {
			tempPrefs.storagepref = e.target.checked;
		});

		dialog.done(function (id) {
			if (id === 'save') {
				for (var i in tempPrefs) {
					_savePrefs(i, tempPrefs[i]);
				}
				// Reset AutoSync
				_initAutoSync(false);
				_initAutoSync(true);
			}
			if (!isVisible && _prefs.get('apitoken')) {
				_toggleVisibility();
			}
		});
	}

	/**
	 * Start or stop autosync
	 *
	 * @param {Boolean} init
	 */
	function _initAutoSync(init) {
		if (init && _prefs.get('useautosync') && _prefs.get('autosynctime') >= 2) {
			autoSyncIntervalId = window.setInterval(_initSync, _prefs.get('autosynctime') * 1000);
			return;
		}
		window.clearInterval(autoSyncIntervalId);
	}

	/**
	 * Perform Sync
	 */
	function _initSync() {
		Trello._performSync(_taskChanges)
			.done(_displayNotification)
			.fail(_displayError);
	}

	/**
	 * Open New Board Dialog
	 */
	function _openNewBoardDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newBoardHTML, strings)),
			$dialog = dialog.getElement();
		$dialog.find('.board-name').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('board',{},{name:$dialog.find('.board-name').val()})
				.done(
					function(data) {
						_displayNotification;
						// add the new board to the panel
						// get the correct children because boards are ordered by name asc
						var index = 0;
						var found = false;
						$.each($('.tab-boards', $panel).children('.boards').children('.board-item'), function(nthChild,item) {
							console.log($(item).children('h4').text().toLowerCase() + ' vs. ' + data.name.toLowerCase());
							if  ($(item).children('h4').text().toLowerCase() > data.name.toLowerCase()) {
								found = true;
								return false;
							}
							index++;
						});

						// if found == false => add it directly before add new board
						if (found) {
							var lastChildren = '.board-item:eq('+index+')';
						} else {
							var lastChildren = '.cmd-new-board';
						}

						$('.tab-boards', $panel).children('.boards').children(lastChildren).before(
							'<div class="board-item" id="'+data.id+'">'+
								'<h4><a href="#">'+data.name+'</a></h4>'+
							'</div>'
						);

					})
				.fail(_displayError);
			}
		});
	}

	/**
	 * Open New List Dialog
	 */
	function _openNewListDialog() {
		var boardId = _prefs.get('selected-board');
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newListHTML, strings)),
			$dialog = dialog.getElement();
		$dialog.find('.list-name').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('list',{board:boardId},{name:$dialog.find('.list-name').val(),pos:"bottom"})
				.done(
					function(data) {
						_displayNotification;
						// add the new list
						data.totalCards = 0;
						var combinedTemplate = _combineTemplates(partTemplates.lists);
						$('.tab-lists', $panel).children('.lists').children('.cmd-new-list').before(
							Mustache.render(combinedTemplate, {lists:data})
						);
					})
				.fail(_displayError);
			}
		});
	}

	/**
	 * Open New Card Dialog
	 */
	function _openNewCardDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newCardHTML, strings)),
			$dialog = dialog.getElement();
		$dialog.find('.card-name').focus();
		$dialog.keypress(function(e) {
			e.stopPropagation();
		});

		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('card',
							   {list:_prefs.get('selected-list')},
							   {name:$dialog.find('.card-name').val(),desc:$dialog.find('.card-desc').val()}
							  )
				.done(
					function(data) {
						_displayNotification;
						data.taskCount = '';
						var combinedTemplate = _combineTemplates(partTemplates.cardsInList);
						$('.tab-lists', $panel).children('.lists').children('#'+data.idList).children('.cards').append(
							Mustache.render(combinedTemplate, {cards:data})
						);
					})
				.fail(_displayError);
			}
		});
	}

	/**
	 * New Checklist Dialog
	 */
	function _openNewChecklistDialog() {
		var boardId   = _prefs.get("selected-board");
		var cardId   = _prefs.get("selected-card");
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(checklistTemplate, strings)),
			$dialog = dialog.getElement(), name, tasks = [];
		$dialog.find('.checklist-name').focus();
		$dialog.find('.btn-add-task').click(function() {
			$dialog.find('.form-horizontal').append($(Mustache.render(newTaskTemplate, strings)));
		});
		dialog.done(function(id) {
			if (id === 'save') {
				name = $dialog.find('.checklist-name').val();
				$dialog.find('.task-name').each(function() {
					if ($(this).val().length >= 1) {
						tasks.push($(this).val());
					}
				});
				Trello._create('checklist',{board:boardId,card:cardId},{name:name,tasks:tasks}).done(function(data) {
					_displayNotification();
					_savePrefs('selected-checklist',data.checklist.id);
					var combinedTemplate = _combineTemplates(partTemplates.checklists);
					// add the new task
					$('.tab-tasks', $panel).children('.checklists').children('.cmd-new-checklist').before(
						Mustache.render(combinedTemplate, {checklists:data.checklist})
					);
					for (var t = 0; t < tasks.length; t++) {
						var task = data.tasks[t];
						var combinedTemplate = _combineTemplates(partTemplates.checkitems);
						console.log(combinedTemplate);
						// add the new task
						$('.tab-tasks', $panel).children('.checklists').children('#'+_prefs.get('selected-checklist')).children('.tasks').append(
							Mustache.render(combinedTemplate, {checkItems:task})
						);
					}
				}).fail(_displayError);
			}
		});
	}

	/**
	 * Open New Tasks Dialog
	 */
	function _openNewTasksDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newTasksHTML, strings)),
			$dialog = dialog.getElement(),
			tasks = [];
		$dialog.find('.task-name:first-child').focus();
		$dialog.find('.btn-add-task').click(function() {
			$dialog.find('.form-horizontal').append($(Mustache.render(newTaskTemplate, strings)));
		});
		$dialog.find('.task-name:last-child').focus();

		dialog.done(function(id) {
			if (id === 'save') {
				var tasks = [];
				$dialog.find('.task-name').each(function() {
					if ($(this).val().length >= 1) {
						tasks.push($(this).val());
					}
				})
				console.log('tasks: ',tasks);
				Trello._createTasks([],_prefs.get('selected-checklist'),tasks,0,$dialog.find('.task-name').length)
				.done(function(data) {
						_displayNotification();
						for (var t = 0; t < data.length; t++) {
							var task = data[t];
							var combinedTemplate = _combineTemplates(partTemplates.checkitems);
							// add the new task
							$('.tab-tasks', $panel).children('.checklists').children('#'+_prefs.get('selected-checklist')).children('.tasks').append(
								Mustache.render(combinedTemplate, {checkItems:task})
							);
						}
					})
				.fail(_displayError);
			}
		});
	}

	function _openNewMemberDialog() {
		_displaySpinner(true);
		var usernames = {};
		var boardId   = _prefs.get("selected-board");
		var cardId   = _prefs.get("selected-card");
		Trello._get('boardMembers',{board:boardId},{}).done(function(boardMembers) {
			Trello._get('cardMembers',{card:cardId},{}).done(function(cardMembers) {
				console.log('Board Members: ',boardMembers);
				console.log('Card Members: ',cardMembers);
				// difference between boardMembers and cardMembers
				var members = [];
				for (var bm = 0; bm < boardMembers.length; bm++) {
					var found = false;
					for (var cm = 0; cm < cardMembers.length; cm++) {
						if (cardMembers[cm].id == boardMembers[bm].id) {
							found = true;
							break;
						}
					}
					if (!found) {
						members.push(boardMembers[bm]);
					}
				}

				_displaySpinner(false);
				var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newMembersTemplate, { members: members, strings: strings })),
					$dialog = dialog.getElement();

				dialog.done(function(id) {
					if (id == "save") {
						var newMembers = [];
						$dialog.find(".memberInput").each(function() {
							if ($(this).prop('checked')) {
								newMembers.push($(this).data('member-id'));
							}
						});
						Trello._addNewMembers(newMembers,cardId).done(function(data) {
							_displayNotification();
							var showNewMembers = [];
							var combinedTemplate = _combineTemplates(partTemplates.members);
							for (var nm = 0; nm < data.idMembers.length; nm++) {
								var found = false;
								for (var m = 0; m < members.length; m++) {
									if (members[m].id == data.idMembers[nm]) {
										showNewMembers.push(members[m]);
										break;
									}
								}
							}
							$('.tab-tasks', $panel).children('.members').children('h5').after(
								Mustache.render(combinedTemplate, {members:showNewMembers})
							);
						}).fail(_displayError);
					}
				});
			}).fail(_displayError);
		})
		.fail(_displayError);
	}

	function _openEditBoardNameDialog() {
		var boardId   = _prefs.get("selected-board");
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editBoardNameTemplate, strings)),
			$dialog = dialog.getElement();
			$dialog.find('.board-name').val($(this).parent('h4').text().trim()).focus();
			dialog.done(function(id) {
				if (id === 'save') {
					var name = $dialog.find('.board-name').val();
					if (name.length >= 1) {
						Trello._edit('board',{board:boardId},{name:name}).done(function(data) {
							_displayNotification();
							// we need to change the name inside the ui as well
							$('.board-name', $panel).children('#board-name').text(name);
							// new board name inside prefs
							_savePrefs('selected-board-name',name);
						}).fail(_displayError);
					}
				}
		 	});
	}

	function _openEditListNameDialog(e) {
		e.stopPropagation();
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editListNameTemplate, strings)),
			$dialog = dialog.getElement();
		$dialog.find('.list-name').val($(this).siblings('a').text()).focus();
		var listId = $(this).data('list-id');
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.list-name').val();
				if (name.length >= 1) {
					Trello._edit('list',{list:listId},{name:name}).done(function(data) {
							_displayNotification();
							// we need to change the name inside the ui as well
							$('.lists', $panel).children('#'+listId).children('.list-name').children('a').text(name);
							// new list name inside prefs
							_savePrefs('selected-list-name',name);
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditCardNameDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editCardNameTemplate, strings)),
			$dialog = dialog.getElement();

		$dialog.find('.card-name').val($(this).parent('h5').text().trim()).focus();
		var cardId = $(this).data('card-id');
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.card-name').val();
				if (name.length >= 1) {
					Trello._edit('card',{card:cardId},{name:name}).done(function(data) {
							_displayNotification();
							// we need to change the name inside the ui as well
							$('.card-name', $panel).children('#card-name').text(name);
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditCardDescDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editCardDescTemplate, strings)),
			$dialog = dialog.getElement();

		$dialog.find('.card-desc').val($(this).parent('p').text().trim()).focus();
		var cardId = $(this).data('card-id');
		dialog.done(function(id) {
			if (id === 'save') {
				var desc = $dialog.find('.card-desc').val();
				if (desc.length >= 1) {
					Trello._edit('card',{card:cardId},{desc:desc}).done(function(data) {
							_displayNotification();
							// we need to change the desc inside the ui as well
							$('.card-desc', $panel).children('#card-desc').text(desc);
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditChecklistDialog(e) {
		e.stopPropagation();
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editChecklistNameTemplate, strings)),
			$dialog = dialog.getElement();
		$dialog.find('.checklist-name').val($(this).parent('h5').text().trim()).focus();
		var checklistId = $(this).data('checklist-id');
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.checklist-name').val();
				Trello._edit('checklist',{checklist:checklistId},{name:name}).done(function(data) {
							_displayNotification();
							// we need to change the name inside the ui as well
							$('.checklists', $panel).children('#'+checklistId).children('.checklist-name').children('#checklist-name').text(name);
						}).fail(_displayError);
			}
		});
	}

	function _openEditTaskDialog(e) {
		e.stopPropagation();
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(editTaskNameTemplate, strings)),
			$dialog = dialog.getElement();
		var cardId = $('.card-name', $panel).attr('id');
		var checklistId = $(this).parent('.task-item').parent('.tasks').parent('.checklist-item').attr('id');
		var checkitemId = $(this).data('task-id');
		console.log(cardId);
		console.log(checklistId);
		console.log(checkitemId);
		$dialog.find('.task-name').val($(this).siblings('label').text().trim()).focus();
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.task-name').val();
				Trello._edit('checkitem',{card:cardId,checklist:checklistId,checkitem:checkitemId},{value:name}).done(function(data) {
							_displayNotification();
							// we need to change the name inside the ui as well
							$('.checklists', $panel).children('#'+checklistId).children('.tasks')
							.children('.task-item').children("label[for='"+checkitemId+"']").text(name);
						}).fail(_displayError);
			}
		});
	}

	function _getOptions(type) {
		var options = {
			YES: strings.BTN_YES,
			CANCEL: strings.BTN_CANCEL
		}
		switch (type) {
			case ITEM_TYPE.BOARDS:
				options.MESSAGE = strings.MSG_DELETE_BOARD;
				break;

			case ITEM_TYPE.LISTS:
				options.MESSAGE = strings.MSG_DELETE_LIST;
				break;

			case ITEM_TYPE.CARDS:
				options.MESSAGE = strings.MSG_DELETE_CARD;
				break;

			case ITEM_TYPE.TASKS:
				options.MESSAGE = strings.MSG_DELETE_TASK;
				break;

			case ITEM_TYPE.CHECKLISTS:
				options.MESSAGE = strings.MSG_DELETE_CHECKLIST;
				break;

			case ITEM_TYPE.COMMENT:
				options.MESSAGE = strings.MSG_DELETE_COMMENT;
				break;

			case ITEM_TYPE.MEMBER:
				options.MESSAGE = strings.MSG_DELETE_MEMBER;
				break;
		}
		return options;
	}

	function _openDeleteBoardDialog(e) {
		e.stopPropagation();
		var boardId = $(this).data('board-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.BOARDS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('board',{board:boardId}).done(function(data) {
						_displayNotification();
						console.log('deleted Board: ',data);
						_displayBoards();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteListDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var listId = thisEle.data('list-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.LISTS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('list',{list:listId}).done(function(data) {
						_displayNotification();
						console.log('deleted List: ',data);
						thisEle.parent('.list-name').parent('.list-item').remove();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteCardDialog(e) {
		e.stopPropagation();
		Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.CARDS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('card',{card:_prefs.get('selected-card')}).done(function(data) {
						_displayNotification();
						_displayLists();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteChecklistDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var checklistId = thisEle.data('checklist-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.CHECKLISTS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('checklist',{checklist:checklistId}).done(function(data) {
						_displayNotification();
						thisEle.parent('.checklist-name').parent('.checklist-item').remove();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteTaskDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var checklistId = thisEle.parent('.task-item').parent('.tasks').parent('.checklist-item').attr('id');
		var taskId = thisEle.data('task-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.TASKS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('checkItem',{checklist:checklistId,checkItem:taskId}).done(function(data) {
						_displayNotification();
						thisEle.parent('.task-item').remove();
					}).fail(_displayError);
				}
			});
	}

	function _toggleCheckedListItems(e) {
		e.stopPropagation();
		var parentId = $(this).parents('div').attr('id'),
			$taskItems = $('#' + parentId).find('.task-item');

		if (!_checkedTasksHidden[parentId]) {
			_checkedTasksHidden[parentId] = true;
			$taskItems.each(function() {
				var $this = $(this);
				if ($this.find('input').attr('checked') === 'checked' || $this.find('input').prop('checked')) {
					$this.hide();
				}
			});
		} else {
			_checkedTasksHidden[parentId] = false;
			$taskItems.each(function() {
				$(this).show();
			});
		}
	}

	function _openAddCommentDialog(e) {
		e.stopPropagation();
		var cardId = _prefs.get("selected-card");
		var dialog = Dialogs.showModalDialogUsingTemplate($(Mustache.render(newCommentTemplate, strings))),
			$dialog = dialog.getElement();
		$dialog.find('.comment-text').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('comment',{card:cardId},{text:$dialog.find('.comment-text').val()})
					.done(function(data) {
						_displayNotification();
						var commentObj = {};
						commentObj.id = data.id;
						commentObj.fullName = data.memberCreator.fullName,
						commentObj.username = data.memberCreator.username,
						commentObj.avatarHash = data.memberCreator.avatarHash,
						commentObj.comment = data.data.text;
						console.log(commentObj);
						var combinedTemplate = _combineTemplates(partTemplates.comments);
						$('.tab-tasks', $panel).children('.comments').children('h5').after(
							Mustache.render(combinedTemplate, {comments:commentObj})
						);
						// you can always delete/edit your own card
						$('#'+commentObj.id).find('.comment-body h5')
							.append($('<i class="btn-cmd btn-edit cmd-edit-comment" data-comment-id="'+commentObj.id+'" />'))
							.append($('<i class="btn-cmd btn-delete cmd-delete-comment" data-comment-id="'+commentObj.id+'" />'));
					})
					.fail(_displayError);
			}
		});
	}

	function _openEditCommentDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate($(Mustache.render(editCommentsTemplate, strings))),
			$dialog = dialog.getElement();
		$dialog.find('.comment-text').val($(this).parent('h5').siblings('p').html()).focus();
		var commentId = $(this).data('comment-id');
		var cardId = _prefs.get("selected-card");
		dialog.done(function(id) {
			if (id === 'save') {
				var commentText = $dialog.find('.comment-text').val();
				Trello._edit('comment',{card:cardId,comment:commentId},{text:commentText})
					.done(function(data) {
						_displayNotification();
						$('.tab-tasks', $panel)
						.children('.comments').children('#'+commentId).children('.comment-body').children('.comment').html(commentText);
					})
					.fail(_displayError);
			}
		});
	}

	function _openDeleteCommentDialog() {
		var cardId = _prefs.get("selected-card");
		var commentId = $(this).data('comment-id');
		Dialogs.showModalDialogUsingTemplate($(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.COMMENT))))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('comment',{comment:commentId,card:cardId}).done(function(data) {
						_displayNotification();
						$('.tab-tasks', $panel)
						.children('.comments').children('#'+commentId).remove();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteMemberDialog(e) {
		e.preventDefault();
		var cardId 		= _prefs.get('selected-card');
		var memberId 	= $(this).data('member-id');
		Dialogs.showModalDialogUsingTemplate($(Mustache.render(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.MEMBER))))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('cardMember',{card:cardId,member:memberId}).done(function(data) {
						_displayNotification();
						$('.tab-tasks', $panel).children('.members').children('#'+memberId).remove();
					}).fail(_displayError);
				}
			});
	}

	/**
	 * Display Notification
	 */
	function _displayNotification(text) {
		if (!text) return;

		var $notification = $('.notification', $panel);

		$notification.empty().html(text).animate({
			opacity: 'show'
		}, 'fast');
		window.setTimeout(function() {
			$notification.animate({
				opacity: 'hide'
			}, 'fast');
		}, 1000);
	}

	/**
	 * Event Controller
	 * 
	 * @param {Object} $panel
	 */
	function _panelEventController($panel) {
		// Resizer
		var pageX, width;
		$('.horz-resizer', $panel).mousedown(function(e) {
			pageX = e.pageX;
			width = $panel.width();

			$(document).on('mousemove', function(e) {
				$panel.width(width - (e.pageX - pageX));
			}).on('mouseup', function() {
				$(document).off('mousemove').off('mouseup');
				_savePrefs('width', $panel.width());
			});
		}).dblclick(_toggleVisibility);

		// Drag and Drop of Cards
		$panel.on('mousedown', '.card-item', function(evt) {
			var py = evt.pageY, $this = $(this), offset = $this.offset();
			var $dropzone, fromListId, toListId, cardId;
			fromListId = $this.parents('.list-item').attr('id');

			$(document).on('mousemove', function(e) {
				$this.css({
					top: offset.top + e.pageY - py
				}).addClass('moving');
				$dropzone = _getActiveDropzone($this);
				if ($dropzone) {
					$dropzone.addClass('dropzone');
				}
			}).on('mouseup', function() {
				$this.removeClass('moving');
				if ($dropzone) {
					$dropzone.removeClass('dropzone');
					$dropzone.find('.cards').append($this);
					toListId = $this.parents('.list-item').attr('id');
					cardId = $this.attr('id');
					console.log('toListId: '+toListId);
					if (fromListId !== toListId) {
						// we need to update the totalCards counter
						var totalCardsEleFrom = $('.tab-lists', $panel).children('.lists').children('#'+fromListId).children('.list-name').children('.totalCards');
						var totalCardsEleTo = $('.tab-lists', $panel).children('.lists').children('#'+toListId).children('.list-name').children('.totalCards');
						totalCardsEleFrom.text(parseInt(parseInt(totalCardsEleFrom.text())-1));
						totalCardsEleTo.text(parseInt(parseInt(totalCardsEleTo.text())+1));

						Trello._move('card',
									 {toList:toListId,card: cardId},{pos:"bottom"})
						.done(_displayNotification).fail(_displayError);
					}
				}
				$(this).off('mousemove').off('mouseup');
			});
		});

		// Hide on escape
		$(document).keydown(function(e) {
			if (e.which === 27 && isVisible) {
				_toggleVisibility();
			}
		});

		// Hide on click
		$('.btn-prefs', $panel).click(_openPreferencesDialog);
		$('.btn-sync', $panel).click(_initSync);

		// Button Actions
		$('.btn-boards', $panel).click(_displayBoards);
		$('.btn-lists', $panel).click(_displayLists);
		$('.btn-tasks', $panel).click(_displayTasks);

		// Trello Content Listeners
		// Board Name
		$panel.on('click', '.board-item', function () {
			_savePrefs('selected-board', $(this).attr('id'));
			_savePrefs('selected-board-name', $(this).children('h4').text());
			_setNewButtonActive(ITEM_TYPE.LISTS);
			_displayLists();
		});

		// List Name
		$panel.on('click', '.list-item', function() {
			_savePrefs('selected-list', $(this).attr('id'));
			_savePrefs('selected-list-name', $('h5 a', this).text());
			_setNewButtonActive(ITEM_TYPE.CARDS);

			var $cards = $(this).find('.cards, .cmd');
			if ($cards.css('display') === 'none') {
				_expandedLists[$(this).attr('id')] = true;
				$cards.show();
			}
			else if ($cards.css('display') === 'block') {
				_expandedLists[$(this).attr('id')] = false;
				$cards.hide();
			}
		});

		// Card Name
		$panel.on('click', '.card-item', function(e) {
			e.stopPropagation();
			_savePrefs('selected-card', $(this).attr('id'));
			_displayTasks();
		});

		// Task Name
		$panel.on('change', '.task-item input', function(e) {
			_taskChanges[$(this).attr('id')] = e.target.checked;
			var checkListId = $(this).parent().parent('.tasks').parent('.checklist-item').attr("id");
			var checkItemId = $(this).attr("id");
			_changeTaskState(checkListId,checkItemId);
		});

		// Changes List comment
        $panel.on('click', '.comment-item', function(e){
            e.stopPropagation();
            var lineNumber = $(this).data('line-number'),
                filePath = $(this).data('file-path'),
                lineCh = $(this).data('line-ch');

            // Open file and locate to comment in editor.
            CommandManager.execute( Commands.FILE_OPEN, { fullPath: filePath } ).done( function() {
                // Set focus on editor.
                EditorManager.focusEditor();
                EditorManager.getCurrentFullEditor().setCursorPos(
                    lineNumber - 1,
                    lineCh,
                    true );
            } );
        });

		$panel.on('click', '.checklist-name', function() {
			var $checklist = $(this).siblings('.tasks');
			if ($checklist.css('display') === 'none') {
				_expandedChecklists[$(this).attr('id')] = true;
				$checklist.show();
			}
			else if($checklist.css('display') === 'block') {
				_expandedChecklists[$(this).attr('id')] = false;
				$checklist.hide();
			}
		});

		$panel.on('click', '.cmd-hide-comments', function() {
			var $comments = $(this).siblings('.comment-item');
			if ($comments.css('display') === 'none') {
				$comments.show();
			} else if ($comments.css('display') === 'block') {
				$comments.hide();
			}
			_prefs.set('show-comments', !(_prefs.get('show-comments')));
		});

		// New Item Handlers
		$panel.on('click', '.cmd-new-board', function() {
			_openNewBoardDialog();
		});
		$panel.on('click', '.cmd-new-list', function() {
			_savePrefs('selected-board', $(this).data('board-id'));
			_openNewListDialog();
		});
		$panel.on('click', '.cmd-new-card', function(e) {
			e.stopPropagation();
			_savePrefs('selected-list', $(this).data('list-id'));
			_openNewCardDialog();
		});
		$panel.on('click', '.cmd-new-tasks', function() {
			_savePrefs('selected-checklist', $(this).data('checklist-id'));
			_openNewTasksDialog();
		});
		$panel.on('click', '.cmd-new-checklist', _openNewChecklistDialog);
		$panel.on('click', '.cmd-new-member', _openNewMemberDialog);

		// Edit Boards, Lists and Cards
		$panel.on('click', '.cmd-edit-board', _openEditBoardNameDialog);
		$panel.on('click', '.cmd-edit-list', _openEditListNameDialog);
		$panel.on('click', '.cmd-edit-card-name', _openEditCardNameDialog);
		$panel.on('click', '.cmd-edit-card-desc', _openEditCardDescDialog);
		$panel.on('click', '.cmd-edit-checklist', _openEditChecklistDialog);
		$panel.on('click', '.cmd-edit-task', _openEditTaskDialog);

		// Delete Board, Lists, Cards, Checklists, Tasks, and Members
		$panel.on('click', '.cmd-delete-board', _openDeleteBoardDialog);
		$panel.on('click', '.cmd-delete-list', _openDeleteListDialog);
		$panel.on('click', '.cmd-delete-card', _openDeleteCardDialog);
		$panel.on('click', '.cmd-delete-checklist', _openDeleteChecklistDialog);
		$panel.on('click', '.cmd-delete-task', _openDeleteTaskDialog);
		$panel.on('click', '.cmd-delete-member', _openDeleteMemberDialog);

		// Hide Checked Items
		$panel.on('click', '.cmd-hide-checked', _toggleCheckedListItems);

		// Add, Delete, Edit comments
		$panel.on('click', '.cmd-add-comment', _openAddCommentDialog);
		$panel.on('click', '.cmd-delete-comment', _openDeleteCommentDialog);
		$panel.on('click', '.cmd-edit-comment', _openEditCommentDialog);
	}

	function _getActiveDropzone($cardItem) {
		var cardOffset = $cardItem.offset().top, minY, maxY, $dropzone;

		$('.list-item', $panel).each(function(i, elem) {
			minY = $(elem).removeClass('dropzone').offset().top;
			maxY = minY + $(elem).height();
			if (minY <= cardOffset && cardOffset <= maxY) {
				$dropzone = $(elem);
			}
		});
		return $dropzone;
	}

	/**
	 * Set A Button Active
	 *
	 * @param {Object} button
	 */
	function _setButtonActive(button) {
		$('.btn', $panel).each(function() {
			$(this).removeClass('active');
		});
		$('.tab', $panel).each(function() {
			$(this).hide();
		});
		$(button).addClass('active');
	}

	function _setNewButtonActive(button) {
		$('.new-items .cmd', $panel).each(function() {
			$(this).hide();
		});

		switch (button) {
			case ITEM_TYPE.BOARDS:
				$('.new-items .cmd-new-board', $panel).show();
				break;

			case ITEM_TYPE.LISTS:
				if (_prefs.get('selected-board')) {
					$('.new-items .cmd-new-list', $panel).show();
				}
				break;

			case ITEM_TYPE.CARDS:
				$('.new-items .cmd-new-list', $panel).show();
				$('.new-items .cmd-new-card', $panel).show();
				break;

			case ITEM_TYPE.TASKS:
				if (_prefs.get('selected-card')) {
					$('.new-items .cmd-new-tasks', $panel).show();
				}
				break;
		}
	}

	/**
	 * Display Users' Boards
	 */
	function _displayBoards() {
		_displaySpinner(true);
		Trello._get('boards',{},{fields:["id","name"]}).done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.BOARDS);
			_setButtonActive($panel.find('.btn-boards'));
			$('.tab-boards', $panel).empty().show().append(Mustache.render(boardsTemplate, data));
		})
		.fail(_displayError);
	}
	
	/**
	 * Display Users' Lists
	 */
	function _displayLists(visible) {
		var boardName = _prefs.get("selected-board-name");
		var boardId   = _prefs.get("selected-board");

		if (visible) {
			_setButtonActive($('.btn-lists', $panel));
			_setNewButtonActive(ITEM_TYPE.LISTS);
			$('.tab-lists', $panel).show();
			return;
		}

		_displaySpinner(true);
		Trello._get('lists',{board:boardId},{fields:["id","name"],cards:["open"],card_fields:["name","badges"],members:["all"]}).done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.LISTS);
			_setButtonActive($panel.find('.btn-lists'));
			data.name = boardName;
			data.id   = boardId;
			activeUserId = data.memberRole.idMember;
			activeUserRole = data.memberRole.memberType;
			console.log('listData: ',data);
			var combinedTemplate = _combineTemplates(listsTemplate);
			$('.tab-lists', $panel).empty().show().append(Mustache.render(combinedTemplate, data));
		})
		.fail(_displayError)
		.always(function(){
            displayTrelloComments(Parser.getTrelloComments());
        });
	}
	
	/**
	 * Display Tasks Tab (all about a special card)
	 */
	function _displayTasks() {
		var boardName = _prefs.get("selected-board-name");
		var listName = _prefs.get("selected-list-name");
		var cardId = _prefs.get("selected-card");
		_displaySpinner(true);
		Trello._get('tasks',{card:cardId},
					{members:[true],actions:['commentCard'],
					 member_fields:["avatarHash","username","fullName"]}
				   ).done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.TASKS);
			_setButtonActive($panel.find('.btn-tasks'));

			data.boardName = boardName;
			data.listName = listName;
			console.log('tasks for: '+cardId);
			console.log(data);
			var combinedTemplate = _combineTemplates(tasksTemplate);
			$('.tab-tasks', $panel).empty().show().append(Mustache.render(combinedTemplate, data));

			// set checkmarks
			$.each(data.checklists,function(checklistIndex,checklist) {
				$.each(checklist.checkItems,function(checkItemIndex,checkItem) {
					$('#' + checkItem.id).prop('checked',(checkItem.state === "complete") ? true : false);
				});
			});

			// insert comment edit/delete if it's allowed
			if (data.comments && data.comments.length >= 1) {
				data.comments.forEach(function(comment) {
					if (activeUserRole === "admin" || activeUserId === comment.memberId) {
						$('#'+comment.id).find('.comment-body h5')
							.append($('<i class="btn-cmd btn-edit cmd-edit-comment" data-comment-id="'+comment.id+'" />'))
							.append($('<i class="btn-cmd btn-delete cmd-delete-comment" data-comment-id="'+comment.id+'" />'));
					}
				});
			}

			$('.tab-tasks .members', $panel).show();

		})
		.fail(_displayError);
	}

	/**
	 * Display an error
	 */
	function _displayError(text) {
		if (!text) return;

		var $errormsg = $('.errormsg', $panel);

		$errormsg.empty().html(text).animate({
			opacity: 'show'
		}, 'fast');
		window.setTimeout(function() {
			$errormsg.animate({
				opacity: 'hide'
			}, 'fast');
		}, 2000);
		_displaySpinner(false);
	}

	/**
	 * Display Spinner
	 *
	 * @param {Boolean} visible
	 */
	function _displaySpinner(visible) {
		if (visible) {
			$('.spinner', $panel).css('display', 'inline-block')
		} else {
			$('.spinner', $panel).hide();
		}
	}

    function displayTrelloComments(newComments) {
        var compliedChangesList = null;

        // check lists panel exist
        if ($('.tab-lists .lists', $panel).length === 0) {
            return;
        }

        // remove older comment item
        $('.list-item .comment-item', $panel).remove();

        // merge comment item to trello list
        $('.list-item h5 a', $panel).each(function(index, listElem){
            var listName = $(listElem).html(),
                countElem = $(listElem).parent().find('span'),
                nameRegexp = '\\s*' + listName.replace(/\s+/g, '\\s*') + '\\s*',
                tagRegexp = new RegExp(nameRegexp, 'gi'),
                groupComments = [],
                otherComments = [],
                commentHtml = "";

            newComments.forEach(function(comment){
                if (tagRegexp.test(comment.tag())) {
                    groupComments.push(comment);
                } else {
                    otherComments.push(comment);
                }
            });

            newComments = otherComments;
            // render
            if (groupComments.length > 0) {
				countElem.html('<span class="comment-counter">' + groupComments.length + '+</span>'
						   + $(listElem).closest('.list-item').find('.cards .card-item').length);
                commentHtml = Mustache.render(commentTemplate, {
                    comments: groupComments
                });
                $(commentHtml).insertBefore($(listElem).closest('.list-item').find('.cards').children().first());
            }

        });

        // remove older Changes List.
        $('.tab-lists .lists #changes-list', $panel).remove();
        compliedChangesList = Mustache.render(changesListTemplate, {
            count: newComments.length,
            comments: newComments
        });
        $(compliedChangesList).insertBefore($('.tab-lists .lists', $panel).children().first());
    }

	/////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////// CHANGE ///////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	function _changeTaskState(checkListId,checkItemId) {
	 	Trello._change('taskstate',{card:_prefs.get('selected-card'),checklist:checkListId,checkitem:checkItemId},
						{value:[$("#"+checkItemId).is(':checked') ? true: false]});
	}

	/////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////  Mustache improvement //////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	function _combineTemplates(template) {
		return template.replace(/{{> (.*?)\.html}}/g,function(match,p1) {
			return _combineTemplates(partTemplates[p1]);
		});
	}

	/**
	 function _combineTemplates(array) {
		for (var i = array.length-2; i >= 0; i--) {
			array[i].file = array[i].file.replace(new RegExp('{{> '+array[i+1].name+'}}','g'),array[i+1].file);
		}
		return array[0].file;
	 }
	 */

	// Toggle Panel Visibility
	function _toggleVisibility() {
		if (!isVisible && !realVisibility) {
			realVisibility = true;
			$panel = $(Mustache.render(mainPanel, strings)).width(_prefs.get('width'));
			_panelEventController($panel);
			$('#editor-holder').append($panel);
			CommandManager.get(_ExtensionID).setChecked(true);
			$icon.addClass('active');

			if (_prefs.get('selected-board')) {
				_displayLists();
			} else {
				_displayBoards();
			}
			_initAutoSync(true);
		} else if (!isVisible && realVisibility) {
			CommandManager.get(_ExtensionID).setChecked(true);
			$panel.show();
			$icon.addClass('active');
			_initAutoSync(true);
		} else {
			CommandManager.get(_ExtensionID).setChecked(false);
			$panel.hide();
			$icon.removeClass('active');
			_initAutoSync(false);
		}
		isVisible = !isVisible;
	}

	function _Main() {
		if (!_prefs.get('apitoken') && !isVisible) {
			_openPreferencesDialog();
			return;
		}
		_toggleVisibility();
	}

	AppInit.appReady(function () {
		ExtensionUtils.loadStyleSheet(module, 'styles/styles.css');
		var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		CommandManager.register(_ExtensionLabel, _ExtensionID, _Main);
		viewMenu.addMenuItem(_ExtensionID, _ExtensionShortcut);
		Parser.setup();
        Parser.onTrelloCommentsChange(displayTrelloComments);
	});

	$icon = $('<a>').attr({
		id: 'brackets-trello-icon',
		href: '#',
		title: 'Brackets Trello'
	}).click(_Main).appendTo($('#main-toolbar .buttons'));
});

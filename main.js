/*jslint vars: true, plusplus: true, eqeq: true, devel: true, nomen: true,  regexp: true, indent: 4 */
/*global define, brackets, $, Mustache, document, window */

define(function (require, exports, module) {
	"use strict";

	var ExtensionUtils		= brackets.getModule('utils/ExtensionUtils'),
		AppInit				= brackets.getModule('utils/AppInit'),
		PreferencesManager	= brackets.getModule('preferences/PreferencesManager'),
		CommandManager		= brackets.getModule('command/CommandManager'),
		Dialogs				= brackets.getModule('widgets/Dialogs'),
		Menus				= brackets.getModule('command/Menus'),
		Trello				= require('Trello'),
		strings				= require('i18n!nls/strings');

	var mainPanel			= require('text!html/mainPanel.html'),
		prefDialogHTML		= require('text!html/prefsDialog.html'),
		newBoardHTML		= require('text!html/templates/newBoard.html'),
		newListHTML			= require('text!html/templates/newList.html'),
		newCardHTML			= require('text!html/templates/newCard.html'),
		newTasksHTML		= require('text!html/templates/newTasks.html'),
		newTaskTemplate		= require('text!html/templates/newTaskTemplate.html'),
		boardsTemplate		= require('text!html/templates/boardsTemplate.html'),
		listsTemplate		= require('text!html/templates/listsTemplate.html'),
		tasksTemplate		= require('text!html/templates/tasksTemplate.html');

	// Extension Info.
	var _ExtensionID		= 'brackets-trello',
		_ExtensionLabel		= 'Brackets Trello',
		_ExtensionShortcut	= 'Alt-B';

	// Item Type Enums
	var ITEM_TYPE = {
		BOARDS: 1, LISTS: 2, CARDS: 3, TASKS: 4
	};

	// Define preferences.
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');
	_prefs.definePreference('width', 'integer', 260);
	_prefs.definePreference('apitoken', 'string', '');
	_prefs.definePreference('autosynctime', 'integer', 30);
	_prefs.definePreference('useautosync', 'boolean', false);
	_prefs.definePreference('storagepref', 'boolean', false);
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

		dialog.done(function(id) {
			if (id === 'save') {
				Trello._createNewBoard($dialog.find('.board-name').val())
				.done(_displayNotification)
				.fail(_displayError);
			}
		});
	}

	/**
	 * Open New List Dialog
	 */
	function _openNewListDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newListHTML, strings)),
			$dialog = dialog.getElement();

		dialog.done(function(id) {
			if (id === 'save') {
				Trello._createNewList($dialog.find('.list-name').val())
				.done(_displayNotification)
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

		$dialog.keypress(function(e) {
			e.stopPropagation();
		});

		dialog.done(function(id) {
			if (id === 'save') {
				Trello._createNewCard(
					$dialog.find('.card-name').val(),
					$dialog.find('.card-desc').val()
				)
				.done(_displayNotification)
				.fail(_displayError);
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

		$dialog.find('.btn-add-task').click(function() {
			$dialog.find('.form-horizontal').append($(Mustache.render(newTaskTemplate, strings)));
		});

		dialog.done(function(id) {
			if (id === 'save') {

				$dialog.find('.task-name').each(function() {
					if ($(this).val().length >= 1) {
						tasks.push($(this).val());
					}
				});
				Trello._createNewTasks(tasks)
					.done(_displayNotification)
					.fail(_displayError);
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

			$(document).mousemove(function(e) {
				$panel.width(width - (e.pageX - pageX));
			}).mouseup(function() {
				$(document).off('mousemove').off('mouseup');
				_savePrefs('width', $panel.width());
			});
		}).dblclick(_toggleVisibility);

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
		$('.btn-lists', $panel).click(function() {
			_displayLists(true);
		});
		$('.btn-tasks', $panel).click(function() {
			_displayTasks(true);
		});

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
			var thiz = this;
			_savePrefs('selected-list', $(this).attr('id'));
			_savePrefs('selected-list-name', $('h5 a', this).text());
			_setNewButtonActive(ITEM_TYPE.CARDS);
			$(this).find('.cards').show();

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
		});

		// New Item Handlers
		$panel.on('click', '.cmd-new-board', function() {
			_openNewBoardDialog();
		});
		$panel.on('click', '.cmd-new-list', function() {
			_savePrefs('selected-board', $(this).data('board-id'));
			_openNewListDialog();
		});
		$panel.on('click', '.cmd-new-card', function() {
			_savePrefs('selected-list', $(this).data('list-id'));
			_openNewCardDialog();
		});
		$panel.on('click', '.cmd-new-tasks', function() {
			_savePrefs('selected-checklist', $(this).data('checklist-id'));
			_openNewTasksDialog();
		});
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
		Trello._getUserBoards().done(function(data) {
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
		if (visible) {
			_setButtonActive($('.btn-lists', $panel));
			_setNewButtonActive(ITEM_TYPE.LISTS);
			$('.tab-lists', $panel).show();
			return;
		}

		_displaySpinner(true);
		Trello._getBoardLists().done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.LISTS);
			_setButtonActive($panel.find('.btn-lists'));
			$('.tab-lists', $panel).empty().show().append(Mustache.render(listsTemplate, data));
		})
		.fail(_displayError);
	}

	/**
	 * Display Tasks
	 */
	function _displayTasks(visible) {
		if (visible) {
			_setButtonActive($('.btn-tasks', $panel));
			_setNewButtonActive(ITEM_TYPE.TASKS);
			$('.tab-tasks', $panel).show();
			return;
		}
		
		_displaySpinner(true);
		Trello._getCardTasks().done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.TASKS);
			_setButtonActive($panel.find('.btn-tasks'));
			$('.tab-tasks', $panel).empty().show().append(Mustache.render(tasksTemplate, data));
			data.checklists.forEach(function(checklist) {
				checklist.checkItems.forEach(function(item) {
					$('#' + item.id).attr('checked', item.checked);
				});
			});
			if (data.members && data.members.length >= 1) {
				$('.tab-tasks .members', $panel).show();
			}
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
	});

	$icon = $('<a>').attr({
		id: 'brackets-trello-icon',
		href: '#',
		title: 'Brackets Trello'
	}).click(_Main).appendTo($('#main-toolbar .buttons'));
});

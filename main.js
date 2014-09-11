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
		newBoardHTML		= require('text!html/newBoard.html'),
		newListHTML			= require('text!html/newList.html'),
		boardsTemplate		= require('text!html/boardsTemplate.html'),
		listsTemplate		= require('text!html/listsTemplate.html'),
		cardsTemplate		= require('text!html/cardsTemplate.html'),
		tasksTemplate		= require('text!html/tasksTemplate.html'),
		errorTemplate		= require('text!html/errorTemplate.html');

	// Extension Info.
	var _ExtensionID		= 'brackets-trello',
		_ExtensionLabel		= 'Brackets Trello',
		_ExtensionShortcut	= 'Alt-B';

	// Define preferences.
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');
	_prefs.definePreference('width', 'integer', 260);
	_prefs.definePreference('apitoken', 'string', '');
	_prefs.definePreference('autosynctime', 'integer', 0);
	_prefs.definePreference('storagepref', 'boolean', false);
	_prefs.definePreference('selected-board', 'string', '');
	_prefs.definePreference('selected-board-name', 'string', '');
	_prefs.definePreference('selected-list', 'string', '');
	_prefs.definePreference('selected-list-name', 'string', '');
	_prefs.definePreference('selected-card', 'string', '');
	
	// Prefs that will be saved in .brackets.json
	var _projectPrefs = ['selected-board', 'selected-board-name', 'selected-list', 'selected-list-name', 'selected-card'];

	var realVisibility, isVisible, isMenuVisible, autoSyncIntervalId, $icon, $panel;
	
	function _toggleAddMenu() {
		var $menu = $('.add-menu', $panel);
		if (!isMenuVisible) {
			$menu.show();
			isMenuVisible = true;
			return;
		}
		$menu.hide();
		isMenuVisible = false;
	}
	
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
	
	function _openPreferencesDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(prefDialogHTML, strings)),
			$dialog	= dialog.getElement(),
			tempPrefs = {};

		$dialog.find('.trello-api-token').val(_prefs.get('apitoken')).on('change', function (e) {
			tempPrefs.apitoken = $(this).val();
		});
		$dialog.find('.autosync-time').val(_prefs.get('autosynctime')).on('change', function (e) {
			tempPrefs.autosynctime = $(this).val();
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
	
	function _initAutoSync(init) {
		if (init && _prefs.get('autosynctime') >= 1) {
			autoSyncIntervalId = window.setInterval(_initSync, _prefs.get('autosynctime') * 1000);
			return;
		}
		window.clearInterval(autoSyncIntervalId);
	}
	
	function _initSync() {
		console.log('Syncing....', Math.ceil(Math.random() * 10));
	}
	
	function _openNewBoardDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newBoardHTML, strings)),
			$dialog = dialog.getElement();
		
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._createNewBoard($dialog.find('.board-name').val());
			}
		});
	}
	
	function _openNewListDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(newListHTML, strings)),
			$dialog = dialog.getElement();
		
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._createNewList($dialog.find('.list-name').val());
			}
		});
	}
	
	function _openNewCardDialog() {
		
	}
	
	function _openNewTasksDialog() {
		
	}

	/**
	 * Event Controldd
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
		}).dblclick(function() {
			_toggleVisibility();
		});
		
		// Hide on escape
		$(document).keydown(function(e) {
			if (e.which === 27 && isVisible)
				_toggleVisibility();
		});
		
		// Hide on click
		$(document).click(function() {
			if (isMenuVisible) _toggleAddMenu();
		});
		
		// Show/Hide Add Dropdown Menu
		$('.btn-add', $panel).click(function(e) {
			e.stopPropagation();
			_toggleAddMenu();
		});
		$('.btn-prefs', $panel).click(_openPreferencesDialog);
		$('.btn-sync', $panel).click(_initSync);

		// Add Menu Item
		$('.cmd-new-board', $panel).click(_openNewBoardDialog);
		$('.cmd-new-list', $panel).click(_openNewListDialog);
		$('.cmd-new-card', $panel).click(_openNewCardDialog);
		$('.cmd-new-tasks', $panel).click(_openNewTasksDialog);
		
		// Button Actions
		$('.btn-boards', $panel).click(_displayBoards);
		$('.btn-lists', $panel).click(_displayLists);
		$('.btn-cards', $panel).click(_displayCards);
		$('.btn-tasks', $panel).click(_displayTasks);
		
		// Trello Content Listeners
		// Board Name
		$panel.on('click', '.board-item', function () {
			_savePrefs('selected-board', $(this).attr('id'));	
			_displayLists();
		});
		
		// List Name
		$panel.on('click', '.list-item', function() {
			_savePrefs('selected-list', $(this).attr('id'));
			_displayCards();
		});
		
		// Card Name
		$panel.on('click', '.card-item', function() {
			_savePrefs('selected-card', $(this).attr('id'));
			_displayTasks();
		});
	}

	function _setButtonActive(button) {
		$('.btn', $panel).each(function() {
			$(this).removeClass('active');
		});
		$('.tab', $panel).each(function() {
			$(this).hide();
		});
		$(button).addClass('active');
	}
	
	function _displayBoards() {
		Trello._getUserBoards().done(function(data) {
			_setButtonActive($panel.find('.btn-boards'));
			$('.tab-boards', $panel).empty().show().append(Mustache.render(boardsTemplate, data));
		})
		.fail(_displayError);
	}
	
	function _displayLists() {
		Trello._getBoardLists().done(function(data) {
			_savePrefs('selected-board-name', data.name);
			_setButtonActive($panel.find('.btn-lists'));
			$('.tab-lists', $panel).empty().show().append(Mustache.render(listsTemplate, data));
		})
		.fail(_displayError);
	}
	
	function _displayCards() {
		Trello._getListCards().done(function(data) {
			_savePrefs('selected-list-name', data.listName);
			_setButtonActive($panel.find('.btn-cards'));
			$('.tab-cards', $panel).empty().show().append(Mustache.render(cardsTemplate, data));
		})
		.fail(_displayError);
	}
	
	function _displayTasks() {
		Trello._getCardTasks().done(function(data) {
			_setButtonActive($panel.find('.btn-tasks'));
			$('.tab-tasks', $panel).empty().show().append(Mustache.render(tasksTemplate, data));
			data.tasks.forEach(function(task) {
				$('#' + task.id).attr('checked', task.checked);
			});
		})
		.fail(_displayError);
	}
	
	function _displayError(error) {
		_setButtonActive(null);
		$('.tab-error', $panel).empty().show().append(Mustache.render(errorTemplate, { error: error }));
	}
	
	function _displaySpinner(visible) {
		if (visible) {}
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
		var navigateMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		CommandManager.register(_ExtensionLabel, _ExtensionID, _Main);
		navigateMenu.addMenuItem(_ExtensionID, _ExtensionShortcut);
	});

	$icon = $('<a>').attr({
		id: 'brackets-trello-icon',
		href: '#',
		title: 'Brackets Trello'
	}).click(_Main).appendTo($('#main-toolbar .buttons'));
});
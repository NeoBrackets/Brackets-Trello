/*jslint vars: true, plusplus: true, eqeq: true, devel: true, nomen: true,  regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, document */

define(function (require, exports, module) {
	"use strict";

	var ExtensionUtils		= brackets.getModule('utils/ExtensionUtils'),
		AppInit				= brackets.getModule('utils/AppInit'),
		PreferencesManager	= brackets.getModule('preferences/PreferencesManager'),
		CommandManager		= brackets.getModule('command/CommandManager'),
		Menus				= brackets.getModule('command/Menus'),
		mainPanelHTML		= require('text!html/main-panel.html'),
		boardsHTML			= require('text!html/boards-tmpl.html'),
		listsHTML			= require('text!html/lists-tmpl.html'),
		tasksHTML			= require('text!html/tasks-tmpl.html'),
		cardsHTML			= require('text!html/cards-tmpl.html'),
		strings				= require('i18n!nls/strings');

	// Extension Info.
	var _ExtensionID		= 'brackets-trello',
		_ExtensionLabel		= 'Brackets Trello',
		_ExtensionShortcut	= 'Ctrl-Alt-Q';

	// Define preferences.
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');
	_prefs.definePreference('width', 'integer', 300);
	
	var realVisibility, isVisible, $icon, $panel;
	
	// Selected Items
	var selection = {
		boardId: null,
		listId: null,
		cardId: null
	};
	
	var ITEM_TYPE = {
		BOARDS: 1,
		LISTS: 2,
		CARDS: 3,
		TASKS: 4
	};

	function _toggleVisibility() {
		if (!isVisible && !realVisibility) {
			$panel = $(Mustache.render(mainPanelHTML, strings));
			_panelEventController($panel);
			$('#editor-holder').append($panel);
			$panel.width(_prefs.get('width'));
			CommandManager.get(_ExtensionID).setChecked(true);
			$icon.addClass('active');
			realVisibility = true;
		} else if (!isVisible && realVisibility) {
			CommandManager.get(_ExtensionID).setChecked(true);
			$panel.show();
			$icon.addClass('active');
		} else {
			CommandManager.get(_ExtensionID).setChecked(false);
			$panel.hide();
			$icon.removeClass('active');
		}
		isVisible = !isVisible;
	}

	function _panelEventController($panel) {
		// Resizer
		var pageX, width;
		$panel.find('.horz-resizer').on('mousedown', function (e) {
			pageX = e.pageX;
			width = $panel.width();

			$(document).on('mousemove', function (e) {
				$panel.width(width - (e.pageX - pageX));
			}).on('mouseup', function (e) {
				_prefs.set('width', $panel.width());
				$(document).off('mousemove').off('mouseup');
			});
		});

		// Show Add Dropdown Menu
		$panel
		.on('click', '.btn-add', function () {
			$panel.find('.add-menu').show();
		})
		.on('click', '.btn-prefs', function () {
			console.log('Set up preferences');
		})
		.on('click', '.btn-sync', function () {
			console.log('Sync With Trello');
		});

		// Add Menu actions
		var $addMenu = $panel.find('.add-menu');
		$addMenu
		.on('click', '.cmd-new-board', function () {
			$addMenu.hide();
		})
		.on('click', '.cmd-new-list', function () {
			$addMenu.hide();
		})
		.on('click', '.cmd-new-card', function () {
			$addMenu.hide();
		})
		.on('click', '.cmd-new-task', function () {
			$addMenu.hide();
		});

		// Buttons Action
		$panel
		.on('click', '.btn-boards', function () {
			_updateUserInterface(ITEM_TYPE.BOARDS, _getUserBoards(1), $panel.find('.tab-boards'), this);	
		})
		.on('click', '.btn-lists', function () {
			_updateUserInterface(ITEM_TYPE.LISTS, _getBoardLists(1), $panel.find('.tab-lists'), this);
		})
		.on('click', '.btn-tasks', function() {
			_updateUserInterface(ITEM_TYPE.TASKS, _getCardTasks(1), $panel.find('.tab-tasks'), this);
		})
		.on('click', '.btn-changes', function () {
			_updateUserInterface(ITEM_TYPE.TASKS, _getCardTasks(1), $panel.find('.tab-tasks'), this);
		});
		
		// Content Actions
		$panel
		.on('click', '.tab-boards h4', function () {
			selection.boardId = $(this).attr('id');
			_updateUserInterface(ITEM_TYPE.LISTS, _getBoardLists(1), $panel.find('.tab-lists'), $panel.find('.btn-lists'));
		})
		.on('click', '.list > li', function () {
			selection.listId = $(this).attr('id');
			_updateUserInterface(ITEM_TYPE.CARDS, _getListCards(1), $(this).find('.list-item'), $panel.find('.btn-lists'));
		})
		.on('click', '.cards > li', function (e) {
			e.preventDefault();
		});
	}
	
	function _setButtonActive(button) {
		$panel.find('.btn').each(function() {
			$(this).removeClass('active');
		});
		$panel.find('.tab').each(function() {
			$(this).hide();
		});
		$(button).addClass('active');
	}
	
	function _updateUserInterface(type, data, context, btnActive) {
		_setButtonActive(btnActive);
		switch (type) {
				case ITEM_TYPE.BOARDS:
						$(context).empty().show().append(
							Mustache.render(boardsHTML, data)
						);
					break;
				
				case ITEM_TYPE.LISTS:
					$(context).empty().show().append(
						Mustache.render(listsHTML, data)
					);
					break;
				
				case ITEM_TYPE.CARDS:
					$panel.find('.tab-lists').show();
					$(context).empty().show().append(
						Mustache.render(cardsHTML, data)
					);
					$panel.find('.cards').slideToggle();
					
					break;
			
				case ITEM_TYPE.TASKS:
					break;
		}
	}
	
	// Return User Boards
	function _getUserBoards(memberId) {
		return {
			boards: [
				{
					title: 'Adobe Brackets',
					id: 'F75C8A5D'
				},
				{
					title: 'Github Atom',
					id: '01CC5D0F'
				}
			]
		};
	}
	
	function _getBoardLists(boardId) {
		return {
			title: 'Adobe Brackets',
			lists: [
				{
					id: 'a',
					title: 'v2007',
				},
				{
					id: 'b',
					title: 'cs2',
				},
				{
					id: 'c',
					title: 'cs3',
				}
			]
		};
	}
	
	function _getListCards(listId) {
		return {
			cards: [
				{
					id: 'a',
					title: 'Hello'
				},
				{
					id: 'b',
					title: 'This is so nice'
				},
				{
					id: 'c',
					title: 'This is incredible'
				},
				{
					id: 'd',
					title: 'This is excellent'
				}
			]
		};
	}
	
	function _getCardTasks(cardId) {
		
	}
	
	function _execMain() {
		_toggleVisibility();
	}
	
	AppInit.appReady(function () {
		ExtensionUtils.loadStyleSheet(module, 'styles/styles.css');
		var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
		CommandManager.register(_ExtensionLabel, _ExtensionID, _execMain);
		navigateMenu.addMenuItem(_ExtensionID, _ExtensionShortcut);
	});

	$icon = $('<a>').attr({
		id: 'brackets-trello-icon',
		href: '#',
		title: 'Brackets Task Sync'
	}).click(_execMain).appendTo($('#main-toolbar .buttons'));
});
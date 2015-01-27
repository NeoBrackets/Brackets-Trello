/*jslint vars: true, plusplus: true, eqeq: true, devel: true, nomen: true,  regexp: true, indent: 4 */
/*global define, brackets, $, Mustache, document, window */

define(function (require, exports, module) {
	"use strict";

	var ExtensionUtils				= brackets.getModule('utils/ExtensionUtils'),
		AppInit						= brackets.getModule('utils/AppInit'),
		PreferencesManager			= brackets.getModule('preferences/PreferencesManager'),
		DocumentManager         	= brackets.getModule("document/DocumentManager"),
		CommandManager				= brackets.getModule('command/CommandManager'),
		Commands            		= brackets.getModule('command/Commands'),
        EditorManager       		= brackets.getModule('editor/EditorManager'),
		MainViewManager             = brackets.getModule('view/MainViewManager'),
		KeyEvent					= brackets.getModule('utils/KeyEvent'),
		Dialogs						= brackets.getModule('widgets/Dialogs'),
		Menus						= brackets.getModule('command/Menus'),
		ProjectManager          	= brackets.getModule("project/ProjectManager"),
		FileUtils 					= brackets.getModule("file/FileUtils"),
		Parser		              	= require('modules/parser'),
		Trello						= require('Trello'),
		Sync						= require('Sync'),
		strings						= require('i18n!nls/strings'),
		ParseUtils 					= require('modules/parseUtils'),
		TrelloComment				= require('modules/objects/comment');

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
		editCardDescTemplate		= require('text!html/templates/editCardDesc.html'),
		editCardNameTemplate		= require('text!html/templates/editCardName.html'),
		editListNameTemplate		= require('text!html/templates/editListName.html'),
		editBoardNameTemplate		= require('text!html/templates/editBoardName.html'),
		editChecklistNameTemplate	= require('text!html/templates/editChecklistName.html'),
		editTaskNameTemplate		= require('text!html/templates/editTaskName.html'),
		editCommentsTemplate		= require('text!html/templates/editCommentsTemplate.html'),
		deleteConfirmationTemplate	= require('text!html/templates/deleteConfirmationTemplate.html'),
		changesListTemplate 		= require('text!html/templates/changesListTemplate.html');


	var partTemplates 								= {};
	partTemplates.lists 							= require('text!html/templates/parts/lists.html');
	partTemplates.lists_cards						= require('text!html/templates/parts/lists_cards.html');
	partTemplates.lists_cards_all					= require('text!html/templates/parts/lists_cards_all.html');
	partTemplates.lists_cards_checklists			= require('text!html/templates/parts/lists_cards_checklists.html');
	partTemplates.lists_cards_checklists_checkItems	= require('text!html/templates/parts/lists_cards_checklists_checkItems.html');
	partTemplates.lists_cards_comments				= require('text!html/templates/parts/lists_cards_comments.html');
	partTemplates.lists_cards_members				= require('text!html/templates/parts/lists_cards_members.html');
	partTemplates.trelloComments					= require('text!html/templates/parts/trelloComments.html');

	var trelloCommentCards = {};
	var cache = {};

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

	// Prefs that will be saved in .brackets.json
	var _projectPrefs = ['selected-board', 'selected-board-name', 'selected-list', 'selected-list-name'];

	var realVisibility, isVisible, isMenuVisible, autoSyncIntervalId, $icon, $panel;

	// save the state of expanded list and checklists
	var _expandedLists = {},
		_expandedCards = {},
		_expandedChecklists = {},
		_checkedTasksHidden = {};

	var activeUserRole = "user";
	var activeUserId = '';

	var logTypes = ['diffDom','openDialog'];
	
	function log(types,name,output) {
		if (!logTypes) { return; }
		if (arrayIntersect(logTypes,types).length >= 0) {
			console.log('['+types[0]+','+types.last()+'] ',name,output);	
		}
	}
	
	function arrayIntersect(a,b) {
		return $.grep(a, function(i) {
			return $.inArray(i, b) > -1;
		});
	}
	
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
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(prefDialogHTML)),
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
		var boardId 	= _prefs.get("selected-board");
		var listId  	= _prefs.get("selected-list");
		var boardName 	= _prefs.get("selected-board-name");
		var listName  	= _prefs.get("selected-list-name");
				
		cache.ids = {
			"board": boardId,
			"list":	listId
		}
		
		// current tab
		var currentTab = $panel.find('.btn-boards').hasClass('active') ? 'boards' : false;
		if (!currentTab) currentTab = $panel.find('.btn-lists').hasClass('active') ? 'lists' : 'tasks';

		if ((!cache.hasOwnProperty("ids") || $.isEmptyObject(cache.ids)) && currentTab != "boards")
			return;

		Trello._get(currentTab,cache.ids,cache[currentTab+"_settings"])
		.done(function(data) {
			if (currentTab == "boards") {
				_displayBoards();	
			} else if (currentTab == "lists") {
				data.name = boardName;
				data.id   = boardId;
	
				Sync.init(cache.data,data,_expandedCards)
				.done(function(diff) {
					console.log('[main] diff: ',diff);
					console.log('[main] diff.lists: ',diff.lists);
			
					// updata cache
					cache.data = data;

					// change the DOM
					_diff2DOM(diff,data);				
				});
			}
		});
	}

	/**
	 * Change the DOM with the new data (using only the diffs)
	 * @param {Object} diff            changed,added,deleted diff object (between old cache and new data)
	 * @param {Object} data            the new data
	 * @param {String} [cObjectKey=""] concated object keys (concatinated with '_')
	 * @param {Object} [cIndexKeys={}] object of indices for lists,cards...
	 */
	function _diff2DOM(diff,data,cObjectKey,cIndexKeys) {
		cObjectKey 	= (typeof cObjectKey === "undefined") ? "" : cObjectKey;
		cIndexKeys 	= (typeof cIndexKeys === "undefined") ? {} : Object.create(cIndexKeys);
		var keys   	= Object.keys(diff);
		var length  = keys.length;
				
		// iterate over all current keys in the highest diff level
		for (var k = 0; k < length; k++) {
			var name 	= keys[k];
			var newCObjectKey;
			var newCIndexKeys = cIndexKeys;
			var newData = data;
			// if the current key is numeric (is an array in new data)
			if (isNumeric(name)) { // don't add array keys to cObjectKey
				newCObjectKey = cObjectKey;
				// add the last type (lists,cards,...) to the new index keys
				newCIndexKeys[cObjectKey.split('_').last()] = name;
				newData = data[name];
			} else {	
				if (cObjectKey === "") {
					newCObjectKey = name;
					newData = data[name];
				} else {
					newCObjectKey = cObjectKey+"_"+name;
					// only add the new data if there is a tenplate for this level
					if (!(name in data) || !(newCObjectKey in partTemplates)) {
						newCObjectKey = cObjectKey;	
						newData = data;
					} else {
						newData = data[name];	
					}
				}
				newCIndexKeys = cIndexKeys;
			}	
					
			if ("diffType" in diff[name]) {
				_template2DOM(newCObjectKey,newCIndexKeys,newData);
				break;
			} else if (typeof diff[name] === 'object') {
				_diff2DOM(diff[name],newData,newCObjectKey,newCIndexKeys);	
			}
		}
	}
	
	/**
	 * Change the DOM using a template name (inside partTemplates)
	 * @param {String} templateName the templateName which must be a key of partTemplates
	 * @param {Object} where        change the dom at this position (i.e {lists: 0}) change the first list (not Changes)
	 * @param {Array}  data         new data for the dom
	 */
	function _template2DOM(templateName,where,data) {
		log(['main','diff','diffDom','_template2DOM'],'templateName',templateName);
		log(['main','diff','diffDom','_template2DOM'],'where',where);
		log(['main','diff','diffDom','_template2DOM'],'data',data);
		
		
		var templateData = {};
		templateData[templateName.split('_').last()] = [data];
		var combinedTemplate = _combineTemplates(partTemplates[templateName]);
		var templateHTML 	 = Mustache.renderTemplate(combinedTemplate,templateData);
		if (!data) {
			templateHTML = false;
		}
		if ("lists" in where) {
			// +1 for the changes list
			var $list = $('.tab-lists', $panel).find('.list-item:eq('+(parseInt(where.lists)+1)+')');
			if ("cards" in where) {
				var $card = $list.find('.card-item:eq('+where.cards+')');
				if ("checklists" in where) {
					var $checklist = $card.find('.checklist-item:eq('+where.checklists+')');
					if ("checkItems" in where) {
						var $checkitem = $checklist.find('.checkItem-item:eq('+where.checkItems+')');
						$checkitem = addHTML($checklist,$checkitem,templateName,templateHTML);
						if ($checkitem !== false) {
							var boolCheck = (data.state === "complete") ? true : false;
							$checkitem.children('input[type="checkbox"]')[0].checked = boolCheck;
						}
						return;
					}
					addHTML($card,$checklist,templateName,templateHTML);
					return;
				}
				if ("comments" in where) {
					var $comment = $card.find('.card-comment-item:eq('+where.comments+')');
					addHTML($card,$comment,templateName,templateHTML);
					return;
				}
				if ("members" in where) {
					var $member = (where.members == 0) ? $card.find('.'+templateName) : $card.find('.members-item:eq('+where.members+')');
					addHTML($card,$member,templateName,templateHTML);
					return;
				}
				addHTML($list,$card,templateName,templateHTML);
				if (data) {
					$card.find('.card-verbose').css('display','inline');
					// set admin panel and checkmarks on tasks tab
					_taskChecksAndAdmin($card,data);
					$card.find('.members').show();
				}
				return;
			} 
			addHTML($('.tab-lists', $panel),$list,templateName,templateHTML);
		}
		
		function addHTML($parent,$ele,templateName,templateHTML) {
			if ($ele.length === 0) {
				$ele = $(templateHTML).appendTo($parent.find('.tmpl_'+templateName));
			} else {
				if (!templateHTML) {
					$ele.remove();
					$ele = false;
				} else {
					var $newEle = $ele.after(templateHTML);
					$ele.remove();
					$ele = $newEle;
				}
			}	
			console.log('addHTML result = ',$ele);
			return $ele;
		}
	}
	
	if (!Array.prototype.last){
		Array.prototype.last = function(){
			return this[this.length - 1];
		};
	};
	
	function isNumeric ( obj ) {
		return !$.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
	}
	
	/**
	 * Open New Board Dialog
	 */
	function _openNewBoardDialog($this) {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(newBoardHTML)),
			$dialog = dialog.getElement();
		$dialog.find('.board-name').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('board',{},{name:$dialog.find('.board-name').val()})
				.done(
					function(data) {
						
						// add the new board to the panel
						// get the correct children because boards are ordered by name asc
						var index = 0;
						var found = false;
						$.each($('.tab-boards', $panel).children('.boards').children('.board-item'), function(nthChild,item) {
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
	function _openNewListDialog($this) {
		var boardId = _prefs.get('selected-board');
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(newListHTML)),
			$dialog = dialog.getElement();
		$dialog.find('.list-name').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('list',{board:boardId},{name:$dialog.find('.list-name').val(),pos:"bottom"})
				.done( function(data) {

						// add the new list
						data.totalCards = 0;
						var combinedTemplate = _combineTemplates(partTemplates.lists);
						$('.tab-lists', $panel).find('.tmpl_lists').append(
							Mustache.renderTemplate(combinedTemplate, {lists:data})
						);

						// update the cache
						cache.data.lists.push(data);
						log(['main','openDialog','_openNewListDialog'],'cache',cache);
					})
				.fail(_displayError);
			}
		});
	}

	/**
	 * Open New Card Dialog
	 */
	function _openNewCardDialog($this) {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(newCardHTML)),
			$dialog = dialog.getElement();
		$dialog.find('.card-name').focus();
		$dialog.keypress(function(e) {
			e.stopPropagation();
		});

		var eleArr	= $this.getClosest(['list']);
		log(['main','openDialog','_openNewCardDialog'],'eleArr',eleArr);

		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('card',
							   {list:_prefs.get('selected-list')},
							   {name:$dialog.find('.card-name').val(),desc:$dialog.find('.card-desc').val()}
							  )
				.done( function(data) {
						data.taskCount = '';
						var combinedTemplate = _combineTemplates(partTemplates.lists_cards);
						eleArr.item.list.find('.tmpl_lists_cards').append(
							Mustache.renderTemplate(combinedTemplate, {cards:data})
						);

						// update the cache
						if ("cards" in cache.data.lists[eleArr.index.list]) {
							cache.data.lists[eleArr.index.list].cards.push(data);
						} else {
							cache.data.lists[eleArr.index.list].cards = [data];
						}

						log(['main','openDialog','_openNewCardDialog'],'cache',cache);
					})
				.fail(_displayError);
			}
		});
	}

	/**
	 * New Checklist Dialog
	 */
	function _openNewChecklistDialog() {
		var boardId 	= _prefs.get("selected-board");
		var cardId  	= $(this).closest('.card-item').data('card-id');
		var $checklists = $(this).closest('.checklists');
		var dialog 		= Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(checklistTemplate)),
			$dialog 	= dialog.getElement(), name, tasks = [];
		$dialog.find('.checklist-name').focus();
		$dialog.find('.btn-add-task').click(function() {
			$dialog.find('.form-horizontal').append($(Mustache.renderTemplate(newTaskTemplate)));
		});

		var eleArr	= $(this).getClosest(['card','list']);
		log(['main','openDialog','_openNewChecklistDialog'],'eleArr',eleArr);

		dialog.done(function(id) {
			if (id === 'save') {
				name = $dialog.find('.checklist-name').val();
				$dialog.find('.task-name').each(function() {
					var value = $(this).val().trim();
					if (value.length >= 1) {
						tasks.push(value);
					}
				});
				Trello._create('checklist',{board:boardId,card:cardId},{name:name,tasks:tasks}).done( function(data) {

					var combinedTemplate = _combineTemplates(partTemplates.lists_cards_checklists);
					// add the new task
					$checklists.children('.cmd-new-checklist').before(
						Mustache.renderTemplate(combinedTemplate, {checklists:data.checklist})
					);

					// update the cache
					if ("checklists" in cache.data.lists[eleArr.index.list].cards[eleArr.index.card]) {
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists.push(data.checklist);
					} else {
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists = [data.checklist];
					}
									
					for (var t = 0; t < tasks.length; t++) {
						var task = data.tasks[t];
						var combinedTemplate = _combineTemplates(partTemplates.lists_cards_checklists_checkItems);

						// add the new task
						$checklists.find('.checklist-item').last().children('.tasks').append(
							Mustache.renderTemplate(combinedTemplate, {checkItems:task})
						);

						// update the cache
						if ("checkItems" in cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists.last()) {
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists.last().checkItems.push(task);
						} else {
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists.last().checkItems = [task];
						}
					}
					log(['main','openDialog','_openNewChecklistDialog'],'cache',cache);
				}).fail(_displayError);
			}
		});
	}

	/**
	 * Open New Tasks Dialog
	 */
	function _openNewTasksDialog() {
		
		var eleArr = $(this).getClosest(['checklist','card','list']);
		log(['name','openDialog','_openNewTasksDialog'],'eleArr',eleArr);
		
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(newTasksHTML)),
			$dialog = dialog.getElement(),
			tasks = [];
		
		$dialog.find('.task-name:first-child').focus();
		$dialog.find('.btn-add-task').click(function() {
			$dialog.find('.form-horizontal').append($(Mustache.renderTemplate(newTaskTemplate)));
		});
		$dialog.find('.task-name:last-child').focus();

		dialog.done(function(id) {
			if (id === 'save') {
				var tasks = [];
				$dialog.find('.task-name').each(function() {
					var value = $(this).val().trim();
					if (value.length >= 1) {
						tasks.push(value);
					}
				})
				
				Trello._createTasks([],eleArr.id.checklist,tasks,0,tasks.length)
				.done(function(data) {
						for (var t = 0; t < data.length; t++) {
							var task = data[t];
							
							var checkItemIndex = eleArr.item.checklist.find('.checkItem-item').length;
							log(['name','openDialog','_openNewTasksDialog'],'checkItemIndex',checkItemIndex);
							// add to the cache
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card]
							 .checklists[eleArr.index.checklist].checkItems[checkItemIndex] = task;
							
							var combinedTemplate = _combineTemplates(partTemplates.lists_cards_checklists_checkItems);
							// add the new task
							eleArr.item.checklist.find('.tmpl_lists_cards_checklists_checkItems').append(
								Mustache.renderTemplate(combinedTemplate, {checkItems:task})
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
		var $members  = $(this).closest('.members');
		var boardId   = _prefs.get("selected-board");
		var $card	  = $(this).closest('.card-item');
		var cardId    = $card.data('card-id');	
		var $list 	  = $card.closest('.list-item');
		
		var eleArr  = $(this).getClosest(["member","card","list"]);
		log(['main','addDialog','_openNewMemberDialog'],'eleArr',eleArr);

		Trello._get('boardMembers',{board:boardId},{}).done(function(boardMembers) {
			Trello._get('cardMembers',{card:cardId},{}).done(function(cardMembers) {
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
				var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(newMembersTemplate, { members: members, strings: strings })),
					$dialog = dialog.getElement();

				dialog.done(function(id) {
					if (id == "save") {
						var newMembers = [];
						$dialog.find(".memberInput").each(function() {
							if ($(this).prop('checked')) {
								newMembers.push($(this).data('member-id'));
							}
						});
						Trello._addNewMembers(newMembers,cardId).done( function(data) { 
							// startindex for memberIndex 
							var startIndex = $members.find('member-item').length;
							var showNewMembers = [];
							var combinedTemplate = _combineTemplates(partTemplates.lists_cards_members);
							for (var nm = 0; nm < data.idMembers.length; nm++) {
								var found = false;
								for (var m = 0; m < members.length; m++) {
									if (members[m].id == data.idMembers[nm]) {
										showNewMembers.push(members[m]);
										// add to the cache
										cache.data.lists[eleArr.index.list].cards[eleArr.index.card].members.push(members[m]);
										log(['main','addDialog','_openNewMemberDialog'],'cache',cache);
										break;
									}
								}
							}
							
							
							
							$members.find('.tmpl_lists_cards_members').prepend(
								Mustache.renderTemplate(combinedTemplate, {members:showNewMembers})
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
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editBoardNameTemplate)),
			$dialog = dialog.getElement();
			$dialog.find('.board-name').val($(this).parent('h4').text().trim()).focus();
			dialog.done(function(id) {
				if (id === 'save') {
					var name = $dialog.find('.board-name').val();
					if (name.length >= 1) {
						Trello._edit('board',{board:boardId},{name:name}).done( function(data) {
							
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
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editListNameTemplate)),
			$dialog = dialog.getElement();
		$dialog.find('.list-name').val($(this).siblings('a').text()).focus();
		
		var $listItem = $(this).closest('.list-item');
		var listId 	  = $listItem.data('list-id');
		
		var listIndex = $listItem.index()-1; // cause of the changes list
		
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.list-name').val();
				if (name.length >= 1) {
					Trello._edit('list',{list:listId},{name:name}).done( function(data) {
							// we need to change the name inside the ui as well
							$listItem.children('.list-name').children('a').text(name);
							// add to the cache
							cache.data.lists[listIndex].name = name;
							// new list name inside prefs
							_savePrefs('selected-list-name',name);
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditCardNameDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editCardNameTemplate)),
			$dialog = dialog.getElement();

		var $cardName = $(this).parent('.card-item').children('.card-name');
		$dialog.find('.card-name').val($cardName.text().trim()).focus();
		
		var $card 	= $(this);
		var eleArr  = $(this).getClosest(["card","list"]);
		log(['main','openDialog','_openEditCardNameDialog'],'eleArr',eleArr);
			
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.card-name').val();
				if (name.length >= 1) {
					Trello._edit('card',{card:eleArr.id.card},{name:name}).done( function(data) {
							// we need to change the name inside the ui as well
							$cardName.text(name);
							// add to the cache
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].name = name;
							log(['main','openDialog','_openEditCardNameDialog'],'cache.data.lists',cache.data.lists);
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditCardDescDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editCardDescTemplate)),
			$dialog = dialog.getElement();

		var $cardDesc = $(this).parent('p').children('.card-desc');
		// check if the description is the default value 
		if ($cardDesc.children('.default').length === 0) {
			$dialog.find('.card-desc').val($cardDesc.text().trim()).focus();
		}
		
		var $card 	= $(this);
		var eleArr  = $(this).getClosest(["card","list"]);
		
		dialog.done(function(id) {
			if (id === 'save') {
				var desc = $dialog.find('.card-desc').val();
				if (desc.length >= 1) {
					Trello._edit('card',{card:eleArr.id.card},{desc:desc}).done(function(data) {
							// we need to change the desc inside the ui as well
							$cardDesc.text(desc);
							// add to the cache
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].desc = desc;
						}).fail(_displayError);
				}
			}
		});
	}

	function _openEditChecklistDialog(e) {
		e.stopPropagation();
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editChecklistNameTemplate)),
			$dialog = dialog.getElement();
		$dialog.find('.checklist-name').val($(this).parent('h5').text().trim()).focus();
		
		var eleArr  	= $(this).getClosest(["checklist","card","list"]);
		log(['main','openDialog','_openEditChecklistDialog'],'eleArr',eleArr);
		
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.checklist-name').val();
				Trello._edit('checklist',{checklist:eleArr.id.checklist},{name:name}).done(function(data) {
							// we need to change the name inside the ui as well
							eleArr.item.checklist.find('.checklist-name').text(name);
							// add to the cache
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists[eleArr.index.checklist].name = name;
						}).fail(_displayError);
			}
		});
	}

	function _openEditTaskDialog(e) {
		e.stopPropagation();
		var dialog = Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(editTaskNameTemplate)),
			$dialog = dialog.getElement();
		
		var $checkItem 	= $(this);
		var eleArr  = $(this).getClosest(["checkItem","checklist","card","list"]);
		log(['main','openDialog','_openEditTaskDialog'],'eleArr',eleArr);
		
		
		$dialog.find('.task-name').val($(this).siblings('label').text().trim()).focus();
		dialog.done(function(id) {
			if (id === 'save') {
				var name = $dialog.find('.task-name').val();
				Trello._edit('checkitem',{
								card:eleArr.id.card,checklist:eleArr.id.checklist,checkitem:eleArr.id.checkItem
								},{value:name})
				.done(function(data) {
					// we need to change the name inside the ui as well
					eleArr.item.checklist.find('.checkItem-item').children("label[for='"+eleArr.id.checkItem+"']").text(name);
					// add to the cache
					cache.data.lists[eleArr.index.list].cards[eleArr.index.card]
					.checklists[eleArr.index.checklist].checkItems[eleArr.index.checkItem].name = name;
				}).fail(_displayError);
			}
		});
	}

	function _getOptions(type) {
		var options = {};
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
		Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.BOARDS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('board',{board:boardId}).done(function(data) {
						_displayBoards();
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteListDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var eleArr = $(this).getClosest(['list']);
		log(['main','deleteDialog','_openDeleteListDialog'],'eleArr',eleArr);
		var listId = thisEle.data('list-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.LISTS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('list',{list:listId}).done(function(data) {
						thisEle.parent('.list-name').parent('.list-item').remove();
						// update cache
						cache.data.lists.splice(eleArr.index.list,1);
						log(['main','deleteDialog','_openDeleteListDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteCardDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var eleArr = $(this).getClosest(['list','card']);
		log(['main','deleteDialog','_openDeleteCardDialog'],'eleArr',eleArr);

		var cardId  = $(this).closest('.card-item').data('card-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.CARDS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('card',{card:cardId}).done(function(data) {
						thisEle.closest('.card-item').remove();
						// update cache
						cache.data.lists[eleArr.index.list].cards.splice(eleArr.index.card,1);
						log(['main','deleteDialog','_openDeleteCardDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteChecklistDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var eleArr = $(this).getClosest(['checklist','list','card']);
		log(['main','deleteDialog','_openDeleteChecklistDialog'],'eleArr',eleArr);

		var checklistId = thisEle.data('checklist-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.CHECKLISTS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('checklist',{checklist:checklistId}).done(function(data) {
						thisEle.closest('.checklist-item').remove();
						// update cache
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].checklists.splice(eleArr.index.checklist,1);
						log(['main','deleteDialog','_openDeleteChecklistDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteTaskDialog(e) {
		e.stopPropagation();
		var thisEle = $(this);
		var eleArr = $(this).getClosest(['checkItem','checklist','list','card']);
		log(['main','deleteDialog','_openDeleteTaskDialog'],'eleArr',eleArr);

		var checklistId = thisEle.closest('.checklist-item').data('checklist-id');
		var taskId = thisEle.data('task-id');
		Dialogs.showModalDialogUsingTemplate(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.TASKS)))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('checkItem',{checklist:checklistId,checkItem:taskId}).done(function(data) {
						thisEle.parent('.checkItem-item').remove();
						// update cache
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card]
						 .checklists[eleArr.index.checklist].checkItems.splice(eleArr.index.checkItem,1);
						log(['main','deleteDialog','_openDeleteTaskDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	function _toggleCheckedListItems(e) {
		e.stopPropagation();
		var $checklist = $(this).parents('div'),
			$taskItems = $checklist.find('.checkItem-item');
		var checklistId = $checklist.data('checklist-id');
		

		if (!_checkedTasksHidden[checklistId]) {
			_checkedTasksHidden[checklistId] = true;
			$taskItems.each(function() {
				var $this = $(this);
				if ($this.find('input').attr('checked') === 'checked' || $this.find('input').prop('checked')) {
					$this.hide();
				}
			});
		} else {
			_checkedTasksHidden[checklistId] = false;
			$taskItems.each(function() {
				$(this).show();
			});
		}
	}

	function _openAddCommentDialog(e) {
		e.stopPropagation();
		var $comments = $(this).closest('.card-comments');
		var cardId = $(this).closest('.card-item').data('card-id');
		var dialog = Dialogs.showModalDialogUsingTemplate($(Mustache.renderTemplate(newCommentTemplate))),
			$dialog = dialog.getElement();

		var eleArr = $(this).getClosest(['card','list']);
		log(['main','addDialog','_openAddCommentDialog'],'eleArr',eleArr);

		$dialog.find('.card-comment-text').focus();
		dialog.done(function(id) {
			if (id === 'save') {
				Trello._create('comment',{card:cardId},{text:$dialog.find('.card-comment-text').val()})
					.done(function(data) {
						var commentObj = {};
						commentObj.id = data.id;
						commentObj.fullName = data.memberCreator.fullName,
						commentObj.username = data.memberCreator.username,
						commentObj.avatarHash = data.memberCreator.avatarHash,
						commentObj.comment = data.data.text;

						var combinedTemplate = _combineTemplates(partTemplates.lists_cards_comments);
						$comments.find('.tmpl_lists_cards_comments').prepend(
							Mustache.renderTemplate(combinedTemplate, {comments:commentObj})
						);

						// update the cache
						if ("comments" in cache.data.lists[eleArr.index.list].cards[eleArr.index.card]) {
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].comments.splice(0,0,commentObj);
						} else {
							cache.data.lists[eleArr.index.list].cards[eleArr.index.card].comments = [commentObj];
						}
						log(['main','addDialog','_openAddCommentDialog'],'cache',cache);

						var $comment = $comments.children('.card-comment-item').last();
						// you can always delete/edit your own card
						$comment.find('.card-comment-body h5')
							.append($('<i class="btn-cmd btn-edit cmd-edit-comment" data-comment-id="'+commentObj.id+'" />'))
							.append($('<i class="btn-cmd btn-delete cmd-delete-comment" data-comment-id="'+commentObj.id+'" />'));
					})
					.fail(_displayError);
			}
		});
	}

	function _openEditCommentDialog() {
		var dialog = Dialogs.showModalDialogUsingTemplate($(Mustache.renderTemplate(editCommentsTemplate))),
			$dialog = dialog.getElement();
		$dialog.find('.card-comment-text').val($(this).parent('h5').siblings('p').html()).focus();
		var $commentHtml= $(this).closest('.card-comment-body').find('.card-comment');
		var eleArr = $(this).getClosest(['card-comment','card','list']);
		log(['main','editDialog','_openEditCommentDialog'],'eleArr',eleArr);

		var commentId 	= $(this).data('comment-id');
		var cardId   	= $(this).closest('.card-item').data('card-id');

		dialog.done(function(id) {
			if (id === 'save') {
				var commentText = $dialog.find('.card-comment-text').val();
				Trello._edit('comment',{card:cardId,comment:commentId},{text:commentText})
					.done(function(data) {
						$commentHtml.html(commentText);
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].comments[eleArr.index.card_comment].comment = commentText;
						log(['main','editDialog','_openEditCommentDialog'],'cache',cache);
					})
					.fail(_displayError);
			}
		});
	}

	function _openDeleteCommentDialog() {
		var $comment = $(this).closest('.card-comment-item');
		var cardId = $(this).closest('.card-item').data('card-id');
		var commentId = $(this).data('comment-id');

		var eleArr = $(this).getClosest(['card-comment','card','list']);
		log(['main','deleteDialog','_openDeleteCommentDialog'],'eleArr',eleArr);
		Dialogs.showModalDialogUsingTemplate($(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.COMMENT))))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('comment',{comment:commentId,card:cardId}).done(function(data) {
						$comment.remove();
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].comments.splice(eleArr.index.card_comment,1);
						log(['main','deleteDialog','_openDeleteCommentDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	function _openDeleteMemberDialog(e) {
		e.preventDefault();
		var $member 	= $(this).closest('.member-item');
		var cardId   	= $(this).closest('.card-item').data('card-id');
		var memberId 	= $(this).data('member-id');

		var eleArr = $(this).getClosest(['member','card','list']);
		log(['main','deleteDialog','_openDeleteMemberDialog'],'eleArr',eleArr);
		Dialogs.showModalDialogUsingTemplate($(Mustache.renderTemplate(deleteConfirmationTemplate, _getOptions(ITEM_TYPE.MEMBER))))
			.done(function(id) {
				if (id === 'yes') {
					Trello._delete('cardMember',{card:cardId,member:memberId}).done(function(data) {
						$member.remove();
						cache.data.lists[eleArr.index.list].cards[eleArr.index.card].members.splice(eleArr.index.member,1);
						log(['main','deleteDialog','_openDeleteMemberDialog'],'cache',cache);
					}).fail(_displayError);
				}
			});
	}

	/**
	 * Display Notification
	 */
	function _displayNotification(text) {
		if (!text || text.toString().trim().length === 0) {
			return;
		}

		var $notification = $('.notification', $panel);

		$notification.empty().css('top', ($panel.height() + $panel.prop('scrollTop') - 40) + 'px').html(text.toString()).animate({
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
		$panel.on('mousedown', '.card-item, .code-comment-item', function(evt) {
			var py = evt.pageY, $this = $(this), offset = $this.offset(), scrollTop = $panel.prop('scrollTop');
			var $fromList, $toList, $dropzone, fromListId, toListId, cardId, isComment, bottom;

			$fromList = $this.parents('.list-item');
            isComment = $this.hasClass('code-comment-item');

			$(document).on('mousemove', function(e) {
                
                // add a mouse move range to protect click event
                if (Math.abs(e.pageY - py) <= 1 ) {
                    return;
                }
				
				// scroll with mouse moving
				bottom = $panel.prop('clientHeight') - e.pageY;
				if (bottom < 20) {
					$panel.prop('scrollTop', $panel.prop('scrollTop') + 20);
				} else if ($panel[0].clientHeight - bottom < 20 ) {
					$panel.prop('scrollTop', $panel.prop('scrollTop') - 20);
				}
				
				$this.css({
					top: (isComment) ? $panel.prop('scrollTop') - scrollTop + e.pageY - py : offset.top + $panel.prop('scrollTop') + e.pageY - py
				}).addClass('moving');
				
				$dropzone = _getActiveDropzone($this);
				if ($dropzone) {
					$dropzone.addClass('dropzone');
				}
			}).on('mouseup', function() {
                
                // check moving before
                if (!$this.hasClass('moving')) {
                    $(this).off('mousemove').off('mouseup');
                    return;
                }
                
                // remove style
				$this.removeClass('moving');
				$this.removeAttr('style');
                if ($dropzone) {
                    $dropzone.removeClass('dropzone');
                }

                if ( !$dropzone || (_isChangesList($dropzone) && !isComment) 
                    || $fromList.data('list-id') === $dropzone.data('list-id') ) {
                    // trello card wouldn't be moved to changes list or none list, or src list equal to dest list
                    // note: this is a trick to stop click event after draging
                    var captureClickAfterDragFunc = function(e) {
                        e.stopPropagation(); 
                        this.removeEventListener('click', captureClickAfterDragFunc, true);
                    };
                    $this.parents('.cards')[0].addEventListener('click', captureClickAfterDragFunc, true);
                    $(this).off('mousemove').off('mouseup');
                    return;
                }
				
				// move card|comment to list
				var newTagName = '';
				if ($dropzone.data('list-id').trim() !== 'changes-list') {
					newTagName = $dropzone.find('.list-name a').text().trim();
				}
				var oldComment = new TrelloComment(),
					fullPath = DocumentManager.getCurrentDocument().file._path,
					cursorPos = EditorManager.getCurrentFullEditor().getCursorPos(true);

				// update comment tag and refresh lists
				oldComment.filePath($this.data('file-path'));
				oldComment.lineNumber(Number($this.data('line-number')));
				oldComment.lineCh(Number($this.data('line-ch')));
				oldComment.fullContent($this.data('full-content'));

				// change comment tag
				_changeCommentTagInFile(oldComment, newTagName, function () {
					_jumpToFile(fullPath, cursorPos);
				});

                // update comment counter
				$toList = $this.parents('.list-item');
                _updateCodeCommentCounter($fromList);
                _updateCardCounter($fromList);
                _updateCodeCommentCounter($toList);
                _updateCardCounter($toList);

                // push card moving to trello
                if (!isComment) { 
                    fromListId = $fromList.data('list-id');
                    toListId = $toList.data('list-id');
                    cardId = $this.data('card-id');
                    if (fromListId !== toListId) {
                        Trello._move('card', { 
                            toList:toListId,
                            card: cardId 
                        }, {
                            pos:"bottom"
                        } ).fail(_displayError);
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

		// Trello Content Listeners
		// Board Name
		$panel.on('click', '.board-item', function () {
			_savePrefs('selected-board', $(this).data('board-id'));
			_savePrefs('selected-board-name', $(this).children('h4').text());
			_setNewButtonActive(ITEM_TYPE.LISTS);
			_displayLists();
		});

		// List Name
		$panel.on('click', '.list-item .list-name', function() {
			_savePrefs('selected-list', $(this).data('list-id'));
			_savePrefs('selected-list-name', $(this).text());
			_setNewButtonActive(ITEM_TYPE.CARDS);

			var $cards = $(this).parents('.list-item').find('.cards, .cmd');
			if ($cards.css('display') === 'none') {
				_expandedLists[$(this).data('list-id')] = true;
				$cards.show();
			}
			else if ($cards.css('display') === 'block') {
				_expandedLists[$(this).data('list-id')] = false;
				$cards.hide();
			}
		});

		// Card Name
		$panel.on('click', '.card-item .card-name', function(e) {
			e.stopPropagation();
			var $card 		= $(this).parents('.card-item');
			var cardId 	  	= $card.data('card-id');
			var $listItem 	= $card.closest('.list-item');
            _savePrefs('selected-list', $listItem.data('list-id'));
            _savePrefs('selected-list-name', $listItem.find('h5 a').html());

			if (e.shiftKey && cardId in trelloCommentCards) {
				// Open file and locate to comment in editor.
				var comment = trelloCommentCards[cardId];
				CommandManager.execute( Commands.FILE_OPEN, { fullPath: comment._filePath } ).done( function() {
					// Set focus on editor.
					MainViewManager.focusActivePane();
					EditorManager.getCurrentFullEditor().setCursorPos(
						comment._lineNum - 1,
						comment._lineCh,
						true );
				});
			} else {
				_displayCard($card);
			}
		});

		// Task Name
		$panel.on('change', '.checkItem-item input', function(e) {
			var cardId   	= $(this).closest('.card-item').data('card-id');
			var checkListId = $(this).closest('.checklist-item').data("checklist-id");
			var $checkItem  = $(this);
			_changeTaskState(cardId,checkListId,$checkItem);
		});

		// Changes List comment
        $panel.on('click', '.code-comment-item', function(e){
            e.stopPropagation();
            var lineNumber = $(this).data('line-number'),
                filePath = $(this).data('file-path'),
                lineCh = $(this).data('line-ch');

            // Open file and locate to comment in editor.
            CommandManager.execute( Commands.FILE_OPEN, { fullPath: filePath } ).done( function() {
                // Set focus on editor.
//                EditorManager.focusEditor();
				MainViewManager.focusActivePane();
                EditorManager.getCurrentFullEditor().setCursorPos(
                    lineNumber - 1,
                    lineCh,
                    true );
            } );
        });

		$panel.on('click', '.checklist-name', function() {
			var $checklist 	= $(this).siblings('.tasks');
			var checklistId = $checklist.data('checklist-id');
			if ($checklist.css('display') === 'none') {
				_expandedChecklists[checklistId] = true;
				$checklist.show();
			}
			else if($checklist.css('display') === 'block') {
				_expandedChecklists[checklistId] = false;
				$checklist.hide();
			}
		});

		$panel.on('click', '.cmd-hide-comments', function() {
			var $comments = $(this).siblings('.card-comment-item');
			if ($comments.css('display') === 'none') {
				$comments.show();
			} else if ($comments.css('display') === 'block') {
				$comments.hide();
			}
			_prefs.set('show-comments', !(_prefs.get('show-comments')));
		});

		// New Item Handlers
		$panel.on('click', '.cmd-new-board', function() {
			_openNewBoardDialog($(this));
		});
		$panel.on('click', '.cmd-new-list', function() {
			_savePrefs('selected-board', $(this).data('board-id'));
			_openNewListDialog($(this));
		});
		$panel.on('click', '.cmd-new-card', function(e) {
			e.stopPropagation();
			_savePrefs('selected-list', $(this).data('list-id'));
			_openNewCardDialog($(this));
		});
		$panel.on('click', '.cmd-new-tasks', _openNewTasksDialog);
		
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
		$panel.on('click', '.cmd-delete-checkItem', _openDeleteTaskDialog);
		$panel.on('click', '.cmd-delete-member', _openDeleteMemberDialog);

		// Hide Checked Items
		$panel.on('click', '.cmd-hide-checked', _toggleCheckedListItems);

		// Add, Delete, Edit comments
		$panel.on('click', '.cmd-add-comment', _openAddCommentDialog);
		$panel.on('click', '.cmd-delete-comment', _openDeleteCommentDialog);
		$panel.on('click', '.cmd-edit-comment', _openEditCommentDialog);

		// Push Trello Comments
		$panel.on('click', '.cmd-push-comments', _pushComments);

		// Push a single Trello Comment
		$panel.on('click', '.cmd-push-comment', _pushComments);
	}
    
	/**
	 * update list's code comment counter and refresh view
	 * 
	 * @param{object} $listItem list item's jquery object
	 */
	function _updateCodeCommentCounter($listItem) {
		var $counterItem = $listItem.find('.code-comment-counter'),
			count = $listItem.find('.code-comment-item').length;

		if (_isChangesList($listItem)) {
			$counterItem.html(count);
		} else if (count === 0) {
			$counterItem.html('');
		} else {
			$counterItem.html('+' + count);
		}
	}
    
    /**
	 * update list's card counter and refresh view
	 * 
	 * @param{object} $listItem list item's jquery object
	 */
    function _updateCardCounter($listItem) {
        var $counterItem = $listItem.find('.totalCards'),
			count = $listItem.find('.card-item').length;
        
        if ($counterItem.length > 0) {
            $counterItem.text(count);
        }
    }

	/**
	 * 
	 * @param{Object} $listItem list jquery item
	 * return true if the list is changes list, otherwise false
	 */
	function _isChangesList($listItem) {
		return $listItem.data('list-id') === 'changes-list';
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
			cache 	=$.extend({},cache,{
					data: data,
					ids: {},
					boards_settings: {fields:["id","name"]}
			});
			$('.tab-boards', $panel).empty().show().append(Mustache.renderTemplate(boardsTemplate, data));
		})
		.fail(_displayError);
	}

	/**
	 * Display Users' Lists
	 */
	function _displayLists(visible) {	
		var boardName = _prefs.get("selected-board-name");
		var boardId   = _prefs.get("selected-board");

		/**
		if (visible) {
			_setButtonActive($('.btn-lists', $panel));
			_setNewButtonActive(ITEM_TYPE.LISTS);
			$('.tab-lists', $panel).show();
			return;
		}*/

		_displaySpinner(true);
		Trello._get('lists',{board:boardId},{fields:["id","name"],cards:["open"],card_fields:["name","badges"],members:["all"]})
		.done(function(data) {
			_displaySpinner(false);
			_setNewButtonActive(ITEM_TYPE.LISTS);
			_setButtonActive($panel.find('.btn-lists'));
			data.name = boardName;
			data.id   = boardId;
			activeUserId = data.memberRole.idMember;
			activeUserRole = data.memberRole.memberType;

			var combinedTemplate = _combineTemplates(listsTemplate);	
			console.log('list data: ', data);
			cache  	= $.extend({},cache,{
				data: data,
				ids:{board:boardId},
				lists_settings:
					{
						fields:["id","name"],
						cards:["open"],card_fields:["name","badges"],members:["all"]
					}
			});
			$('.tab-lists', $panel).empty().show().append(Mustache.renderTemplate(combinedTemplate, data));
		})
		.fail(_displayError)
		.always(function(){
            displayTrelloComments(Parser.getTrelloComments());
			_expandLists();
        });
	}

	/**
	 * Display Tasks Tab (all about a special card)
	 * @param {jQuery} $card card object
	 */
	function _displayCard($card) {
		console.log('displayCard');
		var boardName 	= _prefs.get("selected-board-name");
		var listName 	= _prefs.get("selected-list-name");
		
		// check if the current card is alread expanded
		var cardId 		 = $card.data('card-id');
		var $cardVerbose = $card.children(".card-verbose");
		var cardIndex = $card.index();
		var eleArr = $card.getClosest(['list']);
		
		if ($cardVerbose.css("display") === 'inline') {
			$cardVerbose.html('');	
			$cardVerbose.css('display','none');	
			$card.removeClass('card-active');	
			delete _expandedCards[cardId];
			// get id,name,taskCount of card
			var cardName 	  = cache.data.lists[eleArr.index.list].cards[cardIndex].name;
			var cardTaskCount = cache.data.lists[eleArr.index.list].cards[cardIndex].taskCount;
			// reset the cache
			cache.data.lists[eleArr.index.list].cards[cardIndex] = {id: cardId, name: cardName, taskCount: cardTaskCount};
			return;
		}
		
		_displaySpinner(true);
		Trello._get('tasks',{card:cardId},
					{members:[true],actions:['commentCard'],
					 member_fields:["avatarHash","username","fullName"]}
				   )
		.done(function(data) {
			_displaySpinner(false);
			
			var combinedTemplate = _combineTemplates(partTemplates.lists_cards_all);
			
			
			
			// fill the cache with the new card
			
			console.log('eleArr.index.list: '+eleArr.index.list);
			console.log('cardIndex: '+cardIndex);
			var taskCount = cache.data.lists[eleArr.index.list].cards[cardIndex].taskCount;
			cache.data.lists[eleArr.index.list].cards[cardIndex] = data;
			cache.data.lists[eleArr.index.list].cards[cardIndex].taskCount = taskCount;
			console.log('cache: ',cache.data);
			
			
			$cardVerbose.html(Mustache.renderTemplate(combinedTemplate, data));
			$cardVerbose.css('display','inline');
			
			$card.addClass('card-active');
			_expandedCards[cardId] = {listId: eleArr.id.list};

			
			// set admin panel and checkmarks on tasks tab
			_taskChecksAndAdmin($card,data);
			$card.find('.members').show();

		})
		.fail(_displayError);
	}

	/**
	 * Expand all lists that were open using _expandedLists
	 */
	function _expandLists() {
		$panel.find(".lists").children('.list-item').each(function(index) {
			if (_expandedLists[$(this).data('list-id')]) {
				$(this).children('.list-name').trigger("click");
			}
		});
	}
	
	/**
	 * Expand all cards that were open using _expandedCards
	 */
	function _expandCards() {
		$panel.find(".lists").children('.list-item').each(function(indexL) {
			var $list = $(this);
			$list.find('.card-item').each(function(indexC) {
				if (typeof _expandedCards[$(this).data('card-id')] === 'undefined') {
					$(this).children('.card-name').trigger("click");
				}
			});
		});
	}
	

	function _taskChecksAndAdmin($card,data) {
		// set checkmarks
		var dataChecklists = {};
		if ("checklists" in data) {
			$.each(data.checklists,function(checklistIndex,checklist) {
				dataChecklists[checklist.id] = [];
				$.each(checklist.checkItems,function(checkItemIndex,checkItem) {
					dataChecklists[checklist.id][checkItem.id] = checkItem.state; 
				});
			});

			$card.find('.checklist-item').each(function(indexCh) {
				var $checklist  = $(this);
				var checklistId = $checklist.data("checklist-id");
				$checklist.find('.checkItem-item').each(function(indexChI) {
					var checkitemId = $(this).data("checkitem-id");
					var itemState	= dataChecklists[checklistId][checkitemId];
					$(this).children('.task-state').prop('checked',(itemState === "complete") ? true : false);
				});
			});
		}
		
		var dataComments = {};
		if ("comments" in data) {
			$.each(data.comments,function(commentIndex,comment) {
				dataComments[comment.id] = comment;
			});

			// delete comment edit/delete if it isn't allowed
			if (data.comments && data.comments.length >= 1) {
				$card.find('.card-comment-item').each(function(indexCo) {
					var commentId 	= $(this).data("card-comment-id");
					var comment 	= dataComments[commentId];
					if (activeUserId !== comment.memberId) {
						$(this).find('.card-comment-body h5').children('.cmd-edit-comment').remove();
					}
					if (activeUserRole !== "admin" && activeUserId !== comment.memberId) {
						$(this).find('.card-comment-body h5').children('.cmd-delete-comment').remove();
					}
				});
			}
		}
	}

	/**
	 * Display an error
	 */
	function _displayError(text) {
		if (!text) return;

		var $errormsg = $('.errormsg', $panel);

		$errormsg.empty().css('top', ($panel.height() + $panel.prop('scrollTop') - 40) + 'px').html(text).animate({
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
		cache.comments = newComments;
		
		
        var compliedChangesList = null;
		trelloCommentCards = {};

        // check lists panel exist
        if ($('.tab-lists .lists', $panel).length === 0) {
            return;
        }

		if(typeof newComments === "undefined") {
			return;
		}

        // remove older comment item
        $('.list-item .code-comment-item', $panel).remove();
        // remove older file items
        $('.list-item .code-comment-file-header', $panel).remove();

        // merge comment item to trello list
        $('.list-item h5 a', $panel).each(function(index, listElem){
            var listName = $(listElem).html(),
                $listItem = $(listElem).closest('.list-item'),
                countElem = $(listElem).parent().find('.code-comment-counter'),
                nameRegexp = '\\s*' + listName.replace(/\s+/g, '\\s*') + '\\s*',
                tagRegexp = new RegExp(nameRegexp, 'i'),
                groupComments = [],
                otherComments = [],
                commentHtml = "";


            newComments.forEach(function(comment){
				if (comment.cardId()) {
					trelloCommentCards[comment.cardId()] = comment;
				} else {
					if (tagRegexp.test(comment.tag())) {
						groupComments.push(comment);
					} else {
						otherComments.push(comment);
					}
				}
            });

            newComments = otherComments;
            // render
            if (groupComments.length > 0) {
                commentHtml = Mustache.renderTemplate(partTemplates.trelloComments, {
                    files: sortByFilename(groupComments)
                });
				// are there normal cards in this list ?
				if ($(listElem).closest('.list-item').find('.cards').children().first().length > 0) {
                	$(commentHtml).insertBefore($listItem.find('.cards').children().first());
				} else {
					$listItem.find('.cards').html(commentHtml);
				}
            }
            // set comment counter
			_updateCodeCommentCounter($listItem);
        });

        // remove older Changes List.
        $('.tab-lists .lists [data-list-id="changes-list"]', $panel).remove();
        compliedChangesList = Mustache.renderTemplate(_combineTemplates(changesListTemplate), {
            count: newComments.length,
            files: sortByFilename(newComments)
        });
        $(compliedChangesList).insertBefore($('.tab-lists .lists', $panel).children().first());
		console.log($('.tab-lists .lists', $panel));
		
		function sortByFilename(comments) {
			comments = comments.sort(function (a,b) {
				if (a._filePath > b._filePath) return 1;
				return -1;
			});		
			var files 			= [];
			if (comments.length !== 0) {
				var lastFilePath 	= comments[0]._filePath;
				var commentsByFile 	= [comments[0]];
				for (var i = 1; i < comments.length; i++) {
					if (comments[i]._filePath != lastFilePath) {
						files.push({file: relativePath(lastFilePath), comments: commentsByFile});
						commentsByFile = [comments[i]];
						lastFilePath = comments[i]._filePath;
					} else {
						commentsByFile.push(comments[i]);	
					}
				}
				files.push({file: relativePath(lastFilePath), comments: commentsByFile});
			}
			return files;
		}
		
		function relativePath(path) {
			var basePath 			= ProjectManager.getProjectRoot()._path;
			var relativeFilename 	= FileUtils.getRelativeFilename(basePath,path);
			if (!relativeFilename) {
				relativeFilename = path;
			}	
			return relativeFilename;
		}
    }

	/**
	 * Push one or all comments of a special list into the remote trello list
	 * @param {Object} e click event
	 */
	function _pushComments(e) {
		e.stopPropagation();
		var $this = $(this),
			isPushAllListComments = $this.hasClass('cmd-push-comments'),
			$listItem= null,
			comments = [],
			fullPath = "",
			cursorPos = -1;
		
		
		if (isPushAllListComments) {
			$listItem = $this;
			$this.closest('.list-item').find('.code-comment-item').each(function(i,ele) {
				comments.push(_getCommentByEle(ele));
			});
		} else {
			// only one comment in a list
			$listItem = $this.closest('.list-item');
			comments.push(_getCommentByEle($this.parent('.code-comment-item')));
		}

		fullPath = DocumentManager.getCurrentDocument().file._path;
		cursorPos = EditorManager.getCurrentFullEditor().getCursorPos(true);
		Trello.getBoardMembers(_prefs.get('selected-board')).done(function(members) {
			_pushArrayToList($listItem,comments,members).done(function() {
				_jumpToFile(fullPath,cursorPos);
			});
		});
	}


	function _getCommentByEle(ele) {
		return {
			_content:  	$(ele).find('.code-comment-name').text(),
			_filePath:  $(ele).data('file-path'),
			_lineNum:  	$(ele).data('line-number'),
			_lineCh:  	$(ele).data('line-ch'),
			_endLineNum:$(ele).data('end-line-number'),
			_endLineCh: $(ele).data('end-line-ch')
		};
	}

	/**
	 * Push an array of trello comments to a list
	 * @param   {jQuery}        $listItem listItem
	 * @param   {Comment|Array} comments  array of comment objects
	 * @param   {Array}         members   array of all board members
	 * @param   {Number}        [start=0] start to push with the start-th comment
	 * @returns {Deferred}      empty resolve
	 */
	function _pushArrayToList($listItem,comments,members,start) {
		if (typeof start === "undefined") start = 0;
		var result = new $.Deferred();

		var listId 	= $listItem.data('list-id');
		var comment = _parseMembers(comments[start],members);
		var set = {name:comment._content};

		if (comment._idMembers.length > 0) {
			set.idMembers = comment._idMembers.join(',');
		}

		Trello._create('card',{list:listId},set).done(function(data) {
			// save that there is a new comment card
			trelloCommentCards[data.id] = comment;

			_pushCommentToListUI($listItem,comment,data,0);
			_attachId2Comment(comment, data.id);
			if (++start < comments.length) {
				_pushArrayToList($listItem,comments,members,start).done(function() {
					result.resolve();
				});
			} else {
				result.resolve();
			}
		});
		return result.promise();
	}

	/**
	 * Push one comment to the UI
	 * - delete the comment card and add it to the trello cards
	 * @param {jQuery} $listItem listItem
	 * @param {Object} comment   comment object that was pushed
	 * @param {Object} data      card data
	 * @param {Number} pos       the trello comment card is at position pos (needed for delete)
	 */
	function _pushCommentToListUI($listItem,comment,data,pos) {
		// delete the comment card...
		$listItem.find('.cards').children('.code-comment-item:eq('+pos+')').remove();

		// ... and add a correct card in the list
		data.taskCount = '';
		var combinedTemplate = _combineTemplates(partTemplates.lists_cards);
		$listItem.children('.cards').append(
			Mustache.renderTemplate(combinedTemplate, {cards:data})
		);
        
		// update the counters
        _updateCardCounter($listItem);
        _updateCodeCommentCounter($listItem);
	}
	
	/**
	 * add trello card ID to the comment which was pushed to trello just now.
	 * @param {Comment} comment which was pushed to trello just now.
	 * @param {String} id card Id of trello card 
	 */
	function _attachId2Comment(comment, id) {
		CommandManager.execute( Commands.FILE_OPEN, { fullPath: comment._filePath } ).done( function() {
			// Set focus on editor.
            MainViewManager.focusActivePane();
			var document = EditorManager.getCurrentFullEditor().document;
			document.replaceRange(' ['+ id +']', {
				line: 	comment._endLineNum - 1,
				ch: 	comment._endLineCh
			}, {
				line:	comment._endLineNum - 1,
				ch: 	comment._endLineCh
			} );
			CommandManager.execute(Commands.FILE_SAVE, { fullPath: comment._filePath });
		} );
	}
	
	/**
	 * change the tag of trello comment which is in file
	 * @param{comment} comment, trello comment
	 * @param{string} tagName
	 * @param{function(){}} opt_callback, called after changing tag name
	 */
	function _changeCommentTagInFile(comment, tagName, opt_callback) {
		CommandManager.execute(Commands.FILE_OPEN, {
			fullPath: comment._filePath
		}).done(function () {
			// Set focus on editor.
			MainViewManager.focusActivePane();
			var document = EditorManager.getCurrentFullEditor().document;

			var beginPos = comment._fullContent.search(new RegExp('trello', 'i')) + 'trello'.length;
			var endPos = comment._fullContent.indexOf(':');
			document.replaceRange(' ' + tagName, {
				line: comment._lineNum - 1,
				ch: comment._lineCh + beginPos
			}, {
				line: comment._lineNum - 1,
				ch: comment._lineCh + endPos
			});
			CommandManager.execute(Commands.FILE_SAVE, {
				fullPath: comment._filePath
			}).done(function () {
				if (opt_callback) {
					opt_callback();
				}
			});
		});
	}

	/**
	 * Get all members that are specified in the comment._content
	 * - add them to comment._idMembers and remove them from ._content
	 * @param   {Object} comment      comment object including ._content
	 * @param   {Array}  boardMembers array of all board members
	 * @returns {Object} comment object (including ._idMembers)
	 */
	function _parseMembers(comment,boardMembers) {
		var matches = null;
		var regex = /(?:^| )@([a-z0-9]+)/g;
		comment._idMembers = [];
		while ((matches = regex.exec(comment._content)) !== null) {
			var memberPos = boardMembers.keyIndexOf('username',matches[1]);
			if (memberPos >= 0) {
				comment._idMembers.push(boardMembers[memberPos].id);
				comment._content = comment._content.replaceRange(matches.index,matches.index+matches[0].length,"");
			}
		}
		return comment;
	}

	/**
	 * Jump to a file and set the cursor position
	 * @param {String} fullPath  path to the file
	 * @param {Object} cursorPos cursor position (.line,.ch)
	 */
	function _jumpToFile(fullPath,cursorPos) {
		CommandManager.execute( Commands.FILE_OPEN, { fullPath: fullPath } ).done( function() {
			// Set focus on editor.
			MainViewManager.focusActivePane();
			EditorManager.getCurrentFullEditor().setCursorPos(
				cursorPos.line,
				cursorPos.ch,
				true
			);
		});
	}

	/////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////// CHANGE ///////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	function _changeTaskState(cardId,checkListId,$checkItem) {
	 	Trello._change('taskstate',{card:cardId,checklist:checkListId,checkitem:$checkItem.data('checkitem-id')},
						{value:[$checkItem.is(':checked') ? true: false]});
	}

	/////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////  Mustache improvement //////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Combine templates a template can include other templates with
	 * - `{{> fileName.html}}` The file must be required with partTemplates.fileName
	 * @param   {String} template template content which can include other templates (recursive)
	 * @returns {String} combined template
	 */
	function _combineTemplates(template) {
		return template.replace(/{{> (.*?)\.html}}/g,function(match,p1) {
			return _combineTemplates(partTemplates[p1]);
		});
	}
	
	/**
	 * Render a template with Mustache.render but include the language strings
	 * @param {String}       template template
	 * @param {Array|Object} data     data to render
	 */
	Mustache.renderTemplate = function(template, data) {
		data = data || {};
		data.strings = strings;
		return Mustache.render(template,data);
	}

	/////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////     Prototypes    //////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	/**
	 * Find the position of an needle in an array of objects for a special key
	 * @param   {String} key    key which should be checked against the needle
	 * @param   {String} needle string that should be array[i][key]
	 * @returns {Number} return the positon i if needle was found otherwise -1
	 */
	Array.prototype.keyIndexOf = function(key,needle) {
		var array = this;
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] == needle) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * replace a range inside a string
	 * @param   {Number} start   start at position start
	 * @param   {Number} end     end directly before this position (end-start == length)
	 * @param   {String} replace subsitute the range with this string
	 * @returns {String} new string
	 */
	String.prototype.replaceRange = function(start,end,replace) {
		return this.substring(0,start) + replace + this.substring(end);
	}
	
	
	$.fn.extend({
	  	getClosest: function(cEleCl) {
			var $this 	= this;	
			var length 	= cEleCl.length;

			var result	= {item: [],id: [],index: []};
			for (var i = 0; i < length; i++) {
				var keyName = cEleCl[i].replace(/-/g,'_');
				result.item[keyName]   = $this.closest('.'+cEleCl[i]+'-item');
				result.id[keyName] 	   = result.item[keyName].data(cEleCl[i]+'-id');
				result.index[keyName]  = result.item[keyName].index();
			}
			return result;
	 	}
	});

	/////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////  KeyEvents  //////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////

	function handleKey($event,editor,event) {
		if (event.type === 'keydown' && (event.keyCode === KeyEvent.DOM_VK_DELETE || event.keyCode === KeyEvent.DOM_VK_BACK_SPACE)) {
			var languageId 		= editor.getLanguageForSelection().getId();
			var selectionPos 	= editor.getSelection(true);
			var selection 		= editor.document.getRange(selectionPos.start,selectionPos.end,true);
			var comments 		= ParseUtils.parseText(selection, ['idea', 'todo', 'doing', 'done'], languageId);
		}
	}



	// Toggle Panel Visibility
	function _toggleVisibility() {
		if (!isVisible && !realVisibility) {
			realVisibility = true;
			$panel = $(Mustache.renderTemplate(mainPanel)).width(_prefs.get('width'));
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

	/**
     * Add/Remove listeners when the editor changes
     * @param {object} event     Event object
     * @param {editor} newEditor Brackets editor
     * @param {editor} oldEditor Brackets editor
     */
    function updateEditorListeners(event, newEditor, oldEditor) {
        $(oldEditor).off('keyEvent', handleKey);
        $(newEditor).on('keyEvent', handleKey);
    }

	AppInit.appReady(function () {
		ExtensionUtils.loadStyleSheet(module, 'styles/styles.css');
		var viewMenu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		CommandManager.register(_ExtensionLabel, _ExtensionID, _Main);
		viewMenu.addMenuItem(_ExtensionID, _ExtensionShortcut);
		Parser.setup();
        Parser.onTrelloCommentsChange(displayTrelloComments);

		// Key Events
		$(EditorManager).on('activeEditorChange', updateEditorListeners);
		$(EditorManager.getCurrentFullEditor()).on('keyEvent', handleKey);
	});

	$icon = $('<a>').attr({
		id: 'brackets-trello-icon',
		href: '#',
		title: 'Brackets Trello'
	}).click(_Main).appendTo($('#main-toolbar .buttons'));
});

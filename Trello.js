/*global define, brackets */

define(function (require, exports, module) {
	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');


	var appKey = "bd125fe95d77b8dadf45bd6103cf5c44";
	
	/**
	 * get members of board
	 * @param   {String} boardId board id for query
	 * @returns {Deferred}     every activity
	 */
	function getBoardMembers(boardId) {
		return _get('boardMembers', {board: boardId}, {});
	}

	/**
	 * get an activity stream for a special board
	 * @param   {String}       type type of the get query (activity,lists,boards,tasks)
	 * @param   {Object}       ids  (.board,.list,.card) or some other ids for the special query
	 * @param   {Object|Array} get  defaults:
	 *                            	Activity: {since:(time-1hour)}
	 *                                   otherwise since: x means it's time-x seconds
	 *                              Lists: {cards:["none"],card_fields:["all"],fields:["open"]}
	 * @returns {Deferred}     every activity
	 */
	function _get(type,ids,get) {
		var defaultGet;
		switch (type) {
			case "activity":
				defaultGet =  {since:3600};
				break;
			case "lists":
				defaultGet =  {cards:["none"],card_fields:["all"],fields:["open"]};
				break;
			case "boards":
				defaultGet =  {filter:["open"]};
				break;
			case "tasks":
				defaultGet =  {checklists:["all"]};
				break;
			case "boardMembers":
				defaultGet = {members:["all"]};
				break;
			case "cardMembers":
				defaultGet = {members:["true"]};
				break;
			case "userRole":
				defaultGet = {memberships:["me"]};
				break;
			default:
				defaultGet = {};
				break;
		}
		get = $.extend({}, defaultGet, get);
		var optionStr = "?";
		for (var key in get) {
			if (key == "since" && get[key]) {
				optionStr += key+'='+(new Date(new Date() - 1000*get[key]).toUTCString())+'&';
			} else
			optionStr += key+'='+get[key].join(',')+'&';
		}
		var url;
		switch (type) {
			case "activity":
				url = 'https://api.trello.com/1/boards/'+ids.board+'/actions/'+optionStr;
				break;
			case "lists":
				url = 'https://api.trello.com/1/boards/'+ids.board+'/lists'+optionStr;
				break;
			case "boards":
				url = 'https://api.trello.com/1/members/me/boards'+optionStr;
				break;
			case "tasks":
				url = 'https://api.trello.com/1/cards/'+ids.card+optionStr;
				break;
			case "userRole":
				url = 'https://api.trello.com/1/boards/'+ids.board+'/'+optionStr;
				break;
			case "boardMembers":
				url = 'https://api.trello.com/1/board/'+ids.board+'/'+optionStr;
				break;
			case "cardMembers":
				url = 'https://api.trello.com/1/card/'+ids.card+'/'+optionStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');
		var result = $.Deferred();
		$.getJSON(url,
		function(data) {
			if(data) {
				// add some extras for templates
				switch (type) {
					case "lists":
						$.each(data,function(listIndex) {
							if ("cards" in data[listIndex]) {
								data[listIndex].totalCards = data[listIndex].cards.length;
								if (get.card_fields.indexOf("badges") >= 0) {
									$.each(data[listIndex].cards,function(cardIndex) {
										if (data[listIndex].cards[cardIndex].badges.checkItems > 0) {
											data[listIndex].cards[cardIndex].taskCount = data[listIndex].cards[cardIndex].badges.checkItemsChecked;
											data[listIndex].cards[cardIndex].taskCount += '/'+data[listIndex].cards[cardIndex].badges.checkItems;
										} else {
											data[listIndex].cards[cardIndex].taskCount = '';
										}
									});
								}
							}
						});
						break;
					case "tasks":
						// need to change the structure for comments
						if (get["actions"].indexOf("commentCard") >= 0) {
							data.comments = [];
							for (var t = 0; t < data.actions.length; t++) {
								if (data.actions[t].type == "commentCard") {
									newComment = {};
									newComment.id = data.actions[t].id;
									newComment.avatarHash 	= data.actions[t].memberCreator.avatarHash;
									newComment.fullName 	= data.actions[t].memberCreator.fullName;
									newComment.username 	= data.actions[t].memberCreator.username;
									newComment.memberId	= data.actions[t].memberCreator.id;
									newComment.comment 		= data.actions[t].data.text;
									data.comments.push(newComment);
								}
							}
						}
						break;
					case "cardMembers":
					case "boardMembers":
						data = data.members;
						break;
				}
				var returnObject = {};
				switch(type) {
					case "lists":
						if ("members" in get) {
							// integrate board members
							_get('userRole',ids,{}).done(function(members) {
								returnObject[type] = data;
								returnObject.memberRole = members.memberships[0]; // 0 => me
								result.resolve(returnObject);
							});
						} else {
							returnObject[type] = data;
							result.resolve(returnObject);
						}

						break;
					case "cardMembers":
					case "boardMembers":
					case "tasks":
					case "userRole":
						returnObject = data;
						result.resolve(returnObject);
						break;
					default:
						returnObject[type] = data;
						result.resolve(returnObject);
				}
			} else {
				result.reject();
			}
		});
		return result.promise();
	}

	/**
	 * Create a board,list or card
	 * @param   {String}   type 'board','list','card'
	 * @param   {Object}   ids  {.board,.list,.card}
	 * @param   {Object}   set  create a board,list,card with this properties
	 * @returns {Deferred} Deferred response or fail
	 */
	function _create(type,ids,set) {
		var result = $.Deferred();
		var setStr = '?';
		switch (type) {
			case "list":
				setStr += 'idBoard='+ids.board+'&';
				break;
			case "card":
				setStr += 'idList='+ids.list+'&';
				break;
			case "checklist":
				setStr += 'idBoard='+ids.board+'&idCard='+ids.card+'&';
				break;
		}
		for (var key in set) {
			if (type != "checklist" || key != "tasks") {
				setStr += key+'='+encodeURIComponent(set[key])+'&';
			}
		}
		var url;
		switch (type) {
			case "board":
				url = 'https://api.trello.com/1/boards/'+setStr;
				break;
			case "list":
				url = 'https://api.trello.com/1/lists/'+setStr;
				break;
			case "card":
				url = 'https://api.trello.com/1/card/'+setStr;
				break;
			case "checklist":
				url = 'https://api.trello.com/1/checklist/'+setStr;
				break;
			case "task":
				url = 'https://api.trello.com/1/checklists/'+ids.checklist+'/checkItems'+setStr;
				break;
			case "comment":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/actions/comments'+setStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');

		$.post(url,
		function(data) {
			if(data) {
				if (type == "checklist" && set.tasks) {
					checklist = {checklist:data};
					nrOfTasks = set.tasks.length;
					if (set.tasks.length > 0) {
						_createTasks([],data.id,set.tasks,0,nrOfTasks).done(function(tasks) {
							checklist.tasks = tasks;
							result.resolve(checklist);
						})
					} else {
						checklist.tasks = [];
						result.resolve(checklist);
					}
				} else {
					result.resolve(data);
				}
			} else {
				result.reject();
			}

		});
		return result.promise();
	}

	/**
	 * Create tasks inside a checklist
	 * @param   {Array}    data        empty array at beginning next step filled with the latest tasks
	 * @param   {String}   checklistID checklist id to add the tasks
	 * @param   {Array}    tasks       array of task names
	 * @param   {Number}   start       start with task no. start
	 * @param   {Number}   end         end with task no. end-1
	 * @returns {Deferred} return all trello task answers in an array
	 */
	function _createTasks(data,checklistID,tasks,start,end) {
		var result = $.Deferred();
		_create('task',{checklist:checklistID},{name:tasks[start]}).done(function (task) {
			data[start] = task;
			start++;
			if (start < end) {
				_createTasks(data,checklistID,tasks,start,end).done(function (allTasks) {
					result.resolve(allTasks);
				})
			} else {
				result.resolve(data);
			}
		}).fail(function(err) {
			result.reject();
		})
		return result.promise();
	}

	/**
	 * Change a board,list,card,task
	 * @param {String} type 'board','list','card','taskstate'
	 * @param {Object} ids  {.board,.list,.card,.checklist,.checkitem}
	 * @param {Object} set  set these properties
	 */
	function _change(type,ids,set) {
		var result = $.Deferred();
		var setStr = '?';
		for (var key in set) {
			setStr += key+'='+encodeURIComponent(set[key])+'&';
		}
		var sendType;
		switch (type) {
			case "taskstate":
				sendType = "PUT";
				break;
			default:
				sendType = "GET";
		}
		var url;
		switch (type) {
			case "taskstate":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/checklist/'+ids.checklist+'/checkItem/'+ids.checkitem+'/state'+setStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');
		$.ajax({
			url:url,
			type: sendType
		}).done(function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
		return result.promise();
	}

	/**
	 * Edit a board,list,...,task name
	 * @param   {String}   type board,list,...,task
	 * @param   {Object}   ids  board,list,card etc ids
	 * @param   {Object}   edit i.e {name:"newBoardName"}
	 * @returns {Deferred} resolve the trello api response or reject
	 */
	function _edit(type,ids,edit) {
		var result = $.Deferred();
		var editStr = '?';
		for (var key in edit) {
			editStr += key+'='+encodeURIComponent(edit[key])+'&';
		}
		var sendType;
		switch (type) {
			default:
				sendType = "PUT";
		}
		var url;
		switch (type) {
			case "board":
				url = 'https://api.trello.com/1/boards/'+ids.board+'/'+editStr;
				break;
			case "list":
				url = 'https://api.trello.com/1/lists/'+ids.list+'/'+editStr;
				break;
			case "card":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/'+editStr;
				break;
			case "checklist":
				url = 'https://api.trello.com/1/checklist/'+ids.checklist+'/'+editStr;
				break;
			case "checkitem":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/checklist/'+ids.checklist+'/checkItem/'+ids.checkitem+'/name'+editStr;
				break;
			case "comment":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/actions/'+ids.comment+'/comments/'+editStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');

		$.ajax({
			url:url,
			type: sendType
		}).done(function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
		return result.promise();
	}

	/**
	 * Delete/close/archive a board,list,card <= archive(close), checklist,checkItem <= delete
	 * @param   {String}   type board,list,card,checklist or checkItem
	 * @param   {Object}   ids  object of ids needed to delete a special board,... i.e {board:boardId}
	 * @returns {Deferred} resolve with the returned api data or reject if sth. fails
	 */
	function _delete(type,ids) {
		var result = $.Deferred();
		var sendType;
		switch (type) {
			case "board":
			case "list":
			case "card":
				sendType = "PUT";
				break;
			default:
				sendType = "DELETE";
		}
		var url;
		switch (type) {
			case "board":
				url = 'https://api.trello.com/1/boards/'+ids.board+'/closed?value=true&';
				break;
			case "list":
				url = 'https://api.trello.com/1/lists/'+ids.list+'/closed?value=true&';
				break;
			case "card":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/closed/?value=true&';
				break;
			case "checklist":
				url = 'https://api.trello.com/1/checklist/'+ids.checklist+'?';
				break;
			case "checkItem":
				url = 'https://api.trello.com/1/checklist/'+ids.checklist+'/checkItems/'+ids.checkItem+'?';
				break;
			case "cardMember":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/idMembers/'+ids.member+'?';
				break;
			case "comment":
				url = 'https://api.trello.com/1/cards/'+ids.card+'/actions/'+ids.comment+'/comments?';
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');

		$.ajax({
			url:url,
			type: sendType
		}).done(function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
		return result.promise();
	}

	/**
	 * Move a card
	 * @param   {String}   type    card (list should be supported as well)
	 * @param   {Object}   ids     object of ids needed to move i.e {card:cardId,toList:toListsId}
	 * @param   {Object}   options i.e. {pos:"bottom"}
	 * @returns {Deferred} resolve with the returned api data or reject if sth. fails
	 */
	function _move(type,ids,options) {
		var result = $.Deferred();
		var optStr = '';
		for (var key in options) {
			optStr += key+'='+encodeURIComponent(options[key])+'&';
		}
		var sendType;
		switch (type) {
			case "card":
				sendType = "PUT";
				break;
			default:
				sendType = "PUT";
		}
		var url;
		switch (type) {
			case "card":
				url = 'https://api.trello.com/1/cards/'+ids.card+'?idList='+ids.toList+'&'+optStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');

		$.ajax({
			url:url,
			type: sendType
		}).done(function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
		return result.promise();
	}
	/**
	 * Add a member to a card
	 * @param   {Array}    members array of member ids (24 char hex strings)
	 * @param   {String}   cardId  card id
	 * @returns {Deferred} resolve with the returned api data or reject if sth. fails
	 */
	function _addNewMembers(members,cardId) {
		var result = $.Deferred();
		var url = 'https://api.trello.com/1/cards/'+cardId+'/idMembers?value='+members.join(',');
		url += '&key='+appKey+'&token='+_prefs.get('apitoken');
		$.ajax({
			url:url,
			type: "PUT"
		}).done(function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
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


	function _deleteMember(username) {
		var result = $.Deferred();
		return result.resolve('Member ' + username + ' was removed from this card').promise();
	}

	function _deleteComment(commentId) {
		var result = $.Deferred();
		result.resolve("Comment was deleted!");
		return result;
	}


	function _updateComment(commentId, commentText) {
		var result = $.Deferred();
		result.resolve("Comment was updated!");
		return result;
	}

	exports.getBoardMembers = getBoardMembers;
	exports._get = _get;
	exports._create = _create;
	exports._createTasks = _createTasks;
	exports._change = _change;
	exports._edit = _edit;
	exports._delete = _delete;
	exports._move = _move;
	exports._addNewMembers			= _addNewMembers;
	exports._deleteMember			= _deleteMember;
	exports._deleteComment			= _deleteComment;
	exports._updateComment			= _updateComment;
});

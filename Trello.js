/*global define, brackets */

define(function (require, exports, module) {
	var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
	var _prefs = PreferencesManager.getExtensionPrefs('brackets-trello');

	var appKey = "bd125fe95d77b8dadf45bd6103cf5c44";

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
				}
				var returnObject = {};
				switch(type) {
					case "tasks":
						returnObject = data;
						break;
					default:
						returnObject[type] = data;
				}
				result.resolve(returnObject);
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
		var setStr = '';
		switch (type) {
			case "list":
				setStr = 'idBoard='+ids.board+'&';
				break;
			case "card":
				setStr = 'idList='+ids.list+'&';
				break;
		}
		for (var key in set) {
			setStr += key+'='+set[key]+'&';
		}
		var url;
		switch (type) {
			case "board":
				url = 'https://api.trello.com/1/boards/?'+setStr;
				break;
			case "list":
				url = 'https://api.trello.com/1/lists/?'+setStr;
				break;
			case "card":
				url = 'https://api.trello.com/1/card/?'+setStr;
				break;
			case "task":
				url = 'https://api.trello.com/1/checklists/'+ids.checklist+'/checkItems?'+setStr;
				break;
		}
		url += 'key='+appKey+'&token='+_prefs.get('apitoken');
		console.log('create '+type);
		console.log(url);
		$.post(url,
		function(data) {
			if(data) {
				result.resolve(data);
			} else {
				result.reject();
			}
		});
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
			setStr += key+'='+set[key]+'&';
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

	function _performSync(tasks) {
		var result = $.Deferred();
		result.resolve('Sync was performed');
		return result.promise();
	}

	exports._get = _get;
	exports._create = _create;
	exports._change = _change;
	exports._performSync = _performSync;
});

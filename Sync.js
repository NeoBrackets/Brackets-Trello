/*global define, brackets */

define(function (require, exports, module) {
	var Trello	= require('Trello');
	
	function init(cache,data,extraCards) {
		var result = $.Deferred();
		console.log('extraCards: ',extraCards);
		addExtraCards(data,extraCards)
		.done(function(newData) {
			data = newData;
		
			console.log('data: ',data);
			console.log('cache: ',cache);
			console.time('diff');
			var diff = difference(cache,data);
			console.log('diff: ',diff);
			console.timeEnd('diff');
			result.resolve(diff);
		});	
		return result.promise();
	}
	
	function addExtraCards(data,extraCards,start) {
		start = (typeof start === 'undefined') ? 0 : start;
		var result = $.Deferred();
		var objKeys = Object.keys(extraCards);
		var cardId = objKeys[start];
		var listId = extraCards[cardId].listId;
		Trello._get('tasks',{card: cardId},
					{
					members:[true],actions:['commentCard'],
					 member_fields:["avatarHash","username","fullName"]
					})
		.done(function(cardData) {
			for (var l = 0; l < data.lists.length; l++) {
				if (data.lists[l].id == listId) {
					for (var c = 0; c < data.lists[l].cards.length; c++) {
						if (data.lists[l].cards[c].id === cardId) {
							console.log('correct card');
							data.lists[l].cards[c] = cardData;
							break;
						}
					}
				}
			}
			if (start !== objKeys.length-1) {
				addExtraCards(data,extraCards,start+1)
			    .done(function(newData) {
					result.resolve(newData);	
				});
			} else {
				result.resolve(data);
			}
		});
		return result.promise();
	}
	
	
	/**
	 * Get the difference between the oldData and the newData
	 * @param   {Object} oldData         old data object (latest trello cache)
	 * @param   {Object} newData         new trello data
	 * @param   {String} [cObjectKey=""] object key string concat "." (sth. like lists.cards)
	 * @returns {Object} diff object
	 */
	function difference(oldData, newData, cObjectKey) {
		cObjectKey 		 = (typeof cObjectKey === "undefined") ? "" : cObjectKey;
		var ret = {};
				
		if (!Array.isArray(oldData)) {
			var isObject= true;
			var tKeys   = Object.keys(oldData);
			var oKeys   = Object.keys(newData); 
			var tLength = tKeys.length;
			var oLength = oKeys.length;
			var keys    = $.unique(tKeys.concat(oKeys));
			var length  = keys.length;
		} else {
			var isObject= false;
			var tLength = oldData.length;	
			var oLength = newData.length;	
			var length 	= tLength > oLength ? tLength : oLength;
		}		
		// using oLength to get new lists,cards,etc
		for (var k = 0; k < length; k++) {
			var name 	= !isObject ? k : keys[k];
			
			if (!isObject) { // don't add array keys to cObjectKey
				var newCObjectKey = cObjectKey;
			} else {	
				var newCObjectKey = (cObjectKey === "") ? name : cObjectKey+"."+name;
			}
			if (isRelevant(newCObjectKey)) {
				// entry exists in the oldData and the new version
				if (newData[name] && oldData[name]) {
					if ((typeof newData[name] === 'object') && !Array.isArray(newData[name])) {
						var diff = difference(oldData[name], newData[name], newCObjectKey);
						if (!$.isEmptyObject(diff)) {
							ret[name] = diff;
						}
					} else if (Array.isArray(newData[name])) {
						var diff = difference(oldData[name], newData[name], newCObjectKey);
						if (!$.isEmptyObject(diff)) {
							ret[name] = diff;
						}
					} else {
						if (oldData[name] !== newData[name]) {
							ret[name] = {
								"newV": newData[name], 	
								"oldV": oldData[name], 	
								"diffType": 'changed'
							};
						}
					}
				} else if (newData[name] && !oldData[name]) {
					ret[name] = {
								"newV": newData[name], 	
								"diffType": 'added'
							};
				} else if (!newData[name] && oldData[name]){
					ret[name] = {
								"oldV": oldData[name], 	
								"diffType": 'deleted'
							};
				}
			}
		}
		return ret;
	}
	
	/**
	 * Check if the given key concatination is relevant for the diff algorithm
	 * @param   {String}  key the concated string
	 * @returns {Boolean} true if relevant, else false
	 */
	function isRelevant(key) {
		var relevant = [
			"lists","lists.id","lists.cards","lists.cards.id","lists.cards.name","lists.cards.desc",
			"lists.cards.checklists.*","lists.cards.comments.*","lists.cards.members.*"
		];
		// check for every relevant entry if it accepts key
		for (var i = 0; i < relevant.length; i++) {
			var rel 		= relevant[i];
			var lastCharRel = rel.charAt(rel.length-1);
			if (key === rel || (lastCharRel === "*" && key.indexOf(rel.substr(0,rel.length-2)) === 0)) {
				return true;	
			}
		}
		return false;
	}
		
		
	exports.init = init;
});
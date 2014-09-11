define(function(require, exports, module) {
	
	// Board Template
	exports.board = 
		'<div class="boards">' +
			'{{#boards}}' +
			'<div class="board-item" id="{{id}}">' +
				'<h4><a href="#">{{name}}</a></h4>' +
			'</div>' +
			'{{/boards}}' +
		'</div>';

	// Lists Template
	exports.list = 
		'<h4>{{name}}</h4>' +
		'<div class="lists">' +
			'{{#lists}}' +
			'<div class="list-item" id="{{id}}">' +
				'<h5><a href="#">{{name}}</a><span>{{totalCards}}</span></h5>' +
				'<div class="card-space"></div>' +
			'</div>' +
			'{{/lists}}' +
		'</div>';

	// Card Template
	exports.card =
		'<h4>{{boardName}} / {{listName}}</h4>' +
		'<div class="cards">' +
			'{{#cards}}' +
				'<div class="card-item" id="{{id}}">' +
					'<a href="#">{{name}}</a>' +
					'<span>{{completedTasks}}/{{totalTasks}}</span>' +
				'</div>' +
			'{{/cards}}' +
		'</div>';

	// Tasks Template
	exports.task =
		'<h4>{{boardName}} / {{listName}}</h4>' +
		'<h5>{{cardName}}</h5>' +
		'<p>{{desc}}</p>' +
		'<div class="tasks">' +
			'{{#tasks}}' +
			'<div class="task-item">' +
				'<input type="checkbox" id="{{id}}">' +
				'<label for="{{id}}">{{name}}</label>' +
			'</div>' +
			'{{/tasks}}' +
		'</div>';
	
	exports.error = '<h4 class="error">{{error}}<h4>';
});
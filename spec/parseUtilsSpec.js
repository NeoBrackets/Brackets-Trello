/*global define, describe, it*/
define(['modules/parseUtils', 'modules/objects/comment'], function (parseUtils, Comment) {
    'use strict';

    function getFunctionContent(func) {
        var funcString = func.toString(),
            beginIndex = funcString.indexOf('{'),
            endIndex = funcString.lastIndexOf('}');

        return funcString.substr(beginIndex + 1, endIndex - beginIndex - 1);
    }

    var tags = ['idea', 'todo', 'doing', 'done'];

    describe('Test parseUtils', function () {

        describe('Test one line comment case in javascript file, use // to comment', function () {
            it('"//trello: it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//trello: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//  trello: it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//  trello: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//TRELlo: it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//TRELlo: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });
			
			it('"//TRELlo:it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//TRELlo:it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//trello it one trello card\\n" should not be trello comment, because it doesn\'t have :', function () {
                var comments = parseUtils.parseText('//trello it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(0);
            });

            it('html should not support // comment now', function () {
                var comments = parseUtils.parseText('//trello it one trello card\\n', tags, 'html');
                expect(comments.length).toBe(0);
            });

            it('"// trello todo: it one trello card\\n" should be a todo trello comment', function () {
                var comments = parseUtils.parseText('// trello todo: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//    trello   do ing  :it one trello card\\n" should be a do ing trello comment', function () {
                var comments = parseUtils.parseText('//    trello   do ing  :it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('do ing');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });
			
			it('"// trello todo: it one trello card [545e0eced178ed945d68bc40]" should be a todo trello comment with card ID', function () {
                var comments = parseUtils.parseText('// trello todo: it one trello card [545e0eced178ed945d68bc40]', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
				expect(comments[0].cardId()).toBe('545e0eced178ed945d68bc40');
                expect(comments[0].content()).toBe('it one trello card');
            });
			
			it('"// trello todo: it one trello card [545e0eced178ed945d68bc40] tailed" should be a todo trello comment, but can not find card ID', function () {
                var comments = parseUtils.parseText('// trello todo: it one trello card [545e0eced178ed945d68bc40] tailed', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
				expect(comments[0].cardId()).toBe(false);
                expect(comments[0].content()).toBe('it one trello card [545e0eced178ed945d68bc40] tailed');
            });


            it('"//  I am not a trello: comment" should not be trello comment', function () {
                var comments = parseUtils.parseText('//  I am not a trello: comment', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"//  trellotodo: it one trello card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('//  trellotodo: it one trello card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"//  trelloit todo: one trello card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('//  trelloit todo: one trello card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"// todo it one trello: card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('// todo it one trello: card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

        });


        describe('Test multiple line comment case, use // to comment', function () {
            var testFunc = function () {
                // trello: test multiple line.
                // I am not a trello comment
                //  trello TODO: i am a todo trello comment
                var test = 0;
            };

            it(getFunctionContent(testFunc) + ' should contains 2 trello comments.', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'javascript');
                expect(comments.length).toBe(2);
                expect(comments[0].lineNumber()).toBe(17);
                expect(comments[0].content()).toBe('test multiple line.');
                expect(comments[1].lineNumber()).toBe(109);
                expect(comments[1].content()).toBe('i am a todo trello comment');
            });

        });
		
		describe('Test one line comment case, use /**/ to comment', function () {
			it(' /*trello : this is not a trello comment now */ should not be a trello comment. because we don\'t support /** comment now', function () {
                var comments = parseUtils.parseText('/*trello : this is not a trello comment now */', tags, 'javascript');
                expect(comments.length).toBe(0);
            });
		});

//        describe('Test one line comment case, use /**/ to comment', function () {
//            it(' /*trello this is a trello comment */ should be a trello comment.', function () {
//                var comments = parseUtils.parseText('/*trello this is a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(1);
//                expect(comments[0].lineNumber()).toBe(0);
//                expect(comments[0].tag()).toBe('');
//                expect(comments[0].content()).toBe('this is a trello comment ');
//            });
//
//            it(' /* trello: this is a trello comment */ should be a trello comment.', function () {
//                var comments = parseUtils.parseText('/* trello: this is a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(1);
//                expect(comments[0].lineNumber()).toBe(0);
//                expect(comments[0].tag()).toBe('');
//                expect(comments[0].content()).toBe('this is a trello comment ');
//            });
//
//            it(' /* todo trello this is a trello comment */ should be a todo trello comment.', function () {
//                var comments = parseUtils.parseText('/* todo trello this is a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(1);
//                expect(comments[0].tag()).toBe('todo');
//                expect(comments[0].lineNumber()).toBe(0);
//                expect(comments[0].content()).toBe('this is a trello comment ');
//            });
//
//            it(' /*doing trello: this is a trello comment */ should be a todo trello comment.', function () {
//                var comments = parseUtils.parseText('/*doing trello: this is a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(1);
//                expect(comments[0].tag()).toBe('doing');
//                expect(comments[0].lineNumber()).toBe(0);
//                expect(comments[0].content()).toBe('this is a trello comment ');
//            });
//
//            it(' /* todotrello this is not a trello comment */ should not be a trello comment.', function () {
//                var comments = parseUtils.parseText('/* todotrello this is not a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(0);
//            });
//
//            it(' /*trellothis is not a trello comment */ should be a trello comment.', function () {
//                var comments = parseUtils.parseText('/*trellothis is not a trello comment */', tags, 'javascript');
//                expect(comments.length).toBe(0);
//            });
//
//        });

//        describe('Test multiple line comment case, use /**/ to comment', function () {
//            var testFunc = function () {
//                /* todo trello I am the first trello comment.
//                 * trello: I am the second trello comment.// 545e0eced178ed945d68bc40  trello i am third a trello comment.
//                 // trello I am the fouth trello comment.
//                 * todoTrello I am not a trello comment.
//                 * Trelloit I'm not a trello comment.
//                 *      trello I am the fiveth trello comment.
//                */
//                // I am not a trello comment
//                // TODO trello I am the sixth trello comment.
//                var test = 0;
//            };
//
//            it(getFunctionContent(testFunc) + ' should contains 5 trello comments.', function () {
//                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'javascript');
//                expect(comments.length).toBe(6);
//                expect(comments[0].content()).toBe('I am the first trello comment.');
//                expect(comments[0].tag()).toBe('todo');
//                expect(comments[1].content()).toBe('I am the second trello comment.// 545e0eced178ed945d68bc40  trello i am third a trello comment.');
//                expect(comments[2].content()).toBe('i am third a trello comment.');
//                expect(comments[2].tag()).toBe('');
//                expect(comments[3].content()).toBe('I am the fouth trello comment.');
//                expect(comments[4].content()).toBe('I am the fiveth trello comment.');
//                expect(comments[5].content()).toBe('I am the sixth trello comment.');
//                expect(comments[5].tag()).toBe('TODO');
//            });
//        });

        describe('Test sorting comments', function () {

            function createTestComments(lineNumberArray) {
                var comments = [],
                    comment = null;

                lineNumberArray.forEach(function (num) {
                    comment = new Comment();
                    comment.lineNumber(num);
                    comment.filePath('filePath');
                    comment.content('content');
                    comments.push(comment);
                });

                return comments;
            }

            it('1, 2, 3 should be ordered in ascending order after sort', function () {
                var comments = createTestComments([1, 2, 3]),
                    index = 0,
                    len = 0;

                comments = parseUtils.sortAndFilterSameComments(comments);
                expect(comments.length).toBe(3);
                for (index = 1, len = comments.length; index < len; index++) {
                    expect(comments[index].lineNumber() > comments[index - 1].lineNumber()).toBe(true);
                }
            });

            it('3, 2, 1 should be ordered in ascending order after sort', function () {
                var comments = createTestComments([3, 2, 1]),
                    index = 0,
                    len = 0;

                comments = parseUtils.sortAndFilterSameComments(comments);
                expect(comments.length).toBe(3);
                for (index = 1, len = comments.length; index < len; index++) {
                    expect(comments[index].lineNumber() > comments[index - 1].lineNumber()).toBe(true);
                }
            });

            it('3, 1, 2, 3, 4, 2, 4, 5, 7, 10, 12, 23, 11, 14 should be ordered in ascending order after sort', function () {
                var comments = createTestComments([3, 1, 2, 3, 4, 2, 4, 5, 7, 10, 12, 23, 11, 14]),
                    index = 0,
                    len = 0;

                comments = parseUtils.sortAndFilterSameComments(comments);
                expect(comments.length).toBe(11);
                for (index = 1, len = comments.length; index < len; index++) {
                    expect(comments[index].lineNumber() > comments[index - 1].lineNumber()).toBe(true);
                }
            });
        });
        
        describe('Test one line html comment case, use <!-- --> to comment', function () {
            it(' <!-- trello: this is a trello comment of html --> should be a trello comment of html file.', function () {
                var comments = parseUtils.parseText('<!-- trello: this is a trello comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment of html');
            });
			
			it(' <!--      trello   todo   : this is a trello comment of html --> should be a todo trello comment of html file.', function () {
                var comments = parseUtils.parseText('<!--     trello   todo   : this is a trello comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('this is a trello comment of html');
            });
			
			it(' <!--trello do ing: this is a trello comment of html --> should be a do ing trello comment of html file.', function () {
                var comments = parseUtils.parseText('<!--trello do ing: this is a trello comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('do ing');
                expect(comments[0].content()).toBe('this is a trello comment of html');
            });
			
			it(' <!--trello done: this is a trello comment of html [545e0eced178ed945d68bc40] --> should be a do ing trello comment with card ID of html file.', function () {
                var comments = parseUtils.parseText('<!--trello done: this is a trello comment of html [545e0eced178ed945d68bc40] -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('done');
				expect(comments[0].cardId()).toBe('545e0eced178ed945d68bc40');
                expect(comments[0].content()).toBe('this is a trello comment of html');
            });
			
			it(' <!--trello done: this is a trello comment of html [545e0eced178ed945d68bc40] tailed --> should be a do ing trello comment html file, but can not find the card ID.', function () {
                var comments = parseUtils.parseText('<!--trello done: this is a trello comment of html [545e0eced178ed945d68bc40] tailed -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('done');
				expect(comments[0].cardId()).toBe(false);
                expect(comments[0].content()).toBe('this is a trello comment of html [545e0eced178ed945d68bc40] tailed');
            });

            it(' padding <!-- trello todo: this is a trello todo comment with padding before comment of html --> pading should be a todo trello comment of html file.', function () {
                var comments = parseUtils.parseText(' padding <!-- trello todo: this is a trello todo comment with padding before comment of html --> pading', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(9);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('this is a trello todo comment with padding before comment of html');
            });
			
			it(' <!--trellodo ing: this is not a trello comment of html --> should not be a trello comment of html file.', function () {
                var comments = parseUtils.parseText(' <!--trellodo ing: this is not a trello comment of html -->', tags, 'html');
                expect(comments.length).toBe(0);
            });
			
        });
		
		describe('Test multiple line html comment case, use <!-- --> to comment', function () {
            
            var testFunc = function () {
                /* 
                 <!--
                  trello todo: 
                  	this is a todo trello comment in html file
                 -->
                  */
                var test = 0;
            };
            
            it(getFunctionContent(testFunc) + ' should be a trello todo comment. ', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'html');
                expect(comments.length).toBe(1);
				expect(comments[0].lineNumber()).toBe(38);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('this is a todo trello comment in html file');
            });
        });
        
        describe('Test one line php comment case, use // to comment', function () {
            
            var testFunc = function () {
                /* 
                 <?php
                  // trello: this is a trello comment in php file
				  // trello this is not a trello comment in php file. Because it doesn't have colon 
                  //  trello todo: this is a trello todo comment in php file
				  //trello do ing : this is a trello do ing comment in php file
				  // trellodo ing: this is not a trello comment in php file.Because it doesn't have a signle trello at begin
				  // this is not a trello: comment in php file. Because the world trello is not at the begin.
				  # trello : this is a trello comment in php file
				  # trello to do: this is a trello comment in php [545e0eced178ed945d68bc40] file
				  // trello done: this is a trello done comment [545e0eced178ed945d68bc40]
				  # trello other: this is a trello other comment [545e0eced178ed945d68bc40]
                 ?>
                  */
                var test = 0;
            };
            
            it(getFunctionContent(testFunc) + ' should have 5 trello comment.', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'php');
                expect(comments.length).toBe(7);
                expect(comments[0].lineNumber()).toBe(62);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment in php file');
				
                expect(comments[1].lineNumber()).toBe(217);
                expect(comments[1].tag()).toBe('todo');
                expect(comments[1].content()).toBe('this is a trello todo comment in php file');
				
				expect(comments[2].lineNumber()).toBe(282);
                expect(comments[2].tag()).toBe('do ing');
                expect(comments[2].content()).toBe('this is a trello do ing comment in php file');
				
				expect(comments[3].lineNumber()).toBe(561);
                expect(comments[3].tag()).toBe('');
                expect(comments[3].content()).toBe('this is a trello comment in php file');
				
				expect(comments[4].lineNumber()).toBe(615);
                expect(comments[4].tag()).toBe('to do');
				expect(comments[4].cardId()).toBe(false);
                expect(comments[4].content()).toBe('this is a trello comment in php [545e0eced178ed945d68bc40] file');
				
				expect(comments[5].lineNumber()).toBe(701);
                expect(comments[5].tag()).toBe('done');
				expect(comments[5].cardId()).toBe('545e0eced178ed945d68bc40');
                expect(comments[5].content()).toBe('this is a trello done comment');
				
				expect(comments[6].lineNumber()).toBe(780);
                expect(comments[6].tag()).toBe('other');
				expect(comments[6].cardId()).toBe('545e0eced178ed945d68bc40');
                expect(comments[6].content()).toBe('this is a trello other comment');
				
            });
        });


    });


});

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

        describe('Test one line comment case, use // to comment', function () {
            it('"//trello it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//trello it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//  trello it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//  trello it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//TRELlo it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//TRELlo it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//trello: it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//trello: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"// trello: it one trello card\\n" should be trello comment', function () {
                var comments = parseUtils.parseText('//trello: it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('html should not support now', function () {
                var comments = parseUtils.parseText('//trello it one trello card\\n', tags, 'html');
                expect(comments.length).toBe(0);
            });

            it('"//   trello it one trello card" should be trello comment', function () {
                var comments = parseUtils.parseText('//   trello it one trello card', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('it one trello card');
            });

            it('"//todo trello it one trello card\\n" should be a todo trello comment', function () {
                var comments = parseUtils.parseText('//todo trello it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//  doing trello it one trello card\\n" should be a doing trello comment', function () {
                var comments = parseUtils.parseText('//  doing trello it one trello card\\n', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('doing');
                expect(comments[0].content()).toBe('it one trello card\\n');
            });

            it('"//  I am not a trello comment" should not be trello comment', function () {
                var comments = parseUtils.parseText('//  I am not a trello comment', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"//  todotrello it one trello card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('//  todotrello it one trello card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"// todo trelloit one trello card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('// todo trelloit one trello card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

            it('"// todo it one trello card\\n" should not be trello comment', function () {
                var comments = parseUtils.parseText('// todo it one trello card\\n', 'javascript');
                expect(comments.length).toBe(0);
            });

        });


        describe('Test multiple line comment case, use // to comment', function () {
            var testFunc = function () {
                // trello: test multiple line.
                // trello it will be parsed on second line
                // I am not a trello comment
                // TODO trello i am a todo trello comment
                var test = 0;
            };

            it(getFunctionContent(testFunc) + ' should contains 3 trello comments.', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'javascript');
                expect(comments.length).toBe(3);
                expect(comments[0].lineNumber()).toBe(18);
                expect(comments[0].content()).toBe('test multiple line.');
                expect(comments[1].lineNumber()).toBe(66);
                expect(comments[1].content()).toBe('it will be parsed on second line');
                expect(comments[2].lineNumber()).toBe(172);
                expect(comments[2].content()).toBe('i am a todo trello comment');
            });

        });

        describe('Test one line comment case, use /**/ to comment', function () {
            it(' /*trello this is a trello comment */ should be a trello comment.', function () {
                var comments = parseUtils.parseText('/*trello this is a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment ');
            });

            it(' /* trello: this is a trello comment */ should be a trello comment.', function () {
                var comments = parseUtils.parseText('/* trello: this is a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment ');
            });

            it(' /* todo trello this is a trello comment */ should be a todo trello comment.', function () {
                var comments = parseUtils.parseText('/* todo trello this is a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].content()).toBe('this is a trello comment ');
            });

            it(' /*doing trello: this is a trello comment */ should be a todo trello comment.', function () {
                var comments = parseUtils.parseText('/*doing trello: this is a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(1);
                expect(comments[0].tag()).toBe('doing');
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].content()).toBe('this is a trello comment ');
            });

            it(' /* todotrello this is not a trello comment */ should not be a trello comment.', function () {
                var comments = parseUtils.parseText('/* todotrello this is not a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(0);
            });

            it(' /*trellothis is not a trello comment */ should be a trello comment.', function () {
                var comments = parseUtils.parseText('/*trellothis is not a trello comment */', tags, 'javascript');
                expect(comments.length).toBe(0);
            });

        });

        describe('Test multiple line comment case, use /**/ to comment', function () {
            var testFunc = function () {
                /* todo trello I am the first trello comment.
                 * trello: I am the second trello comment.// 545e0eced178ed945d68bc40  trello i am third a trello comment.
                 // trello I am the fouth trello comment.
                 * todoTrello I am not a trello comment.
                 * Trelloit I'm not a trello comment.
                 *      trello I am the fiveth trello comment.
                */
                // I am not a trello comment
                // TODO trello I am the sixth trello comment.
                var test = 0;
            };

            it(getFunctionContent(testFunc) + ' should contains 5 trello comments.', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'javascript');
                expect(comments.length).toBe(6);
                expect(comments[0].content()).toBe('I am the first trello comment.');
                expect(comments[0].tag()).toBe('todo');
                expect(comments[1].content()).toBe('I am the second trello comment.// 545e0eced178ed945d68bc40  trello i am third a trello comment.');
                expect(comments[2].content()).toBe('i am third a trello comment.');
                expect(comments[2].tag()).toBe('');
                expect(comments[3].content()).toBe('I am the fouth trello comment.');
                expect(comments[4].content()).toBe('I am the fiveth trello comment.');
                expect(comments[5].content()).toBe('I am the sixth trello comment.');
                expect(comments[5].tag()).toBe('TODO');
            });
        });

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
            it(' <!-- trello this is a trello comment of html --> should be a trello comment of html file.', function () {
                var comments = parseUtils.parseText('<!-- trello this is a trello comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment of html ');
            });
            
            it(' <!-- todo trello this is a trello todo comment of html --> should be a trello comment of html file.', function () {
                var comments = parseUtils.parseText('<!-- todo trello this is a trello todo comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(0);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('this is a trello todo comment of html ');
            });
            
            it(' padding <!-- todo trello this is a trello todo comment with padding before comment of html --> should be a trello comment of html file.', function () {
                var comments = parseUtils.parseText(' padding <!-- todo trello this is a trello todo comment with padding before comment of html -->', tags, 'html');
                expect(comments.length).toBe(1);
                expect(comments[0].lineNumber()).toBe(9);
                expect(comments[0].tag()).toBe('todo');
                expect(comments[0].content()).toBe('this is a trello todo comment with padding before comment of html ');
            });
        });
        
        describe('Test one line php comment case, use // to comment', function () {
            
            var testFunc = function () {
                /* 
                 <?php
                  // trello this is a trello comment in php file
                  // todo trello this is a todo trello comment in php file
                 ?>
                  */
                var test = 0;
            };
            
            it(getFunctionContent(testFunc) + ' should have 2 trello comment.', function () {
                var comments = parseUtils.parseText(getFunctionContent(testFunc), tags, 'php');
                expect(comments.length).toBe(2);
                expect(comments[0].lineNumber()).toBe(65);
                expect(comments[0].tag()).toBe('');
                expect(comments[0].content()).toBe('this is a trello comment in php file');
                expect(comments[1].lineNumber()).toBe(131);
                expect(comments[1].tag()).toBe('todo');
                expect(comments[1].content()).toBe('this is a todo trello comment in php file');
            });
        });


    });


});

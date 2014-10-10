/*global module, require */
module.exports = function (grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        jasmine: {
            src: ['modules/parseUtils.js', 'modules/objects/comment.js'],
            options : {
                keepRunner: true,
                specs : ['spec/*.js'],
                template: require('grunt-template-jasmine-requirejs')
            }
        },

        jshint: {
            all: ['Gruntfile.js', 'modules/*.js', 'modules/**/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('test', ['jshint','jasmine']);
    grunt.registerTask('default', ['test']);
};

module.exports = function(grunt) {
    grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      concat:{
        dist:{
            src:['src/*.js'],
            dest: 'document-eden/document-eden.js'
        }
      },
      uglify:{
        my_target:{
            files:{
                'document-eden/document-eden.min.js': ['src/*.js']
            }
        }
      }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['concat']);
  
  };
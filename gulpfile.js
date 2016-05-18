var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');

// Change this to the location you would like to deploy to.
var copyDir = 'destination dir';

gulp.task('default', function() {
  gulp.src(['src/index.js'])
      .pipe(browserify({
        insertGlobals : false
      }))
      .pipe(rename('oncogrid.js'))
      .pipe(minify({
        ext: {
          src: '-debug.js',
          min: '.min.js'
        },
        exclude: ['tasks']
      }))
      .pipe(gulp.dest('dist'));
});

gulp.task('lint', function() {
  gulp.src(['src/*'])
      .pipe(jshint({
        predef: ["d3"]
      }))
      .pipe(jshint.reporter('default'));
});

gulp.task('copy', function () {
  gulp.src('dist/oncogrid-debug.js').pipe(gulp.dest(copyDir));
});
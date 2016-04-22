var gulp = require('gulp');
var minify = require('gulp-minify');

gulp.task('default', function() {
  gulp.src('src/*.js')
      .pipe(minify({
        ext: {
          src: '-debug.js',
          min: '.min.js'
        },
        exclude: ['tasks'],
      }))
      .pipe(gulp.dest('dist'));
});
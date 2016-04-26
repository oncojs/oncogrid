var gulp = require('gulp');
var concat = require('gulp-concat');
var minify = require('gulp-minify');

// Change this to the location you would like to deploy to.
var portalOncoDir = '/Users/dandric/Documents/workspace/dcc-portal/dcc-portal-ui/app/scripts/oncogrid/js';

gulp.task('default', function() {
  gulp.src(['src/oncogrid.js', 'src/core.js', 'src/score.js', 'src/render.js'])
      .pipe(concat('oncogrid.js'))
      .pipe(minify({
        ext: {
          src: '-debug.js',
          min: '.min.js'
        },
        exclude: ['tasks']
      }))
      .pipe(gulp.dest('dist'));
});

gulp.task('copy', function () {
  gulp.src('dist/oncogrid-debug.js').pipe(gulp.dest(portalOncoDir));
});
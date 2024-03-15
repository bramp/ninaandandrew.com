const fileinclude = require('gulp-file-include');
const gulp = require('gulp');

function invite(cb) {
  gulp.src('invite/invite*.html')
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(gulp.dest('./www'));

  gulp.src('invite/email*.html')
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(gulp.dest('./www/invite'));

  cb();
}

exports.invite = invite;
exports.default = invite;

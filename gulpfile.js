const fileinclude = require('gulp-file-include');
const gulp = require('gulp');

function invite(cb) {
  gulp.src('invite/*.html')
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(gulp.dest('./www'));

  cb();
}

exports.invite = invite;
exports.default = invite;

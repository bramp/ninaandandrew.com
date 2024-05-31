const {parallel, src, dest, watch} = require('gulp');
const fileinclude = require('gulp-file-include');

/// Make the invite htmls
function invite(cb) {
  parallel(
    // 1. Compile the invite htmls
    () => src('invite/invite*.html')
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(dest('./www')),

    // 2. Compile the invite email htmls
    () => src('invite/email*.html')
        .pipe(fileinclude({
          prefix: '@@',
          basepath: '@file'
        }))
        .pipe(dest('./www/invite')),
  );

  cb();
}

function simpleScrollspyJs() {
  return src('node_modules/simple-scrollspy/demo/dist/simple-scrollspy.min.js')
    .pipe(dest('./www/js/'));
}

function splidejsSplideJs() {
  return src([
      'node_modules/@splidejs/splide/dist/js/splide.min.js',
      'node_modules/@splidejs/splide-extension-url-hash/dist/js/splide-extension-url-hash.min.js'
    ])
    .pipe(dest('./www/js/'));
}

function splidejsSplideCss() {
  return src('node_modules/@splidejs/splide/dist/css/splide.min.css')
    .pipe(dest('./www/css/'));
}

function static() {
  return src('src/static/')
    .pipe(dest('./www/'));
}


/// Copy required javascript
const js = parallel(
  simpleScrollspyJs,
  splidejsSplideJs,
);

const css = parallel(
  splidejsSplideCss,
);

function _watch(cb) {
  watch('src/static', static);
  watch('node_modules', parallel(js, css));

  cb();
};


exports.watch = _watch;

exports.js = js;
exports.css = css;
exports.static = static;
exports.invite = invite;

exports.default = parallel(js, css, static, invite);



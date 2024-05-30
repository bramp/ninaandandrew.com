const {parallel, src, dest} = require('gulp');
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


/// Copy required javascript
const js = parallel(
  simpleScrollspyJs,
  splidejsSplideJs,
);

const css = parallel(
  splidejsSplideCss,
);


exports.js = js;
exports.css = css;
exports.invite = invite;
exports.default = parallel(js, css, invite);

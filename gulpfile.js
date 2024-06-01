import {src, dest, parallel, watch} from 'gulp';
import template from 'gulp-template';
import fileinclude from 'gulp-file-include';
import {deleteAsync} from 'del';

const DEST = 'www';

/// Make the invite htmls
export const invite = parallel(
  // 1. Compile the invite htmls
  () => src('src/invite/invite*.html')
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(dest(DEST)),

  // 2. Compile the invite email htmls
  () => src('src/invite/email*.html')
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(dest(DEST + '/invite')),
);


export function engagement() {
  return src('src/engagement/slide.template.html')
    .pipe(template({name: 'Sindre'}))
    .pipe(dest(DEST));
}

export function fonts(cb) {
  return src([
    'src/www/**/*.ttf',
    'src/www/**/*.woff',
    'src/www/**/*.woff2',
  ], {encoding: false})
    .pipe(dest(DEST));
}

export function other(cb) {
  src([
    'src/www/site.webmanifest',
    'src/www/CNAME',
  ])
    .pipe(dest(DEST));

  src([
    'src/www/favicon.ico',
  ], {encoding: false})
    .pipe(dest(DEST));

  src([
    'src/www/.well-known/assetlinks.json',
  ])
    .pipe(dest(DEST + '/.well-known/'));

    cb();
}

export function scripts() {
  return src('src/www/**/*.js')
    .pipe(dest(DEST));
}

export function imagesSvg() {
  return src('src/www/**/*.svg')
    .pipe(dest(DEST));
}

export function images() {
  return src(['src/www/**/*.png', 'src/www/**/*.jpg', 'src/www/**/*.webp'], {
    encoding: false,
  })
    //.pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
    //.pipe(livereload(server))
    .pipe(dest(DEST));
}

export function styles() {
  return src('src/www/**/*.css')
    .pipe(dest(DEST));
}

export function html() {
  return src('src/www/**/*.html')
    .pipe(dest(DEST));
}

export const www = parallel(other, images, imagesSvg, styles, scripts, fonts, html);

export function deps(cb) {
  src([
      // Scrollspy
      'node_modules/simple-scrollspy/demo/dist/simple-scrollspy.min.js',

      // Splide
      'node_modules/@splidejs/splide/dist/js/splide.min.js',
      'node_modules/@splidejs/splide-extension-url-hash/dist/js/splide-extension-url-hash.min.js',
    ])
    .pipe(dest(DEST + '/js/'));

  src('node_modules/@splidejs/splide/dist/css/splide.min.css')
    .pipe(dest(DEST + '/css/'));

  cb();
}

function watchFiles(cb) {
  watch('node_modules', deps);
  watch('src/www', www );
  watch('src/invite', invite);
  watch('src/engagement', engagement);

  cb();
};
export { watchFiles as watch };

export const clean = () => deleteAsync([ DEST ]);

export default parallel(deps, www, invite, engagement);



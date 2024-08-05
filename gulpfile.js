"use strict";

import browserSync from 'browser-sync';
import fileinclude from 'gulp-file-include';
import fs from 'fs';
import sizeOf from 'image-size'
import template from 'gulp-template';
import {deleteAsync} from 'del';
import {globSync} from 'glob';
import {src, dest, parallel, series, watch} from 'gulp';


const DEST = 'www';

/// Make the invite htmls
export const invite = parallel(
  // 1. Compile the fallback invite htmls
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

  // 3. Compile the reminder email htmls
  () => src('src/invite/reminder*.html')
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(dest(DEST + '/invite')),

  // 4. Compile the reminder email htmls
  () => src('src/invite/final-reminder*.html')
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(dest(DEST + '/invite')),
);

function basename(filename) {
  // Strip the ext
  filename = filename.substr(0, filename.lastIndexOf('.') );

  // Strip the 2x
  if (filename.lastIndexOf('_2x') > 0) {
    filename = filename.substr(0, filename.lastIndexOf('_2x') );
  }

  // Strip the path
  return filename.split('/').reverse()[0];
}

// Returns a list of engagement photo slides.
function slides() {
  const files = {};

  for (const slide of globSync('src/www/engagement/*.{jpg,webp}')) {
    const d = sizeOf(slide);
    const base = basename(slide);

    if (base in files) {
      files[base].width = Math.min(files[base].width, d.width);
    } else {
      files[base] = {
        base: base,
        width: d.width,
      }
    }
  }

  // Ensure each is unique
  const slides = [...Object.values(files)];
  slides.sort((a, b) => a.base.localeCompare(b.base)); 

  return slides;
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
    .pipe(dest(DEST));
}

export function styles() {
  return src('src/www/**/*.css')
    .pipe(dest(DEST));
}

export function html() {
  return src('src/www/**/*.html')
    .pipe(template({
      slides: slides(),
    }))
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

const bs = browserSync.create();

const watchFiles = series(
  parallel(deps, www, invite), 
  function (cb) {
    bs.init({
        open: false,
        server: {
            baseDir: "www"
        }
    });

    watch('node_modules', deps).on("change", bs.reload);
    watch('src/www', www).on("change", bs.reload);
    watch('src/invite', invite).on("change", bs.reload);

    cb();
  },
);

export { watchFiles as watch };

export const clean = () => deleteAsync([ DEST ]);

export default parallel(deps, www, invite);



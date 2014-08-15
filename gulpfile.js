
var path = require('path');

var gulp = require('gulp');

var rename = require('gulp-rename');
//var concat = require('gulp-concat');

var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');

var less = require('gulp-less');
var rewriteCSS = require('gulp-rewrite-css');
var cssmin = require('gulp-cssmin');

gulp.task('scripts', function() {
    gulp.src(['scripts/app.js'])
        .pipe(browserify({
            insertGlobals: false,
            detectGlobals: false,
            debug: !gulp.env.production
        }))
        .pipe(rename('all.js'))
        .pipe(gulp.dest('build/scripts'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('build/scripts'));
});

gulp.task('styles', function() {
    gulp.src(['styles/app.less'])
        .pipe(less({ paths: [path.join(__dirname, 'styles')] }))
        .pipe(rewriteCSS({ destination: 'build/styles' }))
        .pipe(rename('all.css'))
        .pipe(gulp.dest('build/styles'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(cssmin())
        .pipe(gulp.dest('build/styles'));
});

gulp.task('watch', function() {
    gulp.watch('scripts/**/*.js', ['scripts']);
    gulp.watch(['styles/**/*.css', 'styles/**/*.less'], ['styles']);
});

gulp.task('default', ['watch', 'scripts', 'styles']);

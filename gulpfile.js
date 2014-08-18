
var path = require('path');

var gulp = require('gulp');

var rename = require('gulp-rename');
//var concat = require('gulp-concat');

var browserify = require('gulp-browserify');
var browserifyHandlebars = require('browserify-handlebars');
var uglify = require('gulp-uglify');

var less = require('gulp-less');
var rewriteCSS = require('gulp-rewrite-css');
var cssmin = require('gulp-cssmin');

gulp.task('scripts', function() {
    gulp.src(['MaterialsApp/MaterialsApp.js'])
        .pipe(browserify({
            transform: [browserifyHandlebars],
            insertGlobals: false,
            detectGlobals: false,
            debug: !gulp.env.production
        }))
        .pipe(rename('all.js'))
        .pipe(gulp.dest('build/MaterialsApp'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('build/MaterialsApp'));
});

gulp.task('styles', function() {
    gulp.src(['MaterialsApp/MaterialsApp.less'])
        .pipe(less({ paths: [path.join(__dirname, 'MaterialsApp')] }))
        .pipe(rewriteCSS({ destination: 'build/MaterialsApp' }))
        .pipe(rename('all.css'))
        .pipe(gulp.dest('build/MaterialsApp'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(cssmin())
        .pipe(gulp.dest('build/MaterialsApp'));
});

gulp.task('watch', function() {
    gulp.watch('scripts/**/*.js', ['scripts']);
    gulp.watch(['styles/**/*.css', 'styles/**/*.less'], ['styles']);
    gulp.watch(['MaterialsApp/**/*.js', 'MaterialsApp/**/*.css', 'MaterialsApp/**/*.less'], ['scripts', 'styles']);
});

gulp.task('default', ['watch', 'scripts', 'styles']);

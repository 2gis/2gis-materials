
var path = require('path');

var gulp = require('gulp');
var es = require('event-stream');
var concat = require('gulp-concat');
var rename = require('gulp-rename');

var browserify = require('gulp-browserify');
var browserifyHandlebars = require('browserify-handlebars');
var uglify = require('gulp-uglify');

var less = require('gulp-less');
var rewriteCSS = require('gulp-rewrite-css');
var prefix = require('gulp-autoprefixer');
var csso = require('gulp-csso');

var connect = require('gulp-connect');

gulp.task('scripts', function() {
    es.concat(
        gulp.src(['scripts/Rift/shim.js']),
        gulp.src(['MaterialsApp/MaterialsApp.js'])
            .pipe(browserify({
                transform: [browserifyHandlebars],
                insertGlobals: false,
                detectGlobals: false,
                debug: !gulp.env.production
            }))
    )
        .pipe(concat('MaterialsApp.js'))
        .pipe(gulp.dest('public'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public'));

    gulp.src([
        'node_modules/heatmap.js/build/heatmap.js',
        'node_modules/heatmap.js/plugins/leaflet-heatmap.js'
    ])
        .pipe(concat('heatmap.js'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public'));
});

gulp.task('styles', function() {
    gulp.src(['MaterialsApp/MaterialsApp.less'])
        .pipe(less({ paths: [path.join(__dirname, 'MaterialsApp')] }))
        .pipe(rewriteCSS({ destination: 'public' }))
        .pipe(prefix('last 1 version', '> 1%'))
        .pipe(rename('MaterialsApp.css'))
        .pipe(gulp.dest('public'))
        .pipe(csso())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public'));
});

gulp.task('watch', function() {
    gulp.watch(['scripts/**/*.js'], ['scripts']);
    gulp.watch(['styles/**/*.css', 'styles/**/*.less'], ['styles']);
    gulp.watch(['MaterialsApp/**/*.js', 'MaterialsApp/**/*.hbs'], ['scripts']);
    gulp.watch(['MaterialsApp/**/*.css', 'MaterialsApp/**/*.less'], ['styles']);
});

gulp.task('connect', function() {
    connect.server();
});

gulp.task('dev', ['watch', 'scripts', 'styles', 'connect']);
gulp.task('default', ['scripts', 'styles']);

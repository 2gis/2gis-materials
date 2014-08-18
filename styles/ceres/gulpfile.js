
var path = require('path');

var gulp = require('gulp');
var concat = require('gulp-concat');
var less = require('gulp-less');

gulp.task('styles', function() {
    gulp.src([
        'base.less',
        'button.less',
        'checkbox.less'
    ])
        .pipe(less({ paths: [path.join(__dirname, 'styles/ceres')] }))
        .pipe(concat('ceres.css'))
        .pipe(gulp.dest('build'));
});

gulp.task('default', ['styles']);

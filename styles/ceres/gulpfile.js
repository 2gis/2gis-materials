
var path = require('path');

var gulp = require('gulp');
var less = require('gulp-less');
var concat = require('gulp-concat');

gulp.task('styles', function() {
    gulp.src([
        'base.less',
        'button.less',
        'checkbox.less'
    ])
        .pipe(less({ paths: [path.join(__dirname, 'styles')] }))
        .pipe(concat('ceres.css'))
        .pipe(gulp.dest('build'));
});

gulp.task('default', ['styles']);

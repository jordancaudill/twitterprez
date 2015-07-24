/**
 * Created by Jordan on 7/11/2015.
 */
var gulp = require('gulp');
var server = require('gulp-express');

gulp.task('default', function() {
    // place code for your default task here
    server.run(['server.js']);

    var watcher = gulp.watch('server.js');
    watcher.on('change', function() {
        console.log('File was changed. Restarting server...');
        server.stop();
        server.run(['server.js']);
    });
});


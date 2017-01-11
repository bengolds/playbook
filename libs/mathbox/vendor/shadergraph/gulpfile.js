var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var browserify = require('gulp-browserify');
var watch = require('gulp-watch');
var KarmaServer = require('karma').Server;

var builds = {
  core:   'build/shadergraph-core.js',
  bundle: 'build/shadergraph.js',
  css:    'build/shadergraph.css',
};

var products = [
  builds.core,
  builds.bundle,
];

var vendor = [
];

var css = [
  'src/**/*.css',
];

var core = [
  '.tmp/index.js'
];

var coffees = [
  'src/**/*.coffee',
]

var bundle = vendor.concat(core);

var test = [
  'node_modules/three/three.js',
].concat(bundle).concat([
  'test/**/*.spec.coffee',
]);

gulp.task('browserify', function () {
  return gulp.src('src/index.coffee', { read: false })
      .pipe(browserify({
        debug: false,
        //detectGlobals: false,
        //bare: true,
        transform: ['coffeeify'],
        extensions: ['.coffee'],
      }))
      .pipe(rename({
        extname: ".js"
      }))
      .pipe(gulp.dest('.tmp/'))
});

gulp.task('css', function () {
  return gulp.src(css)
    .pipe(concat(builds.css))
    .pipe(gulp.dest(''));
});

gulp.task('core', function () {
  return gulp.src(core)
    .pipe(concat(builds.core))
    .pipe(gulp.dest(''));
});

gulp.task('bundle', function () {
  return gulp.src(bundle)
    .pipe(concat(builds.bundle))
    .pipe(gulp.dest(''));
});

gulp.task('uglify', function () {
  return gulp.src(products)
    .pipe(uglify())
    .pipe(rename({
      extname: ".min.js"
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('karma', function (done) {
  new KarmaServer({
    configFile: __dirname + '/karma.conf.js',
    files: test,
    singleRun: true,
  }, done).start();
});

gulp.task('watch-karma', function() {
  return gulp.src(test)
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch',
    }));
});

gulp.task('watch-build-watch', function () {
  watch(coffees.concat(css), function () {
    return gulp.start('build');
  });
});

// Main tasks

gulp.task('build', function (callback) {
  runSequence('browserify', ['css', 'core', 'bundle'], callback);
})

gulp.task('default', function (callback) {
  runSequence('build', 'uglify', callback);
});

gulp.task('test', function (callback) {
  runSequence('build', 'karma', callback);
});

gulp.task('watch-build', function (callback) {
  runSequence('build', 'watch-build-watch', callback);
})

gulp.task('watch', function (callback) {
  runSequence('watch-build', 'watch-karma', callback);
});

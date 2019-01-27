var gulp = require('gulp'),
  exit = require('gulp-exit'),
  clean = require('gulp-clean'),
  uglify = require('gulp-uglify'),
  log = require('fancy-log'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),

  browserify = require('browserify'),
  envify = require('envify'),
  watchify = require('watchify'),
  babelify = require('babelify'),
  sourcemaps = require('gulp-sourcemaps'),

  sass = require('gulp-sass'),
  nodeSass = require('node-sass'),
  cleanCss = require('gulp-clean-css'),
  autoprefixer = require('gulp-autoprefixer'),

  isProduction = process.env.NODE_ENV === 'production' ? true : false,

  buildType = process.env.BUILD_TYPE;


// Colors for Logging
const Reset = "\x1b[0m",
  FgRed = "\x1b[31m",
  FgCyan = "\x1b[36m";

// Set node-sass as gulp-sass compiler
sass.compiler = nodeSass;

// Distributes Static Files
function distributeFiles(){
  return gulp.src([
    './src/assets/index.html',
    // './src/assets/images/**/*.*',
    // './src/assets/fonts/**/*.*'
  ])
  .pipe( gulp.dest('./dist/') );
}

function clearFiles(){
  return gulp.src([
    './dist/**/*.map',
  ])
  .pipe(clean());
}

// Makes text cyan in console output
function cyanText(text){
  return FgCyan + text + Reset;
}

// Makes text red in console output
function redText(text){
  return FgRed + text + Reset;
}

// Compiles JS Files
function compile(watch) {
  // Initialize bundler
  var bundler = watchify(
    browserify('./src/index.js', {
      debug: !isProduction,
    })

    .transform(babelify, { 
      sourceMaps: !isProduction
    })
    .transform(envify,{
      NODE_ENV: isProduction ? 'production' : 'development'
    })
  );

  function rebundle() {
    log( 'Compiling: ' + cyanText('Javascript Files') );
    var stream = bundler
      .bundle()
      .on('error', function (err) {
          log.error('An ' +  redText('ERROR') + ' occurred during JS Compilation');
          log.error(err.stack);
          // this.emit('end');
      })
      .pipe(source('script.js'));
    // Create Source Maps if in Dev mode
    if ( !isProduction ){ 
      stream = stream.pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
    } else {
      stream = stream.pipe(buffer())
        .pipe(uglify());
    }
    return stream
      .pipe(gulp.dest('./dist/js'));
  }

  if (watch) {
    bundler.on('update', function () {
      rebundle();
    });
    return rebundle();
  } else {
    return rebundle().pipe(exit());
  }
}

// Initialize watcher for JS compiler
function watch() {
  return compile(true);
}

gulp.task('sass', ['Distributing Static Files'], function() {
  log( 'Compiling: ' + cyanText('SASS files') + ' in ' + ( isProduction ? redText('Production') : cyanText('Development') ) );
  var stream =  gulp.src('./src/sass/style.scss')
  .pipe(sass().on('error', sass.logError))
  .pipe(autoprefixer({
    browsers: ['last 2 versions']
  }));
  if ( process.env.NODE_ENV === 'production' ) {
    stream.pipe(cleanCss());
  }
  return stream.pipe(gulp.dest('./dist/css'));
} );

gulp.task('sass:watch',['sass'], function(){
  gulp.watch([
    './src/assets/index.html',
    './src/sass/style.scss',
    './src/sass/**/*.scss'
  ], ['Distributing Static Files', 'sass']);
});

gulp.task('build', function () {
    return compile();
});

gulp.task('watch', function () {
    return watch();
});

gulp.task('Clearing Static Files for new Builds', function(){
  return clearFiles();
} );

gulp.task('Distributing Static Files', ['Clearing Static Files for new Builds'], function(){
  return distributeFiles();
} );

var fullBuild = 'Full Single Build';

gulp.task('Full Single Build', ['sass'], () => {
  return compile();
} );


var tasks = [ 'sass', fullBuild ];
switch ( buildType ){
  case "js":
    tasks = [ 'watch' ];
    break;

  case "sass":
    tasks = [ 'sass:watch'];
    break;
}

gulp.task('default', tasks);

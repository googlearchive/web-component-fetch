#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
'use strict';
var commander = require('commander');
var concat = require('gulp-concat');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var filter = require('gulp-filter');
var mainBowerFiles = require('main-bower-files');
var path = require('path');
var polyclean = require('polyclean');
var replace = require('gulp-replace');
var shell = require('gulp-shell');

var mainImport = require('../lib/main-import');
var gulpsettings = require('../lib/gulpsettings');

commander
  .usage('[options] <components...>')
  .option('-d, --workdir [dir]', 'sets directory used for polymerization. Defaults to polymers/')
  .option('-m, --mainfile [file]', 'Sets debug main file. Defaults to main.html')
  .option('-p, --outfile [file]', 'Sets the output file. Defaults to polymers.html')
  .parse(process.argv)

var workdir = commander.workdir;
if (!workdir) {
  workdir = "polymers";
}
var outfile = commander.outfile;
if (!outfile) {
  outfile = "polymers.html";
}
console.log(workdir);
console.log(outfile);
console.log(commander.args);

function vulcanize(filename, outfile, root) {
  var cmd =  path.join(__dirname + '../node_modules/vulcanize/bin/vulcanize');
  cmd = cmd + ' ' + filename + ' > ' + outfile;
  console.log(cmd);
  return cmd
}

function bower(args) {
  var cmd = path.join(__dirname + '../node_modules/bower/bin/bower ');
  return cmd + args
}

function bower_install(components) {
  return bower(' --save install ' + components.join(' '))
}

function bower_init() {
  return bower(' init')
}

gulp.task('clean', function(cb) {
  del([workdir], cb);
});

gulp.task('mkdir', ['clean'], function(cb) {
  fs.mkdir(workdir, null, cb);
});

gulp.task('bower-init', ['mkdir'], function(cb) {
  fs.writeFile(path.join(workdir, 'bower.json'), JSON.stringify(gulpsettings()), cb)
})

gulp.task('bower', ['bower-init'], shell.task(bower_install(commander.args), {cwd: workdir}));

var bowerDir = path.join(workdir, 'bower_components');

gulp.task('component-main', ['bower'], function() {
  return gulp.src(mainBowerFiles({
    paths: {
      bowerJson: path.join(workdir, 'bower.json'),
      bowerDirectory: bowerDir
    }
  }))
  .pipe(filter('**/*.html'))
  .pipe(mainImport())
  .pipe(concat("main.html"))
  .pipe(gulp.dest(process.cwd()));
});

gulp.task('vulcanize',
          ['component-main'],
          shell.task(vulcanize("main.html", outfile)));

gulp.task('polish', ['vulcanize'], function() {
  return gulp.src(outfile)
    .pipe(polyclean.cleanJsComments())
    // Get rid of erroneous html comments
    .pipe(replace(/<!--((?!@license)[^])*?-->/g, ''))
    // Reduce script tags
    .pipe(replace(/<\/script>\s*<script>/g, '\n'))
    // Collapse newlines
    .pipe(replace(/\n\s*\n/g, '\n'))
    // Collapse leading spaces+tabs.
    .pipe(replace(/^[ \t]+/gm, ''))
    .pipe(gulp.dest(process.cwd()));
});


gulp.start('polish');

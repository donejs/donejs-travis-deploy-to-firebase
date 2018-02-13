var fs = require('fs');
var path = require('path');
var helpers = require('yeoman-test');
var assert = require('yeoman-assert');

describe('donejs-travis-to-firebase', function() {
  describe('without .travis.yml', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .on('end', done);
    });

    it('does not write travis.yml', function() {
      assert.noFile('.travis.yml');
    });
  });

  describe('travis.yml has before_deploy steps', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_before_deploy_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('end', done);
    });

    it('does not override travis.yml before_deploy steps', function() {
      assert.fileContent('.travis.yml', /echo 'ready\?'/);
    });
  });

  describe('with travis.yml without before_deploy steps', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('end', done);
    });

    it('adds before_deploy steps', function() {
      assert.fileContent('.travis.yml', /firebase deploy bot/);
      assert.fileContent('.travis.yml', /npm run deploy:ci/);
    });
  });
});

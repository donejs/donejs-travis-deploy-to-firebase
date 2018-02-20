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

  describe('travis.yml has firebase deploy step already', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_with_step_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('end', done);
    });

    it('does not duplicate deployment step', function() {
      assert.fileContent('.travis.yml', "before_deploy: 'npm run deploy:ci'");
    });
  });

  describe('travis.yml has global encrypted variable already', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_global_encrypted_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('end', done);
    });

    it('does not override globals', function() {
      assert.fileContent('.travis.yml', 'secure: foobarbaz');
    });
  });

  describe('travis.yml has single before_deploy step (non firebase)', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_without_step_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('ready', function(generator) {
          generator._encryptTravisToken = function() {
            return Promise.resolve('ENCRYPTED_TOKEN');
          };
        })
        .on('end', done);
    });

    it('does not remove existing before_deploy step', function() {
      assert.fileContent('.travis.yml', "echo 'ready?'");
    });

    it('adds firebase deployment step', function() {
      assert.fileContent('.travis.yml', /npm run deploy:ci/);
    });

    it('adds encrypted variable', function() {
      assert.fileContent('.travis.yml', 'env:');
      assert.fileContent('.travis.yml', 'global:');
      assert.fileContent('.travis.yml', 'secure: ENCRYPTED_TOKEN');
    });
  });

  describe('travis.yml has multiple before_deploy steps (non firebase)', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'travis_multiple_before_deploy_fixture.yml'),
            path.join(dir, '.travis.yml')
          );
        })
        .on('ready', function(generator) {
          generator._encryptTravisToken = function() {
            return Promise.resolve('ENCRYPTED_TOKEN');
          };
        })
        .on('end', done);
    });

    it('does not remove existing before_deploy steps', function() {
      assert.fileContent('.travis.yml', "echo 'ready?'");
      assert.fileContent('.travis.yml', "echo 'are you sure?'");
    });

    it('adds firebase deployment step', function() {
      assert.fileContent('.travis.yml', /npm run deploy:ci/);
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
        .on('ready', function(generator) {
          generator._encryptTravisToken = function() {
            return Promise.resolve('ENCRYPTED_TOKEN');
          };
        })
        .on('end', done);
    });

    it('adds firebase before_deploy step', function() {
      assert.fileContent('.travis.yml', "before_deploy: 'npm run deploy:ci'");
    });
  });
});

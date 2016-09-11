#!/usr/bin/env node

var prompt = require('prompt');
var colors = require('colors/safe');
var piblaster = require('pi-blaster.js');
var Gpio = require('onoff').Gpio;
var motorPower = new Gpio(26, 'out');

prompt.message = '';

var leftPos = 0.033;
var rightPos = 0.12;
var posRange = rightPos - leftPos;
var pwmPin = 21;

function safeClose(err) {
  if (err) {
    console.log(colors.red('Ctrl+C causing instant exit'));
    motorPower.unexport();
    process.exit();
  }
}

function setPWM(newPWM) {
  console.log(colors.green('Calculated PWM on period: '), newPWM);
  piblaster.setPwm(pwmPin, newPWM);
  process.stdout.write(colors.gray('Energizing motors\n'));
  motorPowered(restartOrExit);
}

function restartOrExit() {
  console.log('');
  prompt.start();
  prompt.get({
    properties: {
      restart: {
        description: colors.magenta('Set new position?(y/n)'),
        message: 'Valid input is "y" to set new position, or "n" to exit',
        type: 'string',
        default: 'y',
        conform(val) {
          return val === 'y' || val === 'n';
        }
      }
    }
  }, function (err,result) {
    safeClose(err);
    console.log('');
    result.restart === 'y' ? setPosition() : process.exit();
  });
}

function setPosition() {
  prompt.start();
  prompt.get({
    properties: {
      position: {
        description: colors.magenta('Set position(range -90,90 degrees)'),
        type: 'number',
        minimum: -90,
        maximum: 90,
        message: 'Must be a number between -90 and 90. Decimal point is "."',
        required: true,
        before(val) {
          var calculatedPos = ( ( (val + 90) / 180) * posRange ) + leftPos;
          return calculatedPos.toFixed(4);
        }
      }
    }
  }, function (err, result) {
    safeClose(err);
    setPWM(result.position);
  });
}

function motorPowered(cb) {
  var dur = 800;

  motorPower.write(1, function(err) {
    if(err) {
      console.error(err);
      return;
    }

    var dotsInterval = setInterval(function() {
      process.stdout.write('.');
    }, 78);

    setTimeout(function() {
      clearInterval(dotsInterval);
      motorPower.writeSync(0);
      process.stdout.write('\n');
      cb();
    }, dur);

  });
}

setPosition();

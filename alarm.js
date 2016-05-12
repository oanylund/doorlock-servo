var piblaster = require('pi-blaster.js');

function Alarm(pinUsed) {
  this.alarmPin = pinUsed || 17;
  piblaster.setPwm(this.alarmPin, 0);

  this.lowTone = 0.5;
  this.highTone = 1;
}

Alarm.prototype = {
  openSequence() {
    piblaster.setPwm(this.alarmPin, this.lowTone);
    this.changePwmDelayed(0, 250);
    this.changePwmDelayed(this.highTone, 300);
    this.changePwmDelayed(0, 550);
  },
  closeSequence() {
    piblaster.setPwm(this.alarmPin, this.highTone);
    this.changePwmDelayed(0, 250);
    this.changePwmDelayed(this.lowTone, 300);
    this.changePwmDelayed(0, 550);
  },
  changePwmDelayed(value, delay) {
    var timedSound = function(pwm) {
      piblaster.setPwm(this.alarmPin, pwm);
    }
    setTimeout(timedSound.bind(this,value), delay);
  }
}

module.exports = Alarm;

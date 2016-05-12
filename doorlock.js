var piblaster = require('pi-blaster.js');
var Gpio = require('onoff').Gpio;
var motorPower = new Gpio(26, 'out');


function Doorlock(pinUsed, openPosition, closePosition) {

  // Turn off motor power supply
  motorPower.writeSync(0);

  // Assign variables
  this.pinUsed = pinUsed || 22;
  this.openPosition = openPosition || 0.096;
  this.closePosition = closePosition || 0.056;

  // Lock door on init
  this.Lock();
}

Doorlock.prototype = {
  Unlock() {
    if( this.isLocked ) {
      piblaster.setPwm(this.pinUsed, this.openPosition);
      this._motorPowered();
      this.isLocked = false;
    }
  },
  Lock() {
    if( !this.isLocked ) {
      piblaster.setPwm(this.pinUsed, this.closePosition);
      this._motorPowered();
      this.isLocked = true;
    }
  },
  IsLocked() {
    return this.isLocked;
  },
  _motorPowered(duration) {
    var dur = duration || 800;
    motorPower.write(1, function(err) {
      if(err) {
        console.error(err);
        return;
      }
      else {
        setTimeout(function() {
          motorPower.writeSync(0);
        }, dur);
      }
    });
  },
  release() {
    motorPower.unexport();
  }
}

module.exports = Doorlock;

var piblaster = require('pi-blaster.js');
var Gpio = require('onoff').Gpio;
var motorPower = new Gpio(26, 'out');
var EventEmitter = require("events").EventEmitter;
var util = require("util");

function Doorlock() {
  EventEmitter.call(this);

  // Turn off motor power supply
  motorPower.writeSync(0);

  // Assign variables
  this.pinUsed = 21;
  this.openPosition = 0.096;
  this.closePosition = 0.056;

  // Lock door on init
  this.Lock();
}

util.inherits(Doorlock, EventEmitter);

Doorlock.prototype.Unlock = function() {
  if( this.isLocked ) {
    piblaster.setPwm(this.pinUsed, this.openPosition);
    this._motorPowered();
    this.isLocked = false;
    this._statusChange();
  }
}

Doorlock.prototype.Lock = function() {
  if( !this.isLocked ) {
    piblaster.setPwm(this.pinUsed, this.closePosition);
    this._motorPowered();
    this.isLocked = true;
    this._statusChange();
  }
}

Doorlock.prototype.IsLocked = function() {
  return this.isLocked;
}

Doorlock.prototype.release = function() {
  motorPower.unexport();
}

Doorlock.prototype._motorPowered = function(duration) {
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
}

Doorlock.prototype._statusChange = function() {
  this.emit('lockStatusChanged', {
    isLocked: this.isLocked
  });
}

module.exports = Doorlock;

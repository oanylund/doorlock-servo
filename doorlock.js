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
  this.openPosition = 0.0765;
  this.closePosition = 0.1055;

  // Lock door on init
  this.Lock();
}

util.inherits(Doorlock, EventEmitter);

Doorlock.prototype.Unlock = function(cb) {
  if( this.isLocked ) {
    piblaster.setPwm(this.pinUsed, this.openPosition);
    this.isLocked = false;
    this._motorPowered(cb);
  }
}

Doorlock.prototype.Lock = function(cb) {
  if( !this.isLocked ) {
    piblaster.setPwm(this.pinUsed, this.closePosition);
    this.isLocked = true;
    this._motorPowered(cb);
  }
}

Doorlock.prototype.IsLocked = function() {
  return this.isLocked;
}

Doorlock.prototype.release = function() {
  motorPower.unexport();
}

Doorlock.prototype._motorPowered = function(duration, cb) {
  var self = this;
  var dur = !isNaN(duration) ? duration : 800;
  if(!cb && typeof duration === 'function') {
    var cb = duration;
  }

  motorPower.write(1, function(err) {
    if(err) {
      console.error(err);
      return;
    }

    setTimeout(function() {
      motorPower.writeSync(0);
      if(typeof cb === 'function') {
        cb();
      }
      self._statusChange();
    }, dur);

  });
}

Doorlock.prototype._statusChange = function() {
  this.emit('lockStatusChanged', {
    isLocked: this.isLocked
  });
}

module.exports = Doorlock;

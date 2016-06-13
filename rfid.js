var EventEmitter = require("events").EventEmitter;
var util = require("util");

function RfidReader() {
  EventEmitter.call(this);
  this.newRegistration = false;
}

util.inherits(RfidReader, EventEmitter);

RfidReader.prototype.cardScan = function(rfidSerialNumber) {
  if( this.newRegistration ) {
    this.emit('newCardScanned', rfidSerialNumber);
  }
  else {
    this.emit('cardScanned', rfidSerialNumber);
  }
}

RfidReader.prototype.setNewRegistration = function(newState) {
  this.newRegistration = newState;
}

module.exports = RfidReader;

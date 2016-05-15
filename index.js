var doorlock = require('./doorlock.js');
var MainLock = new doorlock();

var EventEmitter = require("events").EventEmitter;
var eventEmitter = new EventEmitter();

var alarmBuzzer = require('./alarm.js');
var AlarmBuzzer = new alarmBuzzer();
var rfid = require('rc522-rfid');
var User = require('doorlock-models').User;

var newRegistration = false;

var logger = function(msg) {
  console.log('--------------------------------------------');
  console.log(msg);
  console.log(new Date());
}

// TODO: Pull eventEmitter out to its own file, make an inherited event.
rfid(function(rfidSerialNumber){
  if( newRegistration ) {
    eventEmitter.emit('newCardScanned', rfidSerialNumber);
  }
  else {
    eventEmitter.emit('cardScanned', rfidSerialNumber);
  }
});

// Socket.io stuff for getting new studentCardId to admin ui on registration
var io = require('socket.io')(8080, { serveClient: false });

io.on('connection', function (socket) {
  logger('New connection on socket 8080');

  socket.on('scanNewId', function(response) {

    logger('Request to scan new card recieved');
    newRegistration = true;

    var waitForScantimeout = setTimeout(function() {
      logger('Requester failed to scan card within timelimit');
      AlarmBuzzer.errorSequence();
      response(false);
      newRegistration = false;
      socket.disconnect();
    }, 10000);

    eventEmitter.once('newCardScanned', function(rfidSerialNumber) {
      logger('New card scanned, id ' + rfidSerialNumber + ' returned');
      AlarmBuzzer.verificationSequence();
      response(rfidSerialNumber);
      newRegistration = false;
      clearTimeout(waitForScantimeout);
      socket.disconnect();
    });

  });
});

// Handle lock/unlock door
User.sync().then(function() {
  logger('User schema synced.');

    eventEmitter.on('cardScanned', function(rfidSerialNumber) {

      User.findOne({
        where: { studentCardId: rfidSerialNumber },
        attributes: ['firstName', 'lastName']
      }).then(function(user) {
        if( !user ) {
          logger('Unauthorized card: ' + rfidSerialNumber);
          AlarmBuzzer.errorSequence();
        }
        else {
          if( MainLock.IsLocked() ) {
            MainLock.Unlock();
            logger('Door opened for user ' + user.firstName + ' ' + user.lastName);
            AlarmBuzzer.openSequence();
          }
          else {
            MainLock.Lock();
            logger('Door closed for user ' + user.firstName + ' ' + user.lastName);
            AlarmBuzzer.closeSequence();
          }
        }
      });

    });
});

process.on('SIGINT', function () {
  console.log('\nService stopped by user. Bye');
  // Release GPIO pins used by onoff
  MainLock.release();
});

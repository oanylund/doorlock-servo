var doorlock = require('./doorlock.js');
var MainLock = new doorlock();

var alarmBuzzer = require('./alarm.js');
var AlarmBuzzer = new alarmBuzzer();

var User = require('doorlock-models').User;

var RfidReader = require('./rfid.js');
var rfidReader = new RfidReader();
var rfid = require('rc522-rfid');

// Register cardscan event
rfid(function(rfidSerNumber) {
  rfidReader.cardScan(rfidSerNumber);
});

// Logger util function
var logger = function(msg) {
  console.log('--------------------------------------------');
  console.log(msg);
  console.log(new Date());
}


// Log startup, verify to user with sound
logger('App started');
AlarmBuzzer.verificationSequence();

// Socket.io stuff for getting new studentCardId to admin ui on registration
var io = require('socket.io')(8080, { serveClient: false });

io.on('connection', function (socket) {
  logger('New connection on socket 8080');

  socket.on('scanNewId', function(response) {

    logger('Request to scan new card recieved');
    rfidReader.setNewRegistration(true);

    var waitForScantimeout = setTimeout(function() {
      logger('Requester failed to scan card within timelimit');
      AlarmBuzzer.errorSequence();
      response(false);
      rfidReader.setNewRegistration(false);
      socket.disconnect();
    }, 10000);

    rfidReader.once('newCardScanned', function(rfidSerialNumber) {
      logger('New card scanned, id ' + rfidSerialNumber + ' returned');
      AlarmBuzzer.verificationSequence();
      response(rfidSerialNumber);
      rfidReader.setNewRegistration(false);
      clearTimeout(waitForScantimeout);
      socket.disconnect();
    });

  });
});

// Handle lock/unlock door
User.sync().then(function() {
  logger('User schema synced');

    rfidReader.on('cardScanned', function(rfidSerialNumber) {

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

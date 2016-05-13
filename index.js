var doorlock = require('./doorlock.js');
var MainLock = new doorlock();

var alarmBuzzer = require('./alarm.js');
var AlarmBuzzer = new alarmBuzzer();
var rfid = require('rc522-rfid');

var User = require('doorlock-models').User;

User.sync().then(function() {
  console.log('--------------------------------------------');
  console.log('User schema synced.');
  console.log(new Date());

  rfid(function(rfidSerialNumber){

    User.findOne({
      where: { studentCardId: rfidSerialNumber },
      attributes: ['firstName', 'lastName']
    }).then(function(user) {
      if( !user ) {
        console.log('--------------------------------------------');
        console.log('Unauthorized card: ' + rfidSerialNumber);
        console.log(new Date());
        // FEILPIPING fra buzzer
      }
      else {
        if( MainLock.IsLocked() ) {
          MainLock.Unlock();
          console.log('--------------------------------------------');
          console.log('Door opened for user ' + user.firstName + ' ' + user.lastName);
          console.log(new Date());
          AlarmBuzzer.openSequence();
        }
        else {
          MainLock.Lock();
          console.log('--------------------------------------------');
          console.log('Door closed for user ' + user.firstName + ' ' + user.lastName);
          console.log(new Date());
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

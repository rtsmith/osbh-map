var Particle = require('particle-api-js');
var app = require('express')();
var creds = require('./secret/credentials');

// firebase
var firebase = require('firebase-admin');
var serviceAccount = require('./secret/osbh-map-firebase-adminsdk-2c4qw-a154082987.json');
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://osbh-map.firebaseio.com"
});
var database = firebase.database()
// 

var token;
var locations;
var particle = new Particle();

//
// serve html to client

// get device locations on init and listen for additions

database.ref('/').on('value', function(snapshot) {
  locations = JSON.stringify(snapshot.val())
})

// listen for new device locations

app.get('/', (req, res) => {
  res.render("index.ejs", {
    map_api_key: creds.maps_key,
    devices: locations
  });
});

app.listen(8080, () => {
  console.log('listening on 8080')
})

//
// log in to Particle and listen for hive events
particle.login({
  username: creds.particleUser,
  password: creds.particlePassword
}).then(function(data) {
  token = data.body.access_token;
  console.log("Logged in, getting event stream");

  var req = particle.getEventStream({
    auth: token,
    product: 1003
  }).then(function(stream) {
    stream.on('event', function(data) {
      console.log('Event: ' + JSON.stringify(data));
        var a = data.data.split(",");
        // convert strings to numbers: lat, lng, accuracy
        a[0] = parseFloat(a[0]);
        a[1] = parseFloat(a[1]);
        a[2] = parseInt(a[2]);

        var blob = {
          pub: data.published_at,
          pos: {
            lat: a[0],
            lng: a[1],
          },
          acc: a[2]
        };
        console.log(JSON.stringify(blob));
        // naive check
        if (a[0] != undefined) {
          database.ref('/' + data.coreid).set(blob);
        }
    });

    // https://github.com/spark/particle-api-js/issues/15
    // EventStream fails silently, this error never happens: 
    stream.on('error', (err) => {
      console.log('woops error!!!!!!=====')
    })

  });
},
function (err) {
  console.log('Could not log in.', err);
});

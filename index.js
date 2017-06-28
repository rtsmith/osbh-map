var Particle = require('particle-api-js');
var app = require('express')();
var creds = require('./credentials');
var token;

var particle = new Particle();

//
// serve html to client
app.get('/', (req, res) => {
  res.render("map.ejs", { map_api_key: maps_key });
});

app.listen(8080, () => {
  console.log('listening on 8080')
})

//
// log in to Particle and listen for hive events
particle.login({
  username: creds.particleUser,
  password: creds.particlePassword
}).then(
  function(data) {
    token = data.body.access_token;
    console.log("Logged in, getting event stream");

    var req = particle.getEventStream({auth: token}).then(function(stream) {
      stream.on('event', function(data) {
        console.log('Event: ' + JSON.stringify(data));
        if (data.name.startsWith('hook-response/deviceLocator')) {
          var a = data.data.split(",");
          // convert strings to numbers: lat, lng, accuracy
          a[0] = parseFloat(a[0]);
          a[1] = parseFloat(a[1]);
          a[2] = parseInt(a[2]);

          var msg = JSON.stringify({
            id: data.coreid,
            pub: data.published_at,
            pos: {
              lat: a[0],
              lng: a[1],
            },
            acc: a[2]
          });
          console.log(msg);
        }
      });

      // EventStream fails silently, this error never happens: 
      // https://github.com/spark/particle-api-js/issues/15
      stream.on('error', (err) => {
        console.log('woops error!!!!!!=====')
      })

    });
  },
  function (err) {
    console.log('Could not log in.', err);
  }
);

const app = require('./server');

app.listen(process.env.PORT || 5000, function () {
  console.log("Your app is listening on port " + listener.address().port)
});
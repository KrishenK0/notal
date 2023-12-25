#!/usr/bin/env node

// Author: Antoine "krishenk"
require('dotenv').config();
const express = require("express")
const app = express()
const cors = require('cors');
const bodyParser = require('body-parser');
const serverless = require('serverless-http');
const { Worker, isMainThread, parentPort } = require('worker_threads');
var winston = require('winston'),
    expressWinston = require('express-winston');

app.use(cors(({credentials: true, origin: 'http://localhost:4200'})));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: function (req, res) { return false; }
}));
app.use((req, res, next) => {
  const { headers: { cookie } } = req;
  if (cookie) {
      const values = cookie.split(';').reduce((res, item) => {
          const data = item.trim().split('=');
          return { ...res, [data[0]]: data[1] };
      }, {});
      res.locals.cookie = values;
  }
  else res.locals.cookie = {};
  next();
});
app.use('/api/*', (req, res, next) => {
  if (res.locals.cookie['user-id'] === undefined) {
    res.sendStatus(401);
    return;
  }
  next();
})

app.get("/", function (request, response) {
  response.send("Welcome to alcuin api !")
})

app.get("/auth", async (req, res) => {
  if (req.query["error"]) res.status(401).send(req.query["error"]);
  if (req.query["code"]) {

    const worker = new Worker('./alcuin.js', {
      workerData: {
        action: 'login',
        code: req.query["code"],
      }
    });

    worker.on('message', (message) => {
      console.log(message);
      res.json(message);
    });

    worker.on('error', (error) => {
      console.error(error);
      res.sendStatus(500);
    });
  }
});

app.get("/token", async (req, res) => {
  res.json(res.locals);
});

app.get("/api/allPages", async (req, res) => {
  const worker = new Worker('./alcuin.js', {
    workerData: {
      action: 'allPages',
      cookie: res.locals.cookie['user-id'],
    }
  });

  worker.on('message', (message) => {
    console.log(message);
    res.json({result: message});
  });

  worker.on('error', (error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

app.get("/api/database", async (req, res) => {
  const worker = new Worker('./alcuin.js', {
    workerData: {
      action: 'database',
      cookie: res.locals.cookie['user-id'],
    }
  });

  worker.on('message', (message) => {
    console.log(message);
    res.json(message);
  });

  worker.on('error', (error) => {
    console.error(error);
    res.sendStatus(500);
  });
})

app.post("/synchronize", async (req, res) => {
  if (req.body.parent_id === undefined || req.body.parent_id === '') {
    res.sendStatus(400);
    return;
  }

  const worker = new Worker('./alcuin.js', {
    workerData: {
      action: 'sync',
      cookie: res.locals.cookie['user-id'],
      username: req.body.username,
      password: req.body.password,
      parent_id: req.body.parent_id,
      type: req.body.type
    }
  });

  worker.on('message', (message) => {
    console.log(message);
    res.json(message);
  });

  worker.on('error', (error) => {
    console.error(error);
    res.sendStatus(500);
  });
});

app.get("/month", async (req, res) => {
  // res.json(await notion.search({filter: {property: "object", value: "page"}}))
  const database = await getOrCreateDatabaseId();
  // console.log(database);
  let t = new Date();
  const datas = await main(process.env.LOGIN, process.env.PASS, new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59).getDate(), t.setDate(0));
  // console.log(datas);
  let test = [];
  console.log('[*] Synchronisation du calendrier Notion.');
  for (const dataDay of datas) {
    for (const data of dataDay) {
      if (!(await checkRow(database.id, data)))
        test.push(await addRow(database.id, data));
    }
  }
  console.log('[*] Calendrier synchronisé!');
  res.json(test);
});

app.get("/calendar", async (request, response) => {
  response.json(await main(process.env.LOGIN, process.env.PASS));
});

app.listen(process.env.PORT || 5000, function () {
  console.log("Your app is listening on port " + listener.address().port)
});
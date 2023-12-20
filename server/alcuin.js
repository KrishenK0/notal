#!/usr/bin/env node

// Author: Antoine "krishenk"
require('dotenv').config();
const express = require("express")
const app = express()
const cors = require('cors');
const superagent = require('superagent').agent();
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
var winston = require('winston'),
    expressWinston = require('express-winston');

const { Client } = require("@notionhq/client");
const { options } = require('superagent');
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
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
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

let notion;

app.get("/", function (request, response) {
  response.send("Welcome to alcuin api !")
})

app.get("/auth", async (req, res) => {
  if (req.query["error"]) res.status(401).send(req.query["error"]);
  if (req.query["code"]) {
    // encode in base 64
    const encoded = Buffer.from(`${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`).toString("base64");
    
    superagent.post("https://api.notion.com/v1/oauth/token")
    .accept("application/json")
    .type("application/json")
    .set({
      "Notion-Version": "2022-06-28",
      'Authorization': `Basic ${encoded}`
    }).send({
      grant_type: "authorization_code",
      code: req.query["code"],
      redirect_uri: "http://localhost:4200/login",
    })
    .then(data => res.json(JSON.parse(data.text)))
    .catch(data => res.status(400).json(JSON.parse(data.response.text)));
      return;
    }
    res.sendStatus(400);
});

app.get("/token", async (req, res) => {
  res.json(res.locals);
});

app.get("/api/allPages", async (req, res) => {
  const notion = new Client({ auth: res.locals.cookie['user-id'] });
  let pages = await notion.search({filter: {property: "object", value: "page"}});
  let output = [];
  // res.json(pages);
  for (const page of pages.results) {
    if (page.properties.title)
      output.push({
        id: page.id,
        title: page.properties.title ? page.properties.title.title[0].plain_text : 'No Title',
        icon: page.icon ? page.icon.emoji : undefined,
      });
  }
  res.json({result: output});
});

app.get("/api/database", async (req, res) => {
  const notion = new Client({ auth: res.locals.cookie['user-id'] });
  const search = await notion.search({query: "Courses", filter: {property: "object", value: "database"}});
  res.json({result: search.results[0] ? search.results[0].id : false});
})

app.post("/synchronize", async (req, res) => {
  console.log(res.locals);
  if (req.body.parent_id) {
    res.sendStatus(400);
    return;
  }
  const database = await getOrCreateDatabaseId(res.locals.cookie['user-id'], req.body.parent_id);
  let datas;
  switch (req.body.type) {
    case "week":
      datas = await main(req.body.username, req.body.password, 5);
      break;
    case "month":
      let t = new Date();
      datas = await main(req.body.username, req.body.password, new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59).getDate(), t.setDate(0));
      break;
    default:
      res.sendStatus(400);
      return;
  }
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


async function getOrCreateDatabaseId(token, parent_id) {
  console.log(token);
  notion = new Client({ auth: token });
  if (parent_id === undefined) {
    const searchPageId = await notion.search({filter: {property: "object", value: "page"}});
  }
  const search = await notion.search({query: "Courses", filter: {property: "object", value: "database"}});
  if (search.results.length === 0) {
    try {
      const newDb = await notion.databases.create({
        parent: {
          type: "page_id",
          "page_id": parent_id ?? searchPageId.results[0].id,
        },
        title: [
          {
            type: "text",
            text: {
              content: "Courses",
            },
          },
        ],
        icon: {
          type: "emoji",
          emoji: "📚"
        },
        properties: {
          "Name": {
            type: "title",
            title: {},
          },
          "Type": {
            type: "rich_text",
            rich_text: {},
          },
          "Teachers": {
            type: "multi_select",
            "multi_select": {},
          },
          "Time": {
            type: "date",
            date: {},
          },
          "Classroom": {
            type: "rich_text",
            rich_text: {}
          },
          "Grades": {
            type: "multi_select",
            "multi_select": {},
          },
          "ID": {
            formula: {
              // substring(prop(\"Name\"), 0, 5) + 
              // expression: "substring(prop(\"Name\"), 0, 5) + date(prop(\"Time\")) + month(prop(\"Time\")) + year(prop(\"Time\")) + hour(prop(\"Time\")) + minute(prop(\"Time\"))"
              // expression: "substring(prop(\"Name\"), 0, 5)"
              expression: "hour(prop(\"Time\"))"
            }
          },
        },
      })
      return newDb;
    } catch (error) {
      return error;
    }
  } else return search.results[0];
}

async function checkRow(database_id, course) {
  const response = await notion.databases.query({
    database_id: database_id,
    filter: {
      and: [
        {
          property: 'Time',
          date: {
            on_or_before: course[2].start,
          }
        },
        {
          property: 'Name',
          title: {
            equals: course[1],
          }
        }
      ]
    }
  });
  if (response.results.length > 0) {
    for (const result of response.results) {
      if (new Date(result.properties['Time'].date.start.replace(/\+[0-9]+:[0-9]+/, "Z")).getTime() === (new Date(course[2].start)).getTime())
        return true;
    }
  }

  return false;
}

async function addRow(database_id, course) {
  const teachers = course[3].map((x, i) => x = {name:x});
  const courses = course[5].map((x, i) => x = {name:x});
  const response = await notion.pages.create({
    parent: {
      "database_id": database_id,
    },
    properties: {
      "Name": {
        type: "title",
        title: [{text: {content: course[1] }}],
      },
      "Type": {
        type: "rich_text",
        rich_text: [{text: {content: course[0] }}],
      },
      "Teachers": {
        type: "multi_select",
        "multi_select": teachers,
      },
      "Time": {
        type: "date",
        date: {
          start: course[2].start,
          end: course[2].end,
          time_zone: "Europe/Paris",
        },
      },
      "Classroom": {
        type: "rich_text",
        rich_text: [{text: {content: course[4] }}],
      },
      "Grades": {
        type: "multi_select",
        "multi_select": courses
      },
    },
  });

  return response;

}

// Éditez les champs ci-dessous :
const LOGIN = process.env.LOGIN;
const PASS = process.env.PASS;

async function main(LOGIN, PASS, days, initDate) {
  console.log('[*] Connexion à Alcuin');

  const { data } = await getInputs('https://esaip.alcuin.com/OpDotNet/Noyau/Login.aspx');
  await loginAlcuin('https://esaip.alcuin.com/OpDotNet/Noyau/Login.aspx', data, LOGIN, PASS);

  let cal, datas = [];
  let date = prevDate = new Date(initDate ?? Date.now());
  initDate === undefined && date.setDate(date.getDate() - date.getDay());
  
  for (let i = 0; i < days; i++) {
    let dayData = [];
    date.setDate(date.getDate() + 1);
    console.log(`[*] Récupération des données du ${date.toISOString().replace(/T.*/, '')}`);
    if ((date.getDay() == 1 && prevDate.getDay() == 0) || cal == undefined) {
      console.log(`[*] Requête d'un nouveau calendrier vers Alcuin.`);
      cal = await retrieveCal(date.toISOString().replace(/T.*/, '').replace(/-/g, ''));
    }
    console.log(`date: ${date.toISOString().replace(/T.*/, '').replace(/-/g, '')}`);
    const calendar = cal.match(/<td class="GEDcellsouscategorie" align="center" bgcolor="#ffff00">.*?<\/td>/gsi).filter(x => (new RegExp(date.toISOString().replace(/T.*/, '').replace(/-/g, ''))).test(x));
    for (const i of calendar) {
      dayData.push(extractCalData(i, date));
    }   
    datas.push(dayData)
    prevDate = new Date(date);
  }

  console.log('[*] Calendrier récupéré!');
  return datas;
}

async function getInputs(url) {
  const response = await superagent.get(url).set("Connection", "keep-alive");
  const $ = cheerio.load(response.text);
  const inputs = {};

  $('input').each((index, element) => {
    const name = $(element).attr('name');
    const value = $(element).attr('value');
    if (name) {
      inputs[name] = value;
    }
  });

  return { data: inputs };
}

async function loginAlcuin(url, data, LOGIN, PASS) {
  data['UcAuthentification1$UcLogin1$txtLogin'] = LOGIN;
  data['UcAuthentification1$UcLogin1$txtPassword'] = PASS;
  
  try {
    const login = await superagent.post(url).send(data).set('Content-Type', 'application/x-www-form-urlencoded').set('Connection', 'keep-alive');
    console.log('[*] Connexion à Alcuin réussie');
  } catch (error) {
    console.error(error);
    console.error('[-] Impossible de se connecter à Alcuin');
    process.exit(1);
  }
}

async function retrieveCal(date) {
  let dataResp = await superagent.get("https://esaip.alcuin.com/OpDotnet/commun/Login/aspxtoasp.aspx").query({
      url:"/Eplug/Agenda/Agenda.asp?IdApplication=190",
      "TypeAcces":"Utilisateur",
      IdLien:5834,
      groupe:2483,
  })
  const datas = [...dataResp.text.matchAll(/name="([a-zA-Z0-9_]+)".+value="([a-zA-Z0-9-\|\/=\?\., `:]+)?"/g)].reduce((map, obj) => { map[obj[1]] = obj[2] ?? ""; return map}, {});

  await superagent.post("https://esaip.alcuin.com/commun/aspxtoasp.asp").query({
    "IdApplication": 190,
    "TypeAcces": "Utilisateur",
    IdLien: 5834,
    groupe: 2483,
    "token": datas["token"]
  }).send(datas).type('form');
  const calandarResp = await superagent.post("https://esaip.alcuin.com/Eplug/Agenda/Agenda.asp").send({
    NumDat: date,
    DebHor: "08",
    FinHor: "19",
    ValGra: "30",
    NomCal: "USR47448",
    
  }).type('form');
  return calandarResp.text;
}

function extractCalData(cal, date) {
  const course = cal.match(/<b>(.*?)<\/b>.*?<font .*?>([0-9]+H[0-9]+-[0-9]+H[0-9]+)<\/font>(.*)?<font .*?>([A-Z0-9]+|Amphi [A-Z])<\/font>(.*?)<\/td>/si);
  let courseArray = course[1].split(" - ");

  let courseType = courseArray.shift();
  let courseName = courseArray.join(" - ");
  if (courseName === undefined) {
    courseName = courseType;
    courseType = "Spécial";
  } 
  
  const teachersCtx = course[3].matchAll(/<font.*?>(.*?)<\/font>/isg);
  const teachers = [...teachersCtx].map((x, i) => [i] = x[1], []);
  
  const gradesCtx = course[5].matchAll(/<font.*?>(.*?)<\/font>/isg);
  const grades = [...gradesCtx].map((x, i) => [i] = x[1], []);
  
  const courseTime = course[2].split("-");
  const startTime = courseTime[0].split("H");
  const endTime = courseTime[1].split("H");

  const startDate = new Date(date);
  const endDate = new Date(date);
  startDate.setHours(parseInt(startTime[0])+2, startTime[1], 0, 0);
  endDate.setHours(parseInt(endTime[0])+2, endTime[1], 0, 0);

  // console.log(courseTime, {endTime: endTime, endDate: endDate.toISOString()}, {startTime: startTime, startDate: startDate.toISOString()})
  
  return [courseType, courseName, {start: startDate.toISOString(), end: endDate.toISOString()}, teachers, course[4], grades];
}


// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port)
})
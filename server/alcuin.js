#!/usr/bin/env node

// Author: Antoine "krishenk"
require('dotenv').config();
const express = require("express")
const app = express()
const superagent = require('superagent').agent();
const cheerio = require('cheerio');

const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY })

app.get("/", function (request, response) {
  response.send("Welcome to alcuin api !")
})

app.get("/week", async (req, res) => {
  // res.json(await notion.search({filter: {property: "object", value: "page"}}))
  const database = await getOrCreateDatabaseId();
  // console.log(database);
  const datas = await main(5);
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

app.get("/month", async (req, res) => {
  // res.json(await notion.search({filter: {property: "object", value: "page"}}))
  const database = await getOrCreateDatabaseId();
  // console.log(database);
  let t = new Date();
  const datas = await main(new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59).getDate(), t.setDate(0));
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
  response.json(await main());
});


async function getOrCreateDatabaseId() {
  const search = await notion.search({query: "Courses", filter: {property: "object", value: "database"}});
  if (search.results.length === 0) {
    try {
      const newDb = await notion.databases.create({
        parent: {
          type: "page_id",
          "page_id": process.env.NOTION_PAGE_ID,
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

async function main(days, initDate) {
  console.log('[*] Connexion à Alcuin');

  const { data } = await getInputs('https://esaip.alcuin.com/OpDotNet/Noyau/Login.aspx');
  await loginAlcuin('https://esaip.alcuin.com/OpDotNet/Noyau/Login.aspx', data);

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

async function loginAlcuin(url, data) {
  data['UcAuthentification1$UcLogin1$txtLogin'] = LOGIN;
  data['UcAuthentification1$UcLogin1$txtPassword'] = atob(PASS);
  
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
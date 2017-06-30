// Initialise the Zendesk JavaScript API client
// https://developer.zendesk.com/apps/docs/apps-v2
const zd = ZAFClient.init();
zd.invoke('resize', { width: '100%', height: '250px' });
var mb = {};
const url_field = 'ticket.customField:custom_field_80819528';
var ticket_id;

// Client ID and API key from the Developer Console
const CLIENT_ID = '865422449210-uki5t91846r57q7ageqsksc6joh9ik2k';
// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/calendar";
var authorizeButton = $('#authorize-button');
//var signoutButton = document.getElementById('signout-button');
var gtm1 = 'tealium.com_3339343935303339343132@resource.calendar.google.com';
var gtm2 = 'tealium.com_35383436313433382d333235@resource.calendar.google.com';
var gtm3 = 'tealium.com_2d39393133323231352d333330@resource.calendar.google.com';


/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    //authorizeButton.onclick = handleAuthClick;
    //signoutButton.onclick = handleSignoutClick;
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    zd.get(url_field).then(function(response){
      if(response[url_field] && response[url_field].indexOf('google.com/calendar/event') > -1){
        currentEvent()
      } else {
        renderContent('#menu');
      }
    });
  } else {
    renderContent('#entry-screen');
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

function bookMeeting (cals) {

  var times = {};
  var first = moment('08:30', 'HH:mm');
  var days = [];
  for (let i = 0; i < 7; i++){
    let now = moment().add(i, 'day');
    let day = now.format('ddd')
    if (day === "Sat" || day === "Sun") continue;
    days.push(day);
  }
  for (let i = 0; i < 20; i++) {
    first.add(30, 'minute');
    let time = first.format('HH:mm');
    times[time] = {days : {}};
    for (let i = 0; i < days.length; i++) {
      let date = moment(time, 'HH:mm').add(i, 'day');
      if (days.indexOf(moment(date).format('ddd')) === -1) {
        date = moment(time, 'HH:mm').add(i+2, 'day');
      }
      times[time].days[days[i]] = {
        date : date.format('DD/MM'),
        past : (!date.isAfter(moment())),
        busy : false,
        events : []
      };
    }
  }
  var num_cals = cals.length;
  var run = 0;

  for (let i of cals) {
    checkMeetings(i);
  }

  function checkMeetings (calendar) {
    gapi.client.calendar.events.list({
      'calendarId': calendar,
      'timeMin': moment("09:00", "HH:mm").format(),
      'timeMax': ((moment("18:30", "HH:mm")).add(1, 'week').subtract(1, 'day')).format(),
      'showDeleted': false,
      'singleEvents': true,
      'orderBy': 'startTime'
    }).then(function(response) {

      var events = response.result.items;

    for (let i in events) {
      if (!events[i].start.dateTime) continue;
      let event = events[i],
          start = moment(event.start.dateTime),
          original_start = start.clone(),
          end = moment(event.end.dateTime),
          original_end = end.clone(),
          day = start.format('ddd');

      if (day == 'Sat' || day == 'Sun') continue;

      let ms = start.minute();
      if (ms !== 0 && ms !== 30) {
        if (ms > 30) {
          start.minute(30);
        } else if (ms < 30) {
          start.minute(00);
        }
      }

      let me = end.minute();
      if (me !== 0 && me !== 30) {
        if (me > 30) {
          end.minute(00);
          end.add(1, 'hour');
        } else if (me < 30) {
          end.minute(30);
        }
      }

      let start_time = start.format('HH:mm'),
          end_time = end.format('HH:mm');

      if(!times[start_time]) {
        continue;
      }

      let calendar = atob(event.htmlLink.substring(event.htmlLink.indexOf('?eid=') + 5)).split(' ')[1];

      let result = {
        start : original_start.format('HH:mm'),
        end : original_end.format('HH:mm'),
        name : event.summary,
        description : event.description,
        src : event.htmlLink,
        calendar
      };
      let entry = times[start_time].days[day];
      let busy = entry.busy;


      if (calendar !== gtm1 && calendar !== gtm2 && calendar !== gtm3) {
        busy = true;
      } else if (!entry.busy && entry.events.length !== 0){
        let e = entry.events,
            temp = [];
        for (let i in e) {
          temp.push(e[i].calendar);
        }
        if (temp.filter(onlyUnique).length > 2){
          busy = true;
        }
      }

      entry.events.push(result);
      entry.busy = busy;

      let cont = true,
          new_time = start.clone();

      while (cont) {
        new_time.add(30, 'minute');
        if (new_time.format() === end.format()) {
          cont = false;
        } else {
          time_format = new_time.format('HH:mm');
          let entry = times[time_format].days[day]
          entry.events.push(result);
          if (calendar !== gtm1 && calendar !== gtm2 && calendar !== gtm3) {
            entry.busy = true;
          } else if (!entry.busy && entry.events.length !== 0){
            let e = entry.events,
                temp = [];
            for (let i in e) {
              temp.push(e[i].calendar);
            }
            if (temp.filter(onlyUnique).length > 2){
              entry.busy = true;
            }
          }
        }
      }
    }

    run++;
    if (run === num_cals){
      content = {days, times};
      renderContent('#book', content);
      window['times'] = times;
      window['days'] = days;
    }
    });
  }
}

function listEvents (calendar, range){

  gapi.client.calendar.events.list({
    'calendarId': calendar,
    'timeMin': moment().format(),
    'timeMax': ((moment()).add(range, 'week').subtract(1, 'day')).format(),
    'showDeleted': false,
    'singleEvents': true,
    'orderBy': 'startTime'
  }).then(function(response) {
    var events = response.result.items;

    var today = moment();
    var today_f = today.format('DD/MM');

    var dates = {};

    for (var i = 0; i < (range * 7); i++) {
	   let a = today.clone().add((i), 'day');
	   let b = a.format('DD/MM');
	   dates[b] = {};
	   dates[b].events = dates[b].events || [];
       dates[b].day = dates[b].day || a.format('dddd');
    }

    for (var i in events) {
      if (events[i].start.dateTime) {
        var start = moment(events[i].start.dateTime);
      } else {
        continue;
      }
      let end = moment(events[i].end.dateTime),
          date = start.format('DD/MM'),
          st = start.format('HH:mm'),
          et = end.format('HH:mm');

      dates[date].events.push({
          st,
          et,
          name : events[i].summary
      });
    }

    for (let i in dates) {
        var r = [];
        let d = dates[i].events;
        if (d.length === 0) {
            r.push({
                t : 'All Day',
                f : true
            });
        } else {
            var ft = '09:00';
            for (let i in d) {
                var e = d[i];
                if (e.st !== ft){
                    let t = ft + ' - ' + e.st;
                    r.push({
                        t,
                        f : true
                    });
                }
                let t = e.st + ' - ' + e.et;
                r.push({
                    t,
                    f : false,
                    r : e.name
               });
               ft = e.et;
            }
            r.push({
                t : ft + ' - end of day',
                f: true
            })
        }

        dates[i].events = r;
    }

    window[dates] = dates;
    var context = {dates};

    renderContent('#check', context);

  });
}

function currentEvent() {
  zd.get(url_field).then(function(response){
    var url = response[url_field].split('|')[response[url_field].split('|').length-1],
        eid = url.substring(url.indexOf('=')+1);
        id = (atob(eid).split(' '))[0];

    gapi.client.calendar.events.get({
      calendarId : 'primary',
      eventId : id
    }).then(function(response) {
      var event = JSON.parse(response.body),
          name = event.summary,
          description = event.description,
          src = event.htmlLink,
          _moment = moment(event.start.dateTime);
          start = _moment.format('HH:mm'),
          end =  moment(event.end.dateTime).format('HH:mm'),
          day = _moment.format('ddd'),
          date = _moment.format('DD/MM')
          context = {name, description, src, start, end, day, date};

      renderContent('#current', context);
    })
  });
}

function addEvent (name, description, start, end, guests) {

  let attendees = [];
  guests = guests || [];

  for (let i in guests) {
    let email = guests[i];
    attendees.push({email});
  }

  gapi.client.calendar.events.insert({
    calendarId : 'primary',
    resource : {
      summary : name,
      description,
      start : {
        dateTime : start
      },
      end : {
        dateTime : end
      },
      attendees
    }
  }).then(function(r) {
    let response = JSON.parse(r.body),
        url = response.htmlLink;

    zd.get(url_field).then(function(response){
      let value = response[url_field],
          links = (value) ? (value + '|' + url) : url;

      zd.set(url_field, links).then(function(){
        $('#invite-modal').modal('hide');
        currentEvent();
      });
    });
  });
}

function handleEventAdd () {
  let name = $('#event-name').val(),
      description = $('#event-description').val(),
      start_time = $('#event-start').text(),
      end_time = $('#event-end').text(),
      start = moment($('#event-date').text() +' '+ start_time, "DD/MM HH:mm").format(),
      end = moment($('#event-date').text() +' '+ end_time, "DD/MM HH:mm").format(),
      day = $('#event-day').text();
      diff = moment(end_time, 'HH:mm').diff(moment(start_time, 'HH:mm'), 'minute'),
      gtm = {gtm1:true, gtm2:true, gtm3:true};

  let time = start_time;

  for (let i = 0; i < (diff/30); i++) {
    time = moment(time, 'HH:mm').add((i * 30), 'minute').format('HH:mm');
    let events = times[time].days[day].events;
    for (let j in events) {
      if (events[j].calendar === gtm1) gtm.gtm1 = false;
      if (events[j].calendar === gtm2) gtm.gtm2 = false;
      if (events[j].calendar === gtm3) gtm.gtm3 = false;
    }
  }

  let meeting_room;
  let available = (Object.keys(gtm)).some(function(v, i) {
    if(gtm[v]) {
      meeting_room = window[v];
      return true;
    }
  });

  if (!meeting_room){
    showErr('danger', 'No GTM!', 'No one GTM is available for these consecutive timeslots');
    return false;
  }

  let guests = $('#invites').tagsinput('items');
  guests.push(meeting_room);

  addEvent(name, description, start, end, guests);

 //showErr('danger', 'ERROR!', 'Error! Please');

  function showErr (type, title, message) {
    $('#main-body').prepend('<div class="alert alert-'+type+' alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><h4>'+title+'</h4><p>'+message+'</p></div>');
  }
}

function displayEvents(day, time) {
  var context = times[time].days[day],
      cals = {};
  cals[gtm1] = "GTM 1";
  cals[gtm2] = "GTM 2";
  cals[gtm3] = "GTM 3";

  for (let i in context.events) {
    let event = context.events[i],
        cal = event.calendar;

    event.calendar_name = (cals[cal]) ? cals[cal] : "Primary";
  }
  context.manyEvents = (context.events.length > 3);
  context.day = day;

  renderContent('#display', context);
}

function renderContent(target,data){
    var source = $(target).html();
    var template = Handlebars.compile(source);
    var html = template(data);
    $("#content").html(html);
  }

function menuStep (e) {
  var btn = $(e).attr('value');
  if (btn === 'back') {
    renderContent('#menu');
  }
  if (btn === 'book-back') {
    bookMeeting(['primary', gtm1, gtm2, gtm3]);
  }
  if (btn === 'check'){
    listEvents('primary', 2);
  }
  if (btn === 'current'){
    currentEvent();
  }
  if (btn === 'settings'){
    renderContent('#settings');
  }
  if (btn === 'book') {
    bookMeeting(['primary', gtm1, gtm2, gtm3]);
  }
}

zd.get('ticket').then(function(response){
  window.ticket_id = response.ticket.id;
});

Handlebars.registerHelper('ifnotfirst', function (index, options) {
   if(index !== 0 && index !== 1){
      return options.fn(this);
   } else {
      return options.inverse(this);
   }

});

jQuery.fn.extend({
    disable: function(state) {
        return this.each(function() {
            this.disabled = state;
        });
    }
});

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

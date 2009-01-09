
(function() {
  Date.localization = {en_US: {}}
  Date.locale = 'en_US'
  
  Date.localization.en_US = {
    days: $H({
      'Sun': 'Sunday',
      'Mon': 'Monday',
      'Tue': 'Tuesday',
      'Wed': 'Wednesday', 
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday'
    }),
    
    months:  $H({
      'Jan': 'January',
      'Feb': 'February',
      'Mar': 'March',
      'Apr': 'April',
      'May': 'May',
      'Jun': 'June',
      'Jul': 'July',
      'Aug': 'August',
      'Sep': 'September',
      'Oct': 'October',
      'Nov': 'November',
      'Dec': 'December'
    })
  };
  
  Date.extend({
    distanceOfTimeInWords: function(fromTime, toTime, includeTime) {
      var delta = parseInt((toTime.getTime() - fromTime.getTime()) / 1000);
      if (delta < 60) {
          return 'less than a minute ago';
      } else if (delta < 120) {
          return 'about a minute ago';
      } else if (delta < (45*60)) {
          return (parseInt(delta / 60)).toString() + ' minutes ago';
      } else if (delta < (120*60)) {
          return 'about an hour ago';
      } else if (delta < (24*60*60)) {
          return 'about ' + (parseInt(delta / 3600)).toString() + ' hours ago';
      } else if (delta < (48*60*60)) {
          return '1 day ago';
      } else {
        var days = (parseInt(delta / 86400)).toString();
        if (days > 5) {
          var fmt = '%B %d, %Y'
          if (includeTime) fmt += ' %I:%M %p'
          return fromTime.strftime(fmt)
        } else {
          return days + " days ago"
        }
      }
    }
  });
  
  Date.implement({
    strftime: function(format) {
      var day = this.getDay(), month = this.getMonth();
      var hours = this.getHours(), minutes = this.getMinutes();

      var pad = function(num) {
        var string = num.toString(10);
        return new Array((2 - string.length) + 1).join('0') + string
      };

      return format.replace(/\%([aAbBcdHImMpSwyY])/g, function(part) {
        switch(part[1]) {
          case 'a': return Date.localization[Date.locale].days.getKeys()[day]; break;
          case 'A': return Date.localization[Date.locale].days.getValues()[day]; break;
          case 'b': return Date.localization[Date.locale].months.getKeys()[day]; break;
          case 'B': return Date.localization[Date.locale].months.getValues()[day]; break;
          case 'c': return this.toString(); break;
          case 'd': return pad(this.getDate()); break;
          case 'H': return pad(hours); break;
          case 'I': return pad((hours + 12) % 12); break;
          case 'm': return pad(month + 1); break;
          case 'M': return pad(minutes); break;
          case 'p': return hours > 12 ? 'PM' : 'AM'; break;
          case 'S': return pad(this.getSeconds()); break;
          case 'w': return day; break;
          case 'y': return pad(this.getFullYear() % 100); break;
          case 'Y': return this.getFullYear().toString(); break;
        }
      })
    },

    timeAgoInWords: function(includeTime) {
      return Date.distanceOfTimeInWords(this, new Date(), includeTime);
    }    
  })
  
  Element.implement({
    relatizeDate: function(includeTime) {
      return this.set('html', new Date(this.get('title') || this.get('text')).timeAgoInWords(includeTime))
    }
  })
  
})();


window.addEvent('domready', function() {
  $$('abbr.relative-datetime').each(function(el) {
    el.relatizeDate()
  })
})
//ruby helper example:

//def relative_datetime(datetime, cls = "relative-datetime")
//  s = datetime.strftime("%a %b %d %H:%M:%S %z %Y")
//  %{<abbr title="#{s}" class="#{cls}">#{s}</abbr>}
//end
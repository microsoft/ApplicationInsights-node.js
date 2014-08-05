var Cookies = require('cookies');
var uuid = require('node-uuid');

class Util {
    
    /**
    * used by localDate and getDuration; adds zeros where necessary to ensure correct number of digits
    */
    public static pad(num: number): string {
        var newNum = Math.abs(Math.floor(num));
        return (newNum < 10 ? '0' : '') + newNum;
    }

    /**
    * used by localDate and getDuration; adds zeros where necessary to ensure correct number of digits
    */
    public static milliPad(num: number): string {
        var str = "" + num;
        while (str.length < 3) {
            str = "0" + str;
        }
        return str;
    }

    /**
    * returns date in I.S.O. format with timezone offset
    */
    public static localDate(local: Date): string {
        var offset = -local.getTimezoneOffset();
        var sign = offset >= 0 ? '+' : '-';
        return local.getFullYear()
            + '-' + this.pad(local.getMonth() + 1)
            + '-' + this.pad(local.getDate())
            + 'T' + this.pad(local.getHours())
            + ':' + this.pad(local.getMinutes())
            + ':' + this.pad(local.getSeconds())
            + '.' + this.milliPad(local.getMilliseconds())
            + sign + this.pad(offset / 60)
            + ':' + this.pad(offset % 60);
    }

    /**
    * time elapsed between request received and response sent in 00:00:00.000 format
    */
    public static getDuration(startTime, endTime) {
        var duration = endTime - startTime;
        var hours = Math.floor(duration / 3600000);
        duration -= hours * 3600000;
        var mins = Math.floor(duration / 60000);
        duration -= mins * 60000;
        var secs = Math.floor(duration / 1000);
        duration -= secs * 1000;
        var msecs = duration;
        return this.pad(hours) + ":" + this.pad(mins) + ":" + this.pad(secs) + "." + this.milliPad(msecs);
    }
    
    /**
    * called by UserContext constructor
    * returns ai_user cookie if one exists, creates new cookie otherwise and returns guid
    */
    public static getUserId(request, response): string {
        var cookies = new Cookies(request, response);
        var userId = '';
        var userCookie = cookies.get('ai_user');
        if (!userCookie) {
            userId = uuid.v4();
            var value = 'id:' + userId + '|acq:' + this.localDate(new Date());
            cookies.set('ai_user', value);
        } else {
            userId = userCookie.substring(userCookie.indexOf(':'), userCookie.indexOf('|'));
        }
        return userId;
    }
    
    /**
    * called by SessionContext constructor
    * returns ai_session cookie and updates acces time if one exists and has not timed out
    * other wise creates new cookie and returns guid
    */
    public static getSessionId(request, response): string {
        var cookies = new Cookies(request, response);
        var sessionId = '';
        var value = '';
        var curDate = new Date();
        var sessionCookie = cookies.get('ai_session');
        if (!sessionCookie) {
            sessionId = uuid.v4();
            value = 'id:' + sessionId + '|acq:' + this.localDate(curDate) + '|acq:' + new Date().getTime();
        } else {
            sessionId = sessionCookie.substring(sessionCookie.indexOf(':'), sessionCookie.indexOf('|'));
            var renewDate = sessionCookie.substring(sessionCookie.indexOf(':', sessionCookie.indexOf('acq:')+4), sessionCookie.length);
            if (curDate.getTime() - renewDate > 1800000) {
                sessionId = uuid.v4();
                value = 'id:' + sessionId + '|acq:' + this.localDate(curDate) + '|acq:' + curDate.getTime();
            } else {
                var acqDate = sessionCookie.substring(sessionCookie.indexOf('acq:') + 3, sessionCookie.indexOf('|', sessionCookie.indexOf('acq:') + 3));
                value = 'id:' + sessionId + '|acq:' + acqDate + '|acq:' + curDate.getTime();
            }
        }
        cookies.set('ai_session', value);
        return sessionId;
    }
}

module.exports = Util;
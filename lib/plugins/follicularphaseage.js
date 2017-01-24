'use strict';

var _ = require('lodash');
var moment = require('moment');
var levels = require('../levels');

function init(ctx) {
  var translate = ctx.language.translate;

  var fage = {
    name: 'fage'
    , label: 'Follicular Phase Age'
    , pluginType: 'pill-minor'
  };
  
  fage.getPrefs = function getPrefs(sbx) {		
    // FAGE_INFO=19 FAGE_WARN=20 FAGE_URGENT=30 in days		
    return {		
      info: sbx.extendedSettings.info || 19		
      , warn: sbx.extendedSettings.warn || 20		
      , urgent: sbx.extendedSettings.urgent || 30		
      , enableAlerts: sbx.extendedSettings.enableAlerts || false		
    };		
  };

  fage.setProperties = function setProperties (sbx) {
    sbx.offerProperty('fage', function setProp ( ) {
      return fage.findLatestTimeChange(sbx);
    });
  };
  
  fage.checkNotifications = function checkNotifications(sbx) {		
    var follicularPhaseInfo = sbx.properties.fage;		
 		
    if (follicularPhaseInfo.notification) {		
      var notification = _.extend({}, follicularPhaseInfo.notification, {		
        plugin: fage		
        , debug: {		
          age: follicularPhaseInfo.age		
        }		
      });		
 		
      sbx.notifications.requestNotify(notification);		
    }		
  };

  fage.findLatestTimeChange = function findLatestTimeChange(sbx) {

    var follicularPhaseInfo = {
      found: false
      , age: 0
      , treatmentDate: null
    };

    var prevDate = 0;

    _.each(sbx.data.follicularPhaseTreatments, function eachTreatment (treatment) {
      var treatmentDate = treatment.mills;
      if (treatmentDate > prevDate && treatmentDate <= sbx.time) {

        prevDate = treatmentDate;
        follicularPhaseInfo.treatmentDate = treatmentDate;

        var a = moment(sbx.time);
        var b = moment(follicularPhaseInfo.treatmentDate);
        var days = a.diff(b,'days');
        var age = days;

        if (!follicularPhaseInfo.found || (age >= 0 && age < follicularPhaseInfo.age)) {
          follicularPhaseInfo.found = true;
          follicularPhaseInfo.age = age;
          follicularPhaseInfo.days = days;
          follicularPhaseInfo.notes = treatment.notes;
          follicularPhaseInfo.minFractions = a.diff(b,'minutes') - age * 60;

          follicularPhaseInfo.display = follicularPhaseInfo.days + 'd';          
        }
      }
    });

    var prefs = fage.getPrefs(sbx);		

    follicularPhaseInfo.level = levels.NONE;		

    var sound = 'incoming';		
    var message;		
    var sendNotification = false;		

    if (follicularPhaseInfo.age >= prefs.urgent) {		
      sendNotification = follicularPhaseInfo.age === prefs.urgent;		
      message = translate('Follicular Phase starting soon');		
      sound = 'persistent';		
      follicularPhaseInfo.level = levels.URGENT;		
    } else if (follicularPhaseInfo.age >= prefs.warn) {		
      sendNotification = follicularPhaseInfo.age === prefs.warn;		
      message = translate('Follicular Phase starting soon');		
      follicularPhaseInfo.level = levels.WARN;		
    } else  if (follicularPhaseInfo.age >= prefs.info) {		
      sendNotification = follicularPhaseInfo.age === prefs.info;		
      message = translate('Follicular Phase starting soon');		
      follicularPhaseInfo.level = levels.INFO;		
    }

    //allow for 20 minute period after a full hour during which we'll alert the user		
    if (prefs.enableAlerts && sendNotification && follicularPhaseInfo.minFractions <= 20) {		
      follicularPhaseInfo.notification = {		
        title: translate('Follicular Phase last started %1 days ago', { params: [follicularPhaseInfo.age / 24] })		
        , message: message		
        , pushoverSound: sound		
        , level: follicularPhaseInfo.level		
        , group: 'FAGE'		
      };		
    }
    
    return follicularPhaseInfo;
  };

  fage.updateVisualisation = function updateVisualisation (sbx) {

    var follicularPhaseInfo = sbx.properties.fage;

    var info = [{ label: translate('Changed'), value: new Date(follicularPhaseInfo.treatmentDate).toLocaleString() }];
    if (!_.isEmpty(follicularPhaseInfo.notes)) {
      info.push({label: translate('Notes:'), value: follicularPhaseInfo.notes});
    }

    var statusClass = null;
    if (follicularPhaseInfo.level === levels.URGENT) {		
      statusClass = 'urgent';		
    } else if (follicularPhaseInfo.level === levels.WARN) {		
      statusClass = 'warn';		
    }
    sbx.pluginBase.updatePillText(fage, {
      value: follicularPhaseInfo.display
      , label: translate('FAGE')
      , info: info
      , pillClass: statusClass
    });
  };

  return fage;
}

module.exports = init;


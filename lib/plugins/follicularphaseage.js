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

  fage.setProperties = function setProperties (sbx) {
    sbx.offerProperty('fage', function setProp ( ) {
      return fage.findLatestTimeChange(sbx);
    });
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
        var hours = a.diff(b,'hours') - days * 24;
        var age = a.diff(b,'hours');

        if (!follicularPhaseInfo.found || (age >= 0 && age < follicularPhaseInfo.age)) {
          follicularPhaseInfo.found = true;
          follicularPhaseInfo.age = age;
          follicularPhaseInfo.days = days;
          follicularPhaseInfo.hours = hours;
          follicularPhaseInfo.notes = treatment.notes;
          follicularPhaseInfo.minFractions = a.diff(b,'minutes') - age * 60;

          follicularPhaseInfo.display = '';
          if (follicularPhaseInfo.age >= 24) {
            follicularPhaseInfo.display += follicularPhaseInfo.days + 'd';
          }
          follicularPhaseInfo.display += follicularPhaseInfo.hours + 'h';
        }
      }
    });

    return follicularPhaseInfo;
  };

  fage.updateVisualisation = function updateVisualisation (sbx) {

    var follicularPhaseInfo = sbx.properties.fage;

    var info = [{ label: translate('Changed'), value: new Date(follicularPhaseInfo.treatmentDate).toLocaleString() }];
    if (!_.isEmpty(follicularPhaseInfo.notes)) {
      info.push({label: translate('Notes:'), value: follicularPhaseInfo.notes});
    }

    var statusClass = null;
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


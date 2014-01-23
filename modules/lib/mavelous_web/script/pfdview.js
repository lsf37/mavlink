goog.provide('Mavelous.PFDView');

goog.require('Mavelous.PFD');
goog.require('Mavelous.PFDSettingsModel');


/**
 * Primary flight display Backbone view.
 * @param {Object} properties The view properties.
 * @constructor
 * @extends {Backbone.View}
 */
Mavelous.PFDView = function(properties) {
  this.pfd = null;
  this.settingToDimension = {};
  goog.base(this, properties);
};
goog.inherits(Mavelous.PFDView, Backbone.View);


/**
 * @override
 * @export
 */
Mavelous.PFDView.prototype.initialize = function() {
  this.blockel = this.options['blockel'];
  this.statel = this.options['statel'];
  this.pfdel = $('#' + this.options['drawingid']);

  var mavlinkSrc = this.options['mavlinkSrc'];
  // Too bad backbone doesn't pass the model to event handlers; we
  // wouldn't need to keep these handles to models.
  this.attitude = mavlinkSrc.subscribe('ATTITUDE',
                                       this.onAttitudeChange, this);
  this.vfrHud = mavlinkSrc.subscribe('VFR_HUD',
                                     this.onVfrHudChange, this);
  this.navLaw = mavlinkSrc.subscribe(
      'SMACCMPILOT_NAV_CMD', this.onNavLaw, this);

  /* Create pfd object */

  this.pfdcanvas = document.getElementById(this.options['drawingid']);
  paper.setup(this.pfdcanvas);
  this.pfd = new Mavelous.PFD(new paper.Point(0,0),
                   this.pfdcanvas.width, this.pfdcanvas.height);
  this.pfd.airspeed.setTarget('');
  /* Connect to settings model */
  if (this.options['settingsModel']) {
    this.settingsModel = this.options['settingsModel'];
    this.settingToDimension[Mavelous.PFDSettingsModel.Size.STANDARD] = {
      'height': function() { return '280px'; },
      'width': function() { return '400px'; }
    };
    this.settingToDimension[Mavelous.PFDSettingsModel.Size.FULLSCREEN] = {
      'height': function() { return $(window).height() - 120; },
      'width': function() { return $(window).width();}
    };
    this.settingToDimension[Mavelous.PFDSettingsModel.Size.SMALL] = {
      'height': function() { return '140px'; },
      'width': function() { return '200px'; }
    };
    this.settingsModel.bind('change', this.onSettingsChange, this);
    this.onSettingsChange();
  }

  /* Set off each callback to initialize view */
  this.onAttitudeChange();
  this.onVfrHudChange();
  this.onNavLaw();
};


/**
 * Handles ATTITUDE mavlink messages.
 */
Mavelous.PFDView.prototype.onAttitudeChange = function() {
  var p = this.attitude.get('pitch') || 0;
  var r = this.attitude.get('roll') || 0;
  this.pfd.horizon.setPitchRoll(p,r);
  this.pfd.draw();
};


/**
 * Handles VFR_HUD mavlink messages.
 */
Mavelous.PFDView.prototype.onVfrHudChange = function() {
  var alt = this.vfrHud.get('alt');
  if (alt === undefined) {
    this.pfd.altitude.setIndicated('');
  } else {
    this.pfd.altitude.setIndicated(alt.toFixed(1));
  }
  var airSpeed = this.vfrHud.get('airspeed');
  if (airSpeed === undefined) {
    this.pfd.airspeed.setIndicated('');
  } else {
    this.pfd.airspeed.setIndicated(airSpeed);
  };

  var heading = this.vfrHud.get('heading');
  if (heading=== undefined) {
    this.pfd.heading.setIndicated('');
  } else {
    if (heading < 0) { heading = 360 + heading; }
    this.pfd.heading.setIndicated(heading.toFixed(0));
  };
  this.pfd.draw();
};


/**
 * Handles NAV_CONTROLLER_OUTPUT mavlink messages.
 */
Mavelous.PFDView.prototype.onNavLaw = function() {

  var alt_set_valid = this.navLaw.get('alt_set_valid') || 0;
  var alt_setpt = this.navLaw.get('alt_set');

  if (alt_set_valid > 0 && alt_setpt) {
    alt = alt_setpt / 1000.0;
    this.pfd.altitude.setTarget(alt.toFixed(1));
  } else {
    this.pfd.altitude.setTarget('');
  }

  var heading_set_valid = this.navLaw.get('heading_set_valid') || 0;
  var heading_setpt = this.navLaw.get('heading_set');

  if (heading_set_valid > 0 && heading_setpt) {
    head = heading_setpt / 100.0;
    this.pfd.heading.setTarget(head.toFixed(0));
  } else {
    this.pfd.heading.setTarget('');
  }
};


/**
 * Handles changes to the settings model.
 */
Mavelous.PFDView.prototype.onSettingsChange = function() {
  var settings = this.settingsModel.toJSON();
  this.setPosition(settings['position']);
  this.setSize(settings['size']);
};


/**
 * Changes the position of the PFD.
 *
 * @param {Mavelous.PFDSettingsModel.Position} position The desired position.
 */
Mavelous.PFDView.prototype.setPosition = function(position) {
  this.blockel.removeClass('pfd-top pfd-bottom pfd-left pfd-right');
  switch (position) {
    case Mavelous.PFDSettingsModel.Position.TOPLEFT:
      this.blockel.addClass('pfd-top pfd-left');
      break;
    case Mavelous.PFDSettingsModel.Position.TOPRIGHT:
      this.blockel.addClass('pfd-top pfd-right');
      break;
    case Mavelous.PFDSettingsModel.Position.BOTTOMLEFT:
      this.blockel.addClass('pfd-bottom pfd-left');
      break;
    case Mavelous.PFDSettingsModel.Position.BOTTOMRIGHT:
      this.blockel.addClass('pfd-bottom pfd-right');
      break;
  }
};


/**
 * Changes the size of the PFD.
 *
 * @param {Mavelous.PFDSettingsModel.Size} size The desired size.
 */
Mavelous.PFDView.prototype.setSize = function(size) {
  goog.asserts.assert(
      goog.object.containsValue(Mavelous.PFDSettingsModel.Size, size),
      'unknown PFD size value: ' + size);
  var block = this.blockel;
  if (size == Mavelous.PFDSettingsModel.Size.FULLSCREEN) {
    $('#droneicon').addClass('droneicon-hide');
  } else if ($('#droneicon').hasClass('droneicon-hide')) {
    $('#droneicon').removeClass('droneicon-hide');
  }

  if (size == Mavelous.PFDSettingsModel.Size.HIDDEN) {
    this.pfd.setVisible(false);
    block.hide();
  } else {
    /* Take care of show if hidden */
    if (block.is(':hidden')) {
      this.pfd.setVisible(true);
      block.show();
    }

    /* Set element sizes by css class. */
    var dim = this.settingToDimension[size];
    var w = dim.width();
    var h = dim.height();
    this.pfdel.width(w)
      .height(h);
    this.blockel.width(w);
    this.statel.width(w);
  }
};

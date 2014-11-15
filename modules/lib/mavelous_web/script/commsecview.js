goog.provide('Mavelous.CommsecView');

goog.require('Mavelous.util');



/**
 * Displays the vehicle armed/disarmed mode.
 * @param {Object} properties The view properties.
 * @constructor
 * @extends {Backbone.View}
 */
Mavelous.CommsecView= function(properties) {
  goog.base(this, properties);
};
goog.inherits(Mavelous.CommsecView, Backbone.View);


/**
 * @override
 * @export
 */
Mavelous.CommsecView.prototype.initialize = function() {
  var mavlinkSrc = this.options['mavlinkSrc'];
  this.$el = this.options['el'];
  this.$el.html('<span id="pfd_commsec_hb"></span> <br />' +
                '<span id="pfd_commsec_stat"></span>');


  this.$hb   = $('#pfd_commsec_hb');
  this.$stat = $('#pfd_commsec_stat');

  this.hb  = mavlinkSrc.subscribe('HEARTBEAT',
                                        this.onHeartbeat, this);
  this.msg = mavlinkSrc.subscribe('VEH_COMMSEC',
                                        this.onMsg, this);
};


/**
 * Handles HEARTBEAT messages.
 */
Mavelous.CommsecView.prototype.onHeartbeat = function() {
  var custom_mode = this.hb.get('custom_mode');
  var mode_dict = Mavelous.util.smaccmpilot.custom_mode(custom_mode);
//  this.$hb.html('Commsec: ' + mode_dict['commsec_stat'])
};
/**
 * Handles VEH_COMMSEC messages.
 */
Mavelous.CommsecView.prototype.onMsg = function() {
  var m = this.msg.toJSON();
  var all = parseInt(m.good_msgs) + parseInt(m.bad_msgs);
  var s = 'GCS messages: ' + all + '/' + m.bad_msgs + '<br />';
	
/*
  if (m.time > 500 || m.commsec_err > 0) {
    var errcode = (m.commsec_err == 0)?'<span class="ok">ok</span>':
      '<span class="error">' + m.commsec_err.toString() + '</span>';
    s += 'last good msg: ' + (m.time / 1000.0).toFixed(1) + 's ago<br />' +
         'error code: ' + errcode;
  }
*/

  this.$stat.html(s);
};

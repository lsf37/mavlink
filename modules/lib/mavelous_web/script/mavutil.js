goog.provide('Mavelous.util');

goog.require('goog.object');


/**
 * Contains static methods for utility functions on heartbeat mavlink
 * messages.
 */
Mavelous.util.heartbeat = {};


/**
 * Bitfields for base_mode.
 * @enum {number}
 */
Mavelous.util.MavModeFlag = {
  CUSTOM_MODE_ENABLED: 1,
  TEST_ENABLED: 2,
  AUTO_ENABLED: 4,
  GUIDED_ENABLED: 8,
  STABILIZE_ENABLED: 16,
  HIL_ENABLED: 32,
  MANUAL_INPUT_ENABLED: 64,
  SAFETY_ARMED: 128
};


/**
 * Vehicle types
 * @enum {number}
 */

Mavelous.util.MavType = {
  FIXED_WING: 1,
  QUADROTOR: 2
};


/**
 * ArduPlane flight modes.
 * @type {Object.<number, string>}
 */
Mavelous.util.ArduPlaneFlightModes = {
  0: 'MANUAL',
  1: 'CIRCLE',
  2: 'STABILIZE',
  5: 'FBWA',
  6: 'FBWB',
  7: 'FBWC',
  10: 'AUTO',
  11: 'RTL',
  12: 'LOITER',
  13: 'TAKEOFF',
  14: 'LAND',
  15: 'GUIDED',
  16: 'INITIALIZING'
};


/**
 * ArduCopter flight modes
 * @type {Object.<number, string>}
 */
Mavelous.util.ArduCopterFlightModes = {
  0: 'STABILIZE',
  1: 'ACRO',
  2: 'ALT_HOLD',
  3: 'AUTO',
  4: 'GUIDED',
  5: 'LOITER',
  6: 'RTL',
  7: 'CIRCLE',
  8: 'POSITION',
  9: 'LAND',
  10: 'OF_LOITER',
  11: 'APPROACH'
};


/**
 * Returns the vehicle type name.
 *
 * @param {Mavelous.MavlinkMessage} msg A heartbeat message.
 * @return {string} The type of vehicle: "ArduCopter", "ArduPlane" or
 *     "unknown".
 *
 */
Mavelous.util.heartbeat.mavtype = function(msg) {
  var type = msg.get('type');
  if (type == Mavelous.util.MavType.QUADROTOR)
    return 'ArduCopter';
  if (type == Mavelous.util.MavType.FIXED_WING)
    return 'ArduPlane';
  return 'unknown';
};


Mavelous.util.heartbeat.mode_display = function(msg) {
  if (msg.get('autopilot') == 13) {
    return Mavelous.util.smaccmpilot.mode_display(msg);
  } else {
    return Mavelous.util.heartbeat.modestring(msg);
  }
};

/**
 * Returns the name of the vehicle flight mode.
 * @param {Mavelous.MavlinkMessage} msg A heartbeat message.
 * @return {string} The name of the flight mode.
 */
Mavelous.util.heartbeat.modestring = function(msg) {
  var base_mode = msg.get('base_mode');
  var type = msg.get('type');
  var custom_mode = msg.get('custom_mode');

  if (base_mode === null || type === null || custom_mode === null) {
    return 'badmode';
  }

  if (msg.get('autopilot') == 13) {
    return Mavelous.util.smaccmpilot.modestring(msg);
  }

  if (!base_mode & Mavelous.util.MavModeFlag.CUSTOM_MODE_ENABLED) {
    return ('BaseMode(' + base_mode + ')');
  } else if (type == Mavelous.util.MavType.QUADROTOR &&
             goog.object.containsKey(Mavelous.util.ArduCopterFlightModes,
                                     custom_mode)) {
    return Mavelous.util.ArduCopterFlightModes[custom_mode];
  } else if (type == Mavelous.util.MavType.FIXED_WING &&
             goog.object.containsKey(Mavelous.util.ArduPlaneFlightModes,
                                     custom_mode)) {
    return Mavelous.util.ArduPlaneFlightModes[custom_mode];
  }
  return ('CustomMode(' + custom_mode + ')');
};


/**
 * Checks whether the vehicle is armed.
 *
 * @param {Mavelous.MavlinkMessage} msg A heartbeat message.
 * @return {?boolean} True if the vehicle is armed.
 */
Mavelous.util.heartbeat.armed = function(msg) {
  var base_mode = msg.get('base_mode');
  if (base_mode === null) {
    return null;
  }
  if (base_mode & Mavelous.util.MavModeFlag.SAFETY_ARMED) {
    return true;
  }
  return false;
};


Mavelous.util.smaccmpilot = {};
Mavelous.util.smaccmpilot.mode_display = function(msg) {
  var custom_mode = msg.get('custom_mode');
  var mode_dict = Mavelous.util.smaccmpilot.custom_mode(custom_mode);
  return (
//    'Motors: ' + mode_dict['armed_mode'] + '<br />' +
//    'UI: '  + mode_dict['ui_source'] + '<br />' +
    'Thr: ' + mode_dict['thr_mode']  + ' ' + mode_dict['autothr_src'] + '<br />' +
    'Stab: '  + mode_dict['stab_src'] + '<br />' +
    'Yaw: ' + mode_dict['head_src'] + ' ' + mode_dict['yaw_mode'] 
    )

  return JSON.stringify(mode_dict);
};

Mavelous.util.smaccmpilot.modestring = function(msg) {
  var custom_mode = msg.get('custom_mode');
  var mode_dict = Mavelous.util.smaccmpilot.custom_mode(custom_mode);
  return "smaccmpilot custom mode";
};

Mavelous.util.smaccmpilot.custom_mode = function (custom_mode) {
  var armed_field =     (custom_mode & 0x03) >> 0;
  var ui_source_field = (custom_mode & 0x04) >> 2;
  var thr_mode_field = (custom_mode & 0x08) >> 3;
  var athr_src_field = (custom_mode & 0x10) >> 4;
  var stab_src_field = (custom_mode & 0x20) >> 5;
  var head_src_field = (custom_mode & 0x40) >> 6;
  var yaw_mode_field = (custom_mode & 0x80) >> 7;
  var commsec_stat_field = (custom_mode & 0x100) >> 8;

  var green = function (text) {
    return ('<span class="ok">' + text + '</span>')
  };
  var yellow = function (text) {
    return ('<span class="slow">' + text + '</span>')
  };
  var red = function (text) {
    return ('<span class="error">' + text + '</span>')
  };

  return { 'armed_mode': (armed_field == 0 ? yellow('safe'):
                          (armed_field == 1 ? yellow('disarmed'): green('armed')))
         , 'ui_source': (ui_source_field == 0 ? green('ppm') : yellow('mavlink'))
         , 'yaw_mode':  (yaw_mode_field == 0 ? 'rate' : 'heading')
         , 'thr_mode':  (thr_mode_field == 0 ? 'direct' : 'autothrottle')
         , 'autothr_src': (athr_src_field == 0 ? green('ui') : yellow('nav'))
         , 'stab_src': (stab_src_field == 0 ? green('ui'): yellow('nav'))
         , 'head_src': (head_src_field == 0 ? green('ui') : yellow('nav'))
         , 'commsec_stat' : (commsec_stat_field == 0 ? green('ok') : red('alarm'))
         };
};


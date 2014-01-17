#!/usr/bin/env python
'''joystick interface module

Contributed by AndrewF:
  http://diydrones.com/profile/AndrewF

Modified by Lee Pike <leepike@galois.com> for SMACCMPilot

'''

import pygame, fnmatch
from time import sleep

mpstate = None

class module_state(object):
    def __init__(self):
        self.js = None

'''
A map of joystick identifiers to channels and scalings, as well as a single
deadman button.  Each joystick type can control 8 channels, each channel is
defined by its axis number, the multiplier and the additive offset.
'''

class Axis:
    def __init__(self,axis,scale,offs):
        self.axis = axis
        self.scale = scale
        self.offs = offs
    def value(self, js):
        v = js.get_axis(self.axis)
        i = int(v*self.scale + self.offs)
        return max(min(i,2000),1000)

def PosAxis(axis, sens):
    return Axis(axis,500 * sens,1500)

def NegAxis(axis, sens):
    return Axis(axis,-500 * sens,1500)

class Button:
    def __init__(self,channel):
        self.channel = channel
    def value(self,js):
        return js.get_button(self.channel)

class HatButton:
    def __init__(self,hat,axis,sign):
        self.hat = hat
        self.axis = axis
        self.sign = sign
    def value(self, js):
        (x,y) = js.get_hat(self.hat)
        if self.axis == 1:
            return (self.sign == x)
        else:
            return (self.sign == y)

class JoystickDescr:
    def __init__(self,descr,**args):
        self.descr = descr
        try:
            self.roll_axis    = args['roll_axis']
            self.pitch_axis   = args['pitch_axis']
            self.thr_axis     = args['thr_axis']
            self.yaw_axis     = args['yaw_axis']
            self.rcovr_button = args['rcovr_button']
            self.up_button    = args['up_button']
            self.down_button  = args['down_button']
            self.left_button  = args['left_button']
            self.right_button = args['right_button']
        except KeyError as e:
            # raise a "type" error, lol
            raise TypeError ("JoystickDescr constructor missing required named arg " + e.message)
        self.stop_button = args.get('stop_button')
        self.clear_button = args.get('clear_button')

joystick_descrs = [
    # Logitech Wireless F710 (recognized as a RumblePad 2 on Fedora by jstest).
    # Assumes D mode. 4 axes usable
    JoystickDescr('Logitech Logitech Cordless RumblePad 2'
        , roll_axis = PosAxis(2, 0.5)
        , pitch_axis = NegAxis(3, 0.5)
        , thr_axis = NegAxis(1, 0.25)
        , yaw_axis = PosAxis(0, 0.5)
        , rcovr_button = Button(4)
        , up_button = HatButton(0,0,1)
        , down_button = HatButton(0,0,-1)
        , left_button = HatButton(0,1,-1)
        , right_button = HatButton(0,1,1)
        , stop_button = Button(1)
        , clear_button = Button(2)
        )
    # Logitech Wireless F310, X mode. 4 axes usable
    , JoystickDescr('Generic X-Box pad'
        , roll_axis = PosAxis(3, 0.5)
        , pitch_axis = NegAxis(4, 0.5)
        , thr_axis = NegAxis(1, 0.25)
        , yaw_axis = PosAxis(0, 0.5)
        , rcovr_button = Button(4)
        , up_button = HatButton(0,0,1)
        , down_button = HatButton(0,0,-1)
        , left_button = HatButton(0,1,-1)
        , right_button = HatButton(0,1,1)
        , stop_button = Button(0)
        , clear_button = Button(1)
        )
    ]

joymap = {
    'CarolBox USB*':
    # http://www.hobbyking.com/hobbyking/store/__13597__USB_Simulator_Cable_XTR_AeroFly_FMS.html
    # has 6 usable axes. This assumes mode 1
    ( [(3, 500, 1500),
       (0, 500, 1500),
       (1, 700, 1500),
       (4, 500, 1500),
       (5, 500, 1500),
       None,
       (2, 500, 1500),
       (5, 500, 1500)]
    , None),

    'Sony PLAYSTATION(R)3 Controller':
    # only 4 axes usable. This assumes mode 1
    ( [(2, 500,  1500),
       (1, -500,  1500),
       (3, -500, 1000),
       (0, -500,  1500)]
    , None),

    'GREAT PLANES InterLink Elite':
    # 4 axes usable
    ( [(0, 500,  1500),
       (1, -500,  1500),
       (2, -1000, 1500),
       (4, -500,  1500),
       None,
       None,
       None,
       (3, 500,  1500)]
    , None),

    'Great Planes GP Controller':
    # 4 axes usable
    ( [(0, 500,  1500),
       (1, -500,  1500),
       (2, -1000, 1500),
       (4, -500,  1500),
       None,
       None,
       None,
       (3, 500,  1500)]
    , None),

    'Logitech Logitech Cordless RumblePad 2':
    # Logitech Wireless F710 (recognized as a RumblePad 2 on Fedora by jstest).
    # Assumes D mode. 4 axes usable
    ( [(2,  500, 1500),  # roll
       (3, -500, 1500),  # pitch
       (1, -500, 1500),  # throttle
       (0,  500, 1500),  # yaw
       None,
       None]
    , 4),

    'Generic X-Box pad':
    # Logitech Wireless F310, X mode. 4 axes usable
    ( [(3,  500, 1500),  # roll
       (4, -500, 1500),  # pitch
       (1, -500, 1500),  # throttle
       (0,  500, 1500),  # yaw
       None,
       None]
    , 4)
}

def idle_task():
    '''called in idle time'''
    state = mpstate.joystick_state
    if state.js is None:
        return
    if state.jdescr is None:
        return
    j = state.jdescr
    for e in pygame.event.get(): # iterate over event stack
        override = mpstate.status.override[:]
        override[0] = j.roll_axis.value(state.js)
        override[1] = j.pitch_axis.value(state.js)
        override[2] = j.thr_axis.value(state.js)
        override[3] = j.yaw_axis.value(state.js)
        if j.rcovr_button.value(state.js):
            mpstate.status.joystick_inputs = True
            override[4] = 2000
        else:
            override[4] = 1000
        u = j.up_button.value(state.js)
        d = j.down_button.value(state.js)
        l = j.left_button.value(state.js)
        r = j.right_button.value(state.js)

        mpstate.smaccm_nav.udlr(u,d,l,r)
        if j.stop_button:
            mpstate.smaccm_nav.stop(j.stop_button.value(state.js))
        if j.clear_button:
            mpstate.smaccm_nav.clear(j.clear_button.value(state.js))

        if override != mpstate.status.override:
            mpstate.status.override = override
            # Do it at a periodic rate.
            # mpstate.override_period.force()

def name():
    '''return module name'''
    return "joystick"

def description():
    '''return module description'''
    return "joystick aircraft control"

def mavlink_packet(pkt):
    pass

def unload():
    '''unload module'''
    pass

def init(_mpstate):
    '''initialise module'''
    global mpstate
    mpstate = _mpstate
    state = module_state()
    mpstate.joystick_state = state

    #initialize joystick, if available
    pygame.init()
    pygame.joystick.init() # main joystick device system

    for i in range(pygame.joystick.get_count()):
        print("Trying joystick %u" % i)
        try:
            j = pygame.joystick.Joystick(i)
            j.init() # init instance
            name = j.get_name()
            print 'joystick found: ' + name
            for jd in joystick_descrs:
                if fnmatch.fnmatch(name, jd.descr):
                    print "Matched type '%s'" % jd.descr
                    print '%u axes available' % j.get_numaxes()
                    print '%u buttons available' % j.get_numbuttons()
                    state.js = j
                    state.num_axes = j.get_numaxes()
                    state.num_buttons = j.get_numbuttons()
                    state.jdescr = jd
                    break
        except pygame.error:
            continue

if __name__ == "__main__":

    class dummy(object):
        def __init__(self):
            pass
    d = dummy()
    init(d)


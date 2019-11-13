/**
 * Led module - For controlling LED's
 * @module j5e/led
 */

import {normalizeParams, constrain, getProvider, timer} from "../util/fn.js";

/** 
 * Class representing an LED
 * @classdesc The Led class allows for control of LED's
 */
class Led {
  
  #state = {
    sink: false, 
    isRunning: false,
    value: 0,
    direction: 1,
    mode: null,
    interval: null
  };

  /**
   * Instantiate an LED
   * @param {(number|string|object)} io - A pin number, pin identifier or a complete IO options object
   * @param {(number|string)} [io.pin] - If passing an object, a pin number or pin identifier
   * @param {(string|constructor)} [io.io=builtin/digital] - If passing an object, a string specifying a path to the IO provider or a constructor
   * @param {object} [device={}] - An object containing device options
   * @param {boolean} [device.sink=false] - True if the device is wired for sink drive
   */
  constructor(io, device) {
    return (async () => {
      const {ioOpts, deviceOpts} = normalizeParams(io, device);

      const Provider = await getProvider(ioOpts, "builtin/digital");
      
      this.io = new Provider({
        pin: ioOpts.pin,
        mode: Provider.Output
      });
      
      this.LOW = 0;

      Object.defineProperties(this, {
        value: {
          get: function() {
            return this.#state.value;
          }
        },
        mode: {
          get: function() {
            return this.#state.mode;
          }
        },
        isOn: {
          get: function() {
            return !!this.#state.value;
          }
        },
        isRunning: {
          get: function() {
            return this.#state.isRunning;
          }
        }
      });

      if (device.sink) {
        this.#state.sink = true;
      }
      
      if (this.io.resolution) {
        this.HIGH = (1 << this.io.resolution) -1;
      } else {
        this.HIGH = 1;
      }
      
      return this;
    })();
  }

  /**
   * Internal method that writes the current LED value to the IO
   */
  write() {
    let value = constrain(this.#state.value, this.LOW, this.HIGH);

    if (this.#state.sink) {
      value = this.HIGH - value;
    }

    this.io.write(value | 0);
  }

  /**
   * Turn an led on
   * @return {Led}
   */
  on() {
    this.#state.value = this.HIGH;
    this.write();
    return this;
  }

  /**
   * Turn an led off
   * @return {Led}
   */
  off() {
    this.#state.value = this.LOW;
    this.write();
    return this;
  }

  /**
   * Toggle the on/off state of an led
   * @return {Led}
   */
  toggle() {
    return this[this.isOn ? "off" : "on"]();
  }

  /**
   * Blink the LED on a fixed interval
   * @param {Number} duration=100 - Time in ms on, time in ms off
   * @param {Function} callback - Method to call on blink
   * @return {Led}
   */
  blink(duration=100, callback) {
    // Avoid traffic jams
    this.stop();

    if (typeof duration === "function") {
      callback = duration;
      duration = 100;
    }

    this.#state.isRunning = true;

    this.#state.interval = timer.setInterval(() => {
        this.toggle();
      if (typeof callback === "function") {
        callback();
      }
    }, duration);

    return this;
  }

  /**
   * Set the brightness of an led attached to PWM
   * @param {Integer} value - Brightness value [this.HIGH, this.LOW]
   * @return {Led}
   */
  brightness(value) {
    this.#state.value = value;
    this.io.write(value);
    return this;
  }

  /**
  * Animate the brightness of an led. THis method is not meant to be called externally
  * @param {Object} opts
  * @param {function} opts.step - A callback to be run each time the LED state changes
  * @param {function} opts.delta - A function that calculate each step's change
  * @param {function} opts.complete - A function to call on completion
  * @param {number} opts.duration=1000 - Duration of the animation in ms
  * @param {number} opts.delay=10 - Interval delay in ms
  * @return {Led}
  */
  animate(opts) {
    var start = Date.now();

    // Avoid traffic jams
    if (this.#state.interval) {
      timer.clearInterval(this.#state.interval);
    }

    if (!opts.duration) {
      opts.duration = 1000;
    }

    if (!opts.delta) {
      opts.delta = function(val) {
        return val;
      };
    }

    this.#state.isRunning = true;

    this.#state.interval = timer.setInterval(() => {
      const lapsed = Date.now() - start;
      let progress = lapsed / opts.duration;

      if (progress > 1) {
        progress = 1;
      }

      const delta = opts.delta(progress);

      opts.step(delta);

      if (progress === 1) {
        if (typeof opts.complete === "function") {
          opts.complete();
        }
      }
    }, opts.delay || 10);

   return this;
  }

  /**
   * Pulse the Led in and out in a loop with specified time
   * @param {number} [time=1000] Time in ms that a fade in/out will elapse
   * @param {function} [callback] A function to run each time the direction of pulse changes
   * @return {Led}
   */

  pulse(time=1000, callback) {
    
    const target = this.#state.value !== 0 ?
      (this.#state.value === this.HIGH ? 0 : this.HIGH) : this.HIGH;
    const direction = target === this.HIGH ? 1 : -1;
    const update = this.#state.value <= target ? target : (this.#state.value - target);

    if (typeof time === "function") {
      callback = time;
      time = 1000;
    }

    const step = (delta) => {
      let value = (update * delta);

      if (direction === -1) {
        value = value ^ this.HIGH;
      }

      this.#state.value = value;
      this.#state.direction = direction;
      this.write();
    };

    const complete = () => {
      this.pulse(time, callback);
      if (typeof callback === "function") {
        callback();
      }
    };

    return this.animate({
      duration: time,
      complete: complete,
      step: step
    });
  }  

  /**
   * fade Fade an led in and out
   * @param {Number} val Target brightness value
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fade(val, time=1000, callback) {
    const previous = this.#state.value || 0;
    const update = val - this.#state.value;

    if (typeof time === "function") {
      callback = time;
      time = 1000;
    }

    const step = (delta) => {
      const value = previous + (update * delta);
      this.#state.value = value;
      this.write();
    };

    const complete = () => {
      if (typeof callback === "function") {
        callback();
      }
    };
    return this.animate({
      duration: time,
      complete: complete,
      step: step
    });
  }

  /**
   * fade Fade an led in
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fadeIn(time=1000, callback) {
    return this.fade(this.HIGH, time, callback);
  }

  /**
   * fade Fade an led out
   * @param {Number} [time=1000] Time in ms that a fade will take
   * @param {function} [callback] A function to run when the fade is complete
   * @return {Led}
   */
  fadeOut(time=1000, callback) {
    return this.fade(this.LOW, time, callback);
  }

  /**
   * stop Stop the led from strobing, pulsing or fading
   * @return {Led}
   */
  stop() {
    
    if (this.#state.interval) {
      timer.clearInterval(this.#state.interval);
    }

    this.#state.interval = null;
    this.#state.isRunning = false;

    return this;
  };

};

export default Led;